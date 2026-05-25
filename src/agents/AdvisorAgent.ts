import { mockProducts } from '../constants/products'
import type {
  ShoppingAgent,
  AgentInfo,
  AgentMessage,
  AgentState,
  IntentResult,
} from './types'
import type { ChatResponse, Product, UserPreferences, ProductCardData } from '../types'
import { agentBus } from './AgentBus'

// ====== Advisor Agent ======
// Product knowledge specialist. Responsibilities:
// 1. Answer questions about specific products (material, price, suitability, shipping)
// 2. Search product catalog and recommend best matches
// 3. Provide personalized recommendations based on user profile
// 4. Handle clarifications and follow-ups

export class AdvisorAgent implements ShoppingAgent {
  readonly info: AgentInfo = {
    id: 'adv-001',
    type: 'advisor',
    name: '导购Agent',
    icon: '💡',
    state: 'idle',
    description: '商品问答、智能推荐、个性化建议',
  }

  private state: AgentState = 'idle'

  async handleMessage(msg: AgentMessage): Promise<Omit<AgentMessage, 'id' | 'timestamp'> | null> {
    this.state = 'busy'

    const { userText, intent, product, currentProduct, userPreferences, searchKeywords, targetCategory } = msg.payload
    const text = userText || ''

    let response: ChatResponse

    switch (msg.type) {
      case 'product_query':
        response = this.handleProductQuery(text, intent!, product, currentProduct, userPreferences)
        break
      case 'product_search':
        response = this.handleProductSearch(searchKeywords || [], targetCategory || null)
        break
      default:
        response = {
          text: '亲，有什么想了解的呢？',
          intent: 'clarify',
          quickReplies: ['帮我看当前商品', '搜索商品', '帮我推荐'],
        }
    }

    this.state = 'idle'

    // Send response back via bus
    await agentBus.dispatch({
      from: 'advisor',
      to: 'ui',
      type: 'agent_response',
      payload: { response, reasoning: `AdvisorAgent: ${intent?.type || 'query'}`, product: product || undefined },
      priority: 'normal',
    })

    return null
  }

  // ====== Product Query Handler ======

  private handleProductQuery(
    text: string,
    intent: IntentResult,
    product: Product | null | undefined,
    currentProduct: Product | null | undefined,
    prefs: UserPreferences | undefined
  ): ChatResponse {
    const prefsSafe = prefs || {}

    // Greeting
    if (intent.type === 'greeting') {
      return {
        text: `你好呀！我是你的AI购物Agent小快${prefsSafe.skinTone ? '，已记住你是' + prefsSafe.skinTone + '肤色' : ''}。当前主播展示的是"${currentProduct?.name || '好物'}"，有什么想了解的随时问我～`,
        intent: 'greeting',
        quickReplies: ['帮我看看这个', '帮我盯着直播间', '加入购物车'],
      }
    }

    const targetProduct = intent.type === 'specific_product' ? intent.matchedProduct : product || currentProduct

    if (!targetProduct) {
      return {
        text: '亲，主播当前还没有展示商品哦～等商品上架了我立刻帮您分析！',
        intent: 'clarify',
        quickReplies: ['帮我盯着直播间', '之前有什么商品？'],
      }
    }

    // Shipping (includes common speech recognition mishearings of 包邮 like 包有/包油)
    if (/包邮|包有|包油|运费|邮费|包.*吗|包不包/.test(text)) {
      return {
        text: `亲，"${targetProduct.name}"直播间下单享受包邮服务哦～放心购买！`,
        intent: 'answer_question',
        productCard: this.makeProductCard(targetProduct, '直播间下单包邮'),
        quickReplies: ['加入购物车', '还有其他优惠吗？', '看看当前商品'],
      }
    }

    // Material
    if (/材质|面料|成分|什么做的/.test(text)) {
      const material = targetProduct.attributes.material || '优质材料'
      return {
        text: `"${targetProduct.name}"采用${material}，${targetProduct.description.slice(0, 50)}。${targetProduct.hostComment}`,
        intent: 'answer_question',
        quickReplies: ['透气吗？', '适合什么身材？', '加入购物车'],
      }
    }

    // Price
    if (/价格|多少钱|便宜|优惠|划算/.test(text)) {
      const inBudget = prefsSafe.budgetRange && targetProduct.price <= prefsSafe.budgetRange[1] ? '在您的预算范围内，' : ''
      return {
        text: `原价¥${targetProduct.originalPrice}，直播间价只要¥${targetProduct.price}！${inBudget}已售${targetProduct.salesCount}件，性价比很高～`,
        intent: 'answer_question',
        productCard: this.makeProductCard(targetProduct, inBudget ? '符合您的预算' : '直播间热销'),
        quickReplies: ['质量怎么样？', '有运费险吗？', '加入购物车'],
      }
    }

    // Suitability
    if (/适合|合适|可以吗|怎么样/.test(text)) {
      const skinTone = prefsSafe.skinTone ? `根据您是${prefsSafe.skinTone}肤色，` : ''
      return {
        text: `${skinTone}"${targetProduct.name}"${targetProduct.description.slice(0, 60)}。评分${targetProduct.rating}分，已售${targetProduct.salesCount}件！`,
        intent: 'recommend_product',
        productCard: this.makeProductCard(targetProduct, prefsSafe.skinTone ? `适合${prefsSafe.skinTone}肤色` : '直播间热销商品'),
        quickReplies: ['帮我推荐颜色', '有我的尺码吗？', '加入购物车'],
      }
    }

    // Size
    if (/尺码|大小|码|穿多大/.test(text)) {
      const sizes = targetProduct.attributes.sizes
      const sizeInfo = sizes && Array.isArray(sizes) ? `有${sizes.join('、')}码可选` : '均码'
      return {
        text: `${sizeInfo}。${prefsSafe.sizes?.clothing ? `您之前穿${prefsSafe.sizes.clothing}码，` : ''}建议参考详情页尺码表选择～`,
        intent: 'answer_question',
        quickReplies: ['可以退换吗？', '加入购物车'],
      }
    }

    // Availability check: "有X吗" / "有没有X"
    if (/有.*吗|有没有/.test(text)) {
      return {
        text: `有的亲！"${targetProduct.name}"在直播间就有哦，现在下单¥${targetProduct.price}～${targetProduct.description.slice(0, 30)}。`,
        intent: 'recommend_product',
        productCard: this.makeProductCard(targetProduct, '直播间在售'),
        quickReplies: ['加入购物车', '包邮吗？', '适合我吗？'],
      }
    }

    // General info
    return {
      text: `关于"${targetProduct.name}"——${targetProduct.description.slice(0, 60)}。您想了解材质、价格，还是看看适不适合您？`,
      intent: 'clarify',
      productCard: this.makeProductCard(targetProduct, intent.type === 'specific_product' ? '您提到的商品' : '直播间当前主打商品'),
      quickReplies: ['材质是什么？', '包邮吗？', '适合我吗？'],
    }
  }

  // ====== Product Search ======

  private handleProductSearch(keywords: string[], category: string | null): ChatResponse {
    const matches = this.searchProducts(keywords, category)

    if (matches.length > 0) {
      const best = matches.sort((a, b) => b.rating - a.rating)[0]
      const otherCount = matches.length - 1
      const otherText = otherCount > 0 ? `，还有${otherCount}款类似商品后续会展示` : ''

      return {
        text: `有的亲！直播间有"${best.name}"，¥${best.price}${otherText}。${best.description.slice(0, 40)}。我帮您留意着，到了提醒您～`,
        intent: 'recommend_product',
        productCard: {
          productId: best.id,
          name: best.name,
          price: best.price,
          imageUrl: best.imageUrl,
          highlightReason: `匹配您搜索的${keywords.join('、')}`,
          tags: best.tags.slice(0, 3),
        },
        quickReplies: ['到了叫我', '还有其他类似的吗？', '加入购物车'],
      }
    }

    return {
      text: `抱歉亲，这个直播间目前没有${keywords.join('、')}类商品 😅 我已经帮您把问题发给主播了，主播看到后会回复～`,
      intent: 'clarify',
      quickReplies: ['帮我盯着上架', '换个类型看看', '看看当前商品'],
      needHostHelp: true,
    }
  }

  // ====== Helpers ======

  // Public for testability — searches full product catalog
  searchProducts(keywords: string[], category: string | null): Product[] {
    return mockProducts.filter((p) => {
      if (category && p.category !== category) return false
      const searchText = `${p.name} ${p.description} ${p.tags.join(' ')} ${p.category}`.toLowerCase()
      return keywords.some((kw) => {
        const lowerKw = kw.toLowerCase()
        if (searchText.includes(lowerKw)) return true
        if (category && /[一-鿿]/.test(lowerKw) && lowerKw.length >= 2) {
          return lowerKw.split('').filter((c) => /[一-鿿]/.test(c)).some((char) => searchText.includes(char))
        }
        return false
      })
    })
  }

  private makeProductCard(product: Product, highlightReason: string): ProductCardData {
    return {
      productId: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      highlightReason,
      tags: product.tags.slice(0, 3),
    }
  }

  getState(): AgentState {
    return this.state
  }

  reset(): void {
    this.state = 'idle'
  }
}

export const advisorAgent = new AdvisorAgent()
