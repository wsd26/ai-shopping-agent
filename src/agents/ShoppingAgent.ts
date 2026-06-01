import { mockProducts } from '../constants/products'
import type { Product, UserPreferences, ProductCardData } from '../types'
import { activityClock } from './activityClock'

// Unified conversation agent — handles intent analysis, response generation,
// and action extraction in a single synchronous pipeline.
//
// Takes ShoppingInput → returns ShoppingOutput. No AgentBus, no serialization,
// no multi-hop routing. Pure function: same input → same output.

export interface ShoppingInput {
  userText: string
  currentProduct: Product | null
  userPreferences: UserPreferences
  recentMessages: { role: 'user' | 'assistant'; content: string; timestamp: number }[]
}

export interface ShoppingOutput {
  text: string
  intent: string
  productCard?: ProductCardData
  quickReplies?: string[]
  action?: ShoppingAction
  needHostHelp?: boolean
}

export type ShoppingAction =
  | { type: 'add_to_cart'; productId: string }
  | { type: 'escalate_to_host'; question: string }
  | { type: 'toggle_monitor'; enable: boolean }

export class ShoppingAgent {

  // Regex-based process (V1, local fallback)
  process(input: ShoppingInput): ShoppingOutput {
    activityClock.touch()

    const { userText, currentProduct, userPreferences } = input
    const prefs = userPreferences || {}

    // Step 1: Classify intent (raw classification)
    const classification = this.classifyIntent(userText)

    // Step 2: Generate response based on classification
    const response = this.generateResponse(classification, userText, currentProduct, input, prefs)

    // Normalize classification intent → canonical intent
    const canonicalIntent = this.normalizeIntent(classification)

    return { ...response, intent: canonicalIntent }
  }

  // Map internal classification intents to canonical intent names
  private normalizeIntent(raw: string): string {
    if (raw === 'specific_product_found') return 'specific_product'
    if (raw === 'product_search_not_found') return 'product_search'
    return raw
  }

  // ===== Intent Classification =====

  private classifyIntent(text: string): string {
    // Greeting
    if (/你好|hi|hello|在吗|嗨|哈喽|在不在|主播好|大家好|晚上好|上午好/.test(text)) {
      return 'greeting'
    }

    // Commands — check before product mentions
    if (/加入购物车|加到购物车|加购物车|加购|买|下单|就要|帮我找|帮我盯着|帮我看一下|监控|蹲/.test(text)) {
      return 'command'
    }

    // Named product mention
    const namedProduct = this.detectProductMention(text)
    if (namedProduct) {
      return 'specific_product'
    }

    // Current product reference
    if (/这个|这款|这个商品|当前|现在这个|它/.test(text)) {
      return 'current_product'
    }

    // "有X吗" existence check
    const existenceMatch = text.match(/有(?:没有)?(.{1,8})[吗呢？?]?$|有没有(.{1,8})/)
    if (existenceMatch) {
      const rawTerm = (existenceMatch[1] || existenceMatch[2] || '').trim()
      const searchTerm = rawTerm.replace(/[吗呢？?]+$/g, '').trim()
      if (searchTerm && /[一-鿿]/.test(searchTerm)) {
        const found = this.searchProductByKeyword(searchTerm)
        if (found) return 'specific_product_found'
        for (const [pattern, category] of this.getSearchPatterns()) {
          if (pattern.test(searchTerm) && category) {
            const best = this.findBestProductForCategory(category)
            if (best) return 'specific_product_found'
            return 'product_search_not_found'
          }
        }
        return 'product_search_not_found'
      }
    }

    // Category search
    const hasQuestion = this.hasQuestionIndicator(text)
    for (const [pattern, category] of this.getSearchPatterns()) {
      const match = text.match(pattern)
      if (match) {
        if (hasQuestion && category) {
          const best = this.findBestProductForCategory(category)
          if (best) return 'specific_product_found'
        }
        return 'product_search'
      }
    }

    return 'general'
  }

  // ===== Response Generation =====

  private generateResponse(
    intent: string,
    text: string,
    currentProduct: Product | null,
    input: ShoppingInput,
    prefs: UserPreferences
  ): ShoppingOutput {
    // Pick target product
    let targetProduct: Product | null = null
    if (intent === 'specific_product' || intent === 'specific_product_found') {
      targetProduct = this.detectProductMention(text) || this.searchBestForText(text)
    }
    if (!targetProduct) targetProduct = currentProduct

    switch (intent) {
      case 'greeting':
        return this.handleGreeting(currentProduct, prefs)

      case 'command':
        return this.handleCommand(text, currentProduct, prefs, input.recentMessages)

      case 'specific_product_found':
        return this.handleProductQuery(text, targetProduct, currentProduct!, prefs, true)

      case 'specific_product':
      case 'current_product':
        return this.handleProductQuery(text, targetProduct, currentProduct!, prefs, false)

      case 'product_search':
        return this.handleProductSearch(text, currentProduct, prefs)

      case 'product_search_not_found':
        return this.handleNotFound(text, currentProduct)

      case 'general':
      default:
        return this.handleGeneral(targetProduct, currentProduct, prefs)
    }
  }

  // ===== Intent Handlers =====

  private handleGreeting(currentProduct: Product | null, prefs: UserPreferences): ShoppingOutput {
    const skinToneHint = prefs.skinTone ? `，已记住你是${prefs.skinTone}肤色` : ''
    const productName = currentProduct?.name || '好物'
    return {
      text: `你好呀！我是你的AI导购小快${skinToneHint}。当前直播间展示的是"${productName}"，有什么想了解的随时问我～`,
      intent: 'greeting',
      quickReplies: ['帮我看看这个', '帮我盯着直播间', '加入购物车'],
    }
  }

  private handleCommand(
    text: string,
    currentProduct: Product | null,
    prefs: UserPreferences,
    _recentMessages: { role: 'user' | 'assistant'; content: string; timestamp: number }[]
  ): ShoppingOutput {
    // "帮我找" / "帮我盯着"
    if (/帮我找|找最好的|帮我挑/.test(text)) {
      const prefParts: string[] = []
      if (prefs.skinTone) prefParts.push(`${prefs.skinTone}肤色`)
      if (prefs.preferredCategories?.length) prefParts.push(`偏好${prefs.preferredCategories.join('、')}`)
      const prefText = prefParts.length > 0 ? `根据您的${prefParts.join('、')}，` : ''
      return {
        text: `好的亲！我会帮您持续关注直播间的商品，${prefText}自动筛选最合适的。有好物立刻通知您！`,
        intent: 'greeting',
        quickReplies: ['现在有什么商品？', '停止自动推荐'],
      }
    }

    if (/帮我盯着|蹲|监控/.test(text)) {
      return {
        text: '收到！已开启"直播监控模式"，我会持续观察每个新上商品。一旦发现匹配您画像的好物，第一时间弹窗提醒您～',
        intent: 'greeting',
        quickReplies: ['目前在监控什么？', '停止监控'],
        action: { type: 'toggle_monitor', enable: true },
      }
    }

    // Add to cart
    if (/加入购物车|加到购物车|加购物车|加购|买|下单|就要/.test(text)) {
      if (!currentProduct) {
        return {
          text: '亲，当前没有在展示商品哦～我会帮您盯着，有合适的立马提醒！',
          intent: 'clarify',
        }
      }
      return {
        text: `好嘞！已帮您把"${currentProduct.name}"加入购物车，直播价¥${currentProduct.price}，比原价省了¥${currentProduct.originalPrice - currentProduct.price}！`,
        intent: 'add_to_cart',
        productCard: this.makeProductCard(currentProduct, '您主动要求加购'),
        quickReplies: ['去购物车看看', '继续逛', '还有什么推荐？'],
        action: { type: 'add_to_cart', productId: currentProduct.id },
      }
    }

    return {
      text: '亲，您想要做什么呢？可以说"帮我找XX"、"加入购物车"或直接问我问题～',
      intent: 'clarify',
      quickReplies: ['帮我盯着直播间', '现在有什么商品？'],
    }
  }

  private handleProductQuery(
    text: string,
    targetProduct: Product | null,
    currentProduct: Product | null,
    prefs: UserPreferences,
    _fromSearch: boolean
  ): ShoppingOutput {
    const product = targetProduct || currentProduct

    if (!product) {
      return {
        text: '亲，主播当前还没有展示商品哦～等商品上架了我立刻帮您分析！',
        intent: 'clarify',
        quickReplies: ['帮我盯着直播间', '之前有什么商品？'],
      }
    }

    // Shipping
    if (/包邮|包有|包油|运费|邮费|包.*吗|包不包/.test(text)) {
      return {
        text: `亲，"${product.name}"直播间下单享受包邮服务哦～放心购买！`,
        intent: 'answer_question',
        productCard: this.makeProductCard(product, '直播间下单包邮'),
        quickReplies: ['加入购物车', '还有其他优惠吗？', '看看当前商品'],
      }
    }

    // Material
    if (/材质|面料|成分|什么做的/.test(text)) {
      const material = product.attributes.material || '优质材料'
      return {
        text: `"${product.name}"采用${material}，${product.description.slice(0, 50)}。${product.hostComment}`,
        intent: 'answer_question',
        quickReplies: ['透气吗？', '适合什么身材？', '加入购物车'],
      }
    }

    // Price
    if (/价格|多少钱|便宜|优惠|划算/.test(text)) {
      const inBudget = prefs.budgetRange && product.price <= prefs.budgetRange[1]
        ? '在您的预算范围内，'
        : ''
      return {
        text: `原价¥${product.originalPrice}，直播间价只要¥${product.price}！${inBudget}已售${product.salesCount}件，性价比很高～`,
        intent: 'answer_question',
        productCard: this.makeProductCard(product, inBudget ? '符合您的预算' : '直播间热销'),
        quickReplies: ['质量怎么样？', '有运费险吗？', '加入购物车'],
      }
    }

    // Suitability
    if (/适合|合适|可以吗|怎么样/.test(text)) {
      const skinTone = prefs.skinTone ? `根据您是${prefs.skinTone}肤色，` : ''
      return {
        text: `${skinTone}"${product.name}"${product.description.slice(0, 60)}。评分${product.rating}分，已售${product.salesCount}件！`,
        intent: 'recommend_product',
        productCard: this.makeProductCard(product, prefs.skinTone ? `适合${prefs.skinTone}肤色` : '直播间热销商品'),
        quickReplies: ['帮我推荐颜色', '有我的尺码吗？', '加入购物车'],
      }
    }

    // Size
    if (/尺码|大小|码|穿多大/.test(text)) {
      const sizes = product.attributes.sizes
      const sizeInfo = sizes && Array.isArray(sizes) ? `有${sizes.join('、')}码可选` : '均码'
      return {
        text: `${sizeInfo}。${prefs.sizes?.clothing ? `您之前穿${prefs.sizes.clothing}码，` : ''}建议参考详情页尺码表选择～`,
        intent: 'answer_question',
        quickReplies: ['可以退换吗？', '加入购物车'],
      }
    }

    // Availability: "有X吗"
    if (/有.*吗|有没有/.test(text)) {
      return {
        text: `有的亲！"${product.name}"在直播间就有哦，现在下单¥${product.price}～${product.description.slice(0, 30)}。`,
        intent: 'recommend_product',
        productCard: this.makeProductCard(product, '直播间在售'),
        quickReplies: ['加入购物车', '包邮吗？', '适合我吗？'],
      }
    }

    // General info fallback
    return {
      text: `关于"${product.name}"——${product.description.slice(0, 60)}。您想了解材质、价格，还是看看适不适合您？`,
      intent: 'clarify',
      productCard: this.makeProductCard(product, '直播间当前主打商品'),
      quickReplies: ['材质是什么？', '包邮吗？', '适合我吗？'],
    }
  }

  private handleProductSearch(
    _text: string,
    _currentProduct: Product | null,
    _prefs: UserPreferences
  ): ShoppingOutput {
    // Extract search keywords from text via patterns
    const searchKeywords = this.extractSearchKeywords(_text)
    const category = this.extractSearchCategory(_text)

    const matches = this.searchProducts(searchKeywords, category)
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
          highlightReason: `匹配您搜索的${searchKeywords.join('、')}`,
          tags: best.tags.slice(0, 3),
        },
        quickReplies: ['到了叫我', '还有其他类似的吗？', '加入购物车'],
      }
    }

    return {
      text: `抱歉亲，这个直播间目前没有${searchKeywords.join('、')}类商品。我已经帮您把问题发给主播了，主播看到后会回复～`,
      intent: 'clarify',
      quickReplies: ['帮我盯着上架', '换个类型看看', '看看当前商品'],
      needHostHelp: true,
      action: { type: 'escalate_to_host', question: searchKeywords.join(' ') },
    }
  }

  private handleNotFound(text: string, _currentProduct: Product | null): ShoppingOutput {
    const searchTerm = text.replace(/[吗呢？?]+$/g, '').replace(/^有(?:没有)?/, '').trim()
    return {
      text: `抱歉亲，直播间暂时没有${searchTerm || '这类'}商品～这个问题我帮您转告主播！`,
      intent: 'clarify',
      quickReplies: ['帮我盯着上架', '看看当前商品', '换个类型看看'],
      needHostHelp: true,
      action: { type: 'escalate_to_host', question: text },
    }
  }

  private handleGeneral(
    targetProduct: Product | null,
    currentProduct: Product | null,
    _prefs: UserPreferences
  ): ShoppingOutput {
    const product = targetProduct || currentProduct
    if (product) {
      return {
        text: `关于"${product.name}"——${product.description.slice(0, 60)}。您想了解材质、价格，还是看看适不适合您？`,
        intent: 'clarify',
        productCard: this.makeProductCard(product, '直播间当前主打商品'),
        quickReplies: ['材质是什么？', '包邮吗？', '适合我吗？'],
      }
    }
    return {
      text: '亲，有什么想了解的呢？可以说说您想找什么类型的商品～',
      intent: 'clarify',
      quickReplies: ['帮我看当前商品', '搜索商品', '帮我推荐'],
    }
  }

  // ===== Product Search =====

  private searchProductByKeyword(keyword: string): Product | null {
    const lower = keyword.toLowerCase()
    for (const product of mockProducts) {
      if (
        product.name.toLowerCase().includes(lower) ||
        product.category.toLowerCase().includes(lower) ||
        product.tags.some((t) => t.toLowerCase().includes(lower))
      ) {
        return product
      }
    }
    return null
  }

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

  private findBestProductForCategory(category: string): Product | null {
    const matches = mockProducts.filter((p) => p.category === category)
    if (matches.length === 0) return null
    return matches.sort((a, b) => b.rating - a.rating)[0]
  }

  private searchBestForText(text: string): Product | null {
    for (const [pattern, category] of this.getSearchPatterns()) {
      if (pattern.test(text) && category) {
        const best = this.findBestProductForCategory(category)
        if (best) return best
      }
    }
    return null
  }

  private extractSearchKeywords(text: string): string[] {
    for (const [pattern, , label] of this.getSearchPatterns()) {
      if (pattern.test(text)) {
        return [label, ...text.match(pattern)?.filter((w) => w !== label) || []]
      }
    }
    return [text]
  }

  private extractSearchCategory(text: string): string | null {
    for (const [pattern, category] of this.getSearchPatterns()) {
      if (pattern.test(text) && category) return category
    }
    return null
  }

  // ===== Intent Helpers =====

  private hasQuestionIndicator(text: string): boolean {
    return /[?？吗呢]|包邮|包有|包油|运费|邮费|材质|面料|成分|什么|怎么|如何|多少|价格|便宜|优惠|划算|适合|合适|尺码|大小|码|颜色|可以|能不能|有没有|有.*吗/.test(text)
  }

  private getSearchPatterns(): [RegExp, string, string][] {
    return [
      [/男装|男款|男士|男生/, 'clothing', '男装'],
      [/女装|女款|女士|女生|裙子|连衣裙|T恤|上衣|裤子|外套/, 'clothing', '女装'],
      [/面膜|精华|护肤|面霜|化妆水|爽肤水|卸妆|防晒/, 'skincare', '美妆护肤'],
      [/鞋子|运动鞋|跑鞋|休闲鞋/, 'clothing', '鞋类'],
      [/包包|手提包|斜挎包|单肩包|双肩包|配饰|手表/, 'accessories', '配饰包包'],
      [/耳机|数码|电子产品|手机|平板/, 'electronics', '数码产品'],
      [/吃的|零食|食品|枣|坚果/, 'food', '食品'],
      [/便宜的|平价|学生党|实惠/, '', '高性价比'],
      [/贵的|高端|大牌|奢侈/, '', '高端商品'],
    ]
  }

  private detectProductMention(text: string): Product | null {
    const keywords = new Set<string>()
    for (let i = 0; i <= text.length - 2; i++) {
      for (let len = 2; len <= 6 && i + len <= text.length; len++) {
        const sub = text.slice(i, i + len)
        if (/^[一-鿿]{2,6}$/.test(sub)) {
          keywords.add(sub)
        }
      }
    }
    if (keywords.size === 0) return null

    const sortedKeywords = [...keywords].sort((a, b) => b.length - a.length)
    let bestMatch: Product | null = null
    let bestLen = 0

    for (const product of mockProducts) {
      const productName = product.name.toLowerCase()
      for (const kw of sortedKeywords) {
        if (productName.includes(kw) && kw.length > bestLen) {
          bestMatch = product
          bestLen = kw.length
          break
        }
      }
    }
    return bestMatch
  }

  // ===== LLM-powered process (V2, calls /api/chat) =====

  async processLLM(input: ShoppingInput): Promise<ShoppingOutput> {
    activityClock.touch()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...input.recentMessages.slice(-6),
            { role: 'user', content: input.userText, timestamp: Date.now() },
          ],
          currentProduct: input.currentProduct,
          userPreferences: input.userPreferences,
          conversationId: '',
        }),
      })

      const data = await response.json()

      // If API returns fallback flag, use regex
      if (data._fallback) {
        return this.process(input)
      }

      // Map LLM response → ShoppingOutput
      let action: ShoppingOutput['action']

      // LLM returned a valid add_to_cart action
      if (data.action?.type === 'add_to_cart' && data.action.productId) {
        action = { type: 'add_to_cart', productId: data.action.productId }
      }
      // Safety net: user said "加购" + currentProduct exists, but LLM missed the action
      else if (
        /加入购物车|加到购物车|加购物车|加购|帮我加/.test(input.userText) &&
        input.currentProduct
      ) {
        action = { type: 'add_to_cart', productId: input.currentProduct.id }
      }

      // Safety net: fix productCard price from actual product data
      let productCard = data.productCard
      if (productCard?.productId) {
        const actualProduct = mockProducts.find((p) => p.id === productCard!.productId)
        if (actualProduct && productCard!.price !== actualProduct.price) {
          productCard = { ...productCard!, price: actualProduct.price }
        }
      }

      // Safety net: gift recommendation mapping.
      // Only triggers for generic "what to buy for X" queries.
      // Does NOT trigger when user mentions a specific product (e.g. "精华液适合送女友吗")
      const giftText = input.userText
      const mentionsProduct = mockProducts.some(
        (p) => giftText.includes(p.name.slice(0, 3)) || p.tags.some((t) => giftText.includes(t))
      )
      if (/送|礼物|买给/.test(giftText) && !mentionsProduct && !productCard) {
        const giftMap: [RegExp, string, string][] = [
          [/妈妈|母亲|长辈|婆婆|爸妈/, 'p004', '实用贴心，妈妈平时舍不得买'],
          [/女朋友|女友|老婆|对象|女神/, 'p001', '精致浪漫，女生收到超开心'],
          [/男朋友|男友|老公|男生|男票/, 'p008', '数码装备，男生一定喜欢'],
          [/闺蜜|姐妹|朋友|死党/, 'p002', '实用好看，送礼不出错'],
        ]
        for (const [pattern, productId, reason] of giftMap) {
          if (pattern.test(giftText)) {
            const product = mockProducts.find((p) => p.id === productId)
            if (product) {
              productCard = this.makeProductCard(product, reason)
            }
            break
          }
        }
      }

      return {
        text: data.text || '亲，有什么想了解的呢？',
        intent: data.intent || 'clarify',
        productCard,
        quickReplies: data.quickReplies || ['再看看', '帮我推荐', '加入购物车'],
        action,
        needHostHelp: data.text?.includes('转告主播') || data.text?.includes('记下了'),
      }
    } catch {
      // Network error → fallback to regex
      return this.process(input)
    }
  }

  // ===== Helpers =====

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
}

export const shoppingAgent = new ShoppingAgent()
