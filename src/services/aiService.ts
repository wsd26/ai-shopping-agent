import type { ChatRequest, ChatResponse, Product, UserPreferences } from '../types'
import { mockProducts } from '../constants/products'

// ====== Agent: Proactive Product Analysis ======

export interface AgentAnalysis {
  shouldNotify: boolean
  matchScore: number
  reasoning: string
  recommendation?: ChatResponse
}

export function analyzeProductForUser(
  product: Product,
  preferences: UserPreferences
): AgentAnalysis {
  let score = 50
  const reasons: string[] = []

  if (preferences.budgetRange) {
    const [min, max] = preferences.budgetRange
    if (product.price >= min && product.price <= max) {
      score += 15; reasons.push('在您的预算范围内')
    } else if (product.price < min) {
      score += 5; reasons.push('低于预算，超值选择')
    } else if (product.price <= max * 1.3) {
      score += 5; reasons.push('略超预算但性价比高')
    }
  }

  if (preferences.preferredCategories?.length) {
    const categoryMap: Record<string, string[]> = {
      '服装': ['clothing'], '美妆护肤': ['skincare'], '配饰': ['accessories'],
      '美食': ['food'], '数码': ['electronics'],
    }
    const preferredCats = preferences.preferredCategories.flatMap((c) => categoryMap[c] || [])
    if (preferredCats.includes(product.category)) {
      score += 20; reasons.push('是您感兴趣的品类')
    }
  }

  if (preferences.skinTone && (product.category === 'clothing' || product.category === 'skincare')) {
    reasons.push('很适合您的肤色')
    score += 10
  }

  if (product.rating >= 4.7) { score += 8; reasons.push('好评率很高') }
  if (product.salesCount > 5000) { score += 7; reasons.push('销量火爆') }
  if (product.originalPrice > 0 && product.price / product.originalPrice <= 0.5) {
    score += 10; reasons.push(`打${Math.round((product.price / product.originalPrice) * 10)}折`)
  }

  const shouldNotify = score >= 65
  const recommendation: ChatResponse | undefined = shouldNotify
    ? {
        text: `👀 亲！刚上了一个很适合您的商品——"${product.name}"，${reasons.slice(0, 2).join('，')}。`,
        intent: 'recommend_product',
        productCard: {
          productId: product.id, name: product.name, price: product.price,
          imageUrl: product.imageUrl, highlightReason: reasons.join('；'), tags: product.tags.slice(0, 3),
        },
        quickReplies: ['帮我看看详情', '加入购物车', '跳过'],
      }
    : undefined

  return { shouldNotify, matchScore: score, reasoning: reasons.join('；'), recommendation }
}

// ====== Keyword → Category mapping ======

interface IntentMatch {
  type: 'product_search' | 'current_product' | 'specific_product' | 'general' | 'command'
  searchKeywords: string[]
  targetCategory: string | null
  matchedProduct?: Product
}

function analyzeIntent(userText: string): IntentMatch {
  const text = userText.toLowerCase()

  // Is user referring to the current product?
  const refersToCurrent = /这个|这款|这个商品|当前|现在这个|它/.test(text)

  // First: check if user mentions a specific product by name
  // e.g., "和田大枣包邮吗？" → find the jujube product
  const namedProduct = detectProductMention(text)
  if (namedProduct) {
    return {
      type: 'specific_product',
      searchKeywords: [],
      targetCategory: null,
      matchedProduct: namedProduct,
    }
  }

  // Product search patterns
  const searchPatterns: [RegExp, string, string][] = [
    [/男装|男款|男士|男生/, 'clothing', '男装'],
    [/女装|女款|女士|女生|裙子|连衣裙|T恤|上衣|裤子|外套/, 'clothing', '女装'],
    [/面膜|精华|护肤|面霜|化妆水|爽肤水|卸妆|防晒/, 'skincare', '美妆护肤'],
    [/鞋子|运动鞋|跑鞋|休闲鞋/, 'clothing', '鞋类'],
    [/包包|手提包|斜挎包|单肩包|双肩包/, 'accessories', '配饰包包'],
    [/耳机|数码|电子产品|手机|平板/, 'electronics', '数码产品'],
    [/吃的|零食|食品|枣|坚果/, 'food', '食品'],
    [/便宜的|平价|学生党|实惠/, '', '高性价比'],
    [/贵的|高端|大牌|奢侈/, '', '高端商品'],
  ]

  for (const [pattern, category, label] of searchPatterns) {
    const match = text.match(pattern)
    if (match) {
      // Include both the user's actual word and the category label for broader matching
      const matchedWord = match[0]
      const keywords = matchedWord !== label ? [matchedWord, label] : [label]
      return {
        type: 'product_search',
        searchKeywords: keywords,
        targetCategory: category || null,
      }
    }
  }

  // Current product questions
  if (refersToCurrent) {
    return { type: 'current_product', searchKeywords: [], targetCategory: null }
  }

  // Commands
  if (/加购物车|买|下单|就要|帮我找|帮我盯着|监控|蹲/.test(text)) {
    return { type: 'command', searchKeywords: [], targetCategory: null }
  }

  // General questions
  return { type: 'general', searchKeywords: [], targetCategory: null }
}

// Detect if user mentions a specific product by name
// Uses keyword extraction: extracts 2-6 char Chinese substrings from user text
// and checks if any product name contains them.
// e.g., user "和田大枣包邮吗？" → keyword "和田大枣" → matches "新疆和田大枣 500g×2袋"
function detectProductMention(text: string): Product | null {
  // Collect all consecutive Chinese char sequences of length 2-6
  const keywords = new Set<string>()
  for (let i = 0; i <= text.length - 2; i++) {
    for (let len = 2; len <= 6 && i + len <= text.length; len++) {
      const sub = text.slice(i, i + len)
      // Only pure Chinese character sequences (no punctuation, letters, digits)
      if (/^[一-鿿]{2,6}$/.test(sub)) {
        keywords.add(sub)
      }
    }
  }

  if (keywords.size === 0) return null

  // Sort by length descending so longer (more specific) matches win
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

// Search full product catalog for matching products
function searchProducts(keywords: string[], category: string | null, excludeProductId?: string): Product[] {
  return mockProducts.filter((p) => {
    if (p.id === excludeProductId) return false
    if (category && p.category !== category) return false
    const searchText = `${p.name} ${p.description} ${p.tags.join(' ')} ${p.category}`.toLowerCase()

    return keywords.some((kw) => {
      const lowerKw = kw.toLowerCase()
      if (searchText.includes(lowerKw)) return true
      // For Chinese keywords (2+ chars) within a category-filtered search,
      // also try partial character matching. e.g., "裙子" → "裙" matches "连衣裙"
      if (category && /[一-鿿]/.test(lowerKw) && lowerKw.length >= 2) {
        const chars = lowerKw.split('').filter((c) => /[一-鿿]/.test(c))
        return chars.some((char) => searchText.includes(char))
      }
      return false
    })
  })
}

// ====== Main Response Generator ======

export async function sendChatMessageLocal(request: ChatRequest): Promise<ChatResponse> {
  const lastMsg = request.messages[request.messages.length - 1]
  if (!lastMsg || lastMsg.role !== 'user') {
    return {
      text: '你好！我是你的AI购物助手小快，有什么可以帮你的吗？',
      intent: 'greeting',
      quickReplies: ['帮我盯着直播间', '现在有什么商品？', '怎么使用？'],
    }
  }
  return generateLocalResponse(lastMsg.content, request)
}

function generateLocalResponse(userText: string, request: ChatRequest): ChatResponse {
  const currentProduct = request.currentProduct
  const prefs = request.userPreferences
  const text = userText.toLowerCase()
  const intent = analyzeIntent(userText)

  // ---- GREETING ----
  if (text.includes('你好') || text.includes('hi') || text.includes('hello') || text.includes('在吗')) {
    return {
      text: `你好呀！我是你的AI购物Agent小快${prefs.skinTone ? '，已记住你是' + prefs.skinTone + '肤色' : ''}。当前主播展示的是"${currentProduct?.name || '好物'}"，有什么想了解的随时问我～`,
      intent: 'greeting',
      quickReplies: ['帮我看看这个', '帮我盯着直播间', '加入购物车'],
    }
  }

  // ---- COMMANDS ----
  if (intent.type === 'command') {
    return handleCommand(text, currentProduct, prefs)
  }

  // ---- SPECIFIC PRODUCT QUESTION (e.g., "和田大枣包邮吗？") ----
  if (intent.type === 'specific_product' && intent.matchedProduct) {
    return handleSpecificProductQuestion(text, intent.matchedProduct, prefs)
  }

  // ---- PRODUCT SEARCH (e.g., "有没有男装?") ----
  if (intent.type === 'product_search') {
    return handleProductSearch(intent)
  }

  // ---- CURRENT PRODUCT QUESTIONS ----
  if (intent.type === 'current_product' || text.includes('材质') || text.includes('面料') || text.includes('成分') ||
      text.includes('价格') || text.includes('多少钱') || text.includes('尺码') || text.includes('大小') ||
      text.includes('码') || text.includes('适合') || text.includes('合适') || text.includes('推荐') ||
      text.includes('有什么') || text.includes('介绍')) {
    return handleCurrentProductQuestion(text, currentProduct, prefs)
  }

  // ---- GENERAL / UNCLEAR ----
  return {
    text: currentProduct
      ? `亲，当前展示的是"${currentProduct.name}"。您是想了解这个商品，还是想找其他类型的商品呢？`
      : '亲，有什么事想问小快的吗？',
    intent: 'clarify',
    quickReplies: currentProduct
      ? ['这个材质是什么？', '这个适合我吗？', '有没有其他商品？']
      : ['现在有什么商品？', '帮我推荐好物', '怎么使用？'],
    needHostHelp: true,
  }
}

// ====== Handle Product Search ======

function handleProductSearch(intent: IntentMatch): ChatResponse {
  // Search full catalog
  const matches = searchProducts(intent.searchKeywords, intent.targetCategory)

  // Exclude current product from search if it doesn't match the query
  const relevantMatches = matches.filter((p) => {
    if (intent.targetCategory && p.category !== intent.targetCategory) return false
    return true
  })

  if (relevantMatches.length > 0) {
    const best = relevantMatches.sort((a, b) => b.rating - a.rating)[0]
    const otherCount = relevantMatches.length - 1
    const otherText = otherCount > 0 ? `，还有${otherCount}款类似商品后续会展示` : ''

    return {
      text: `有的亲！直播间有"${best.name}"，¥${best.price}${otherText}。${best.description.slice(0, 40)}。我帮您留意着，到了提醒您～`,
      intent: 'recommend_product',
      productCard: {
        productId: best.id, name: best.name, price: best.price,
        imageUrl: best.imageUrl,
        highlightReason: `匹配您搜索的${intent.searchKeywords.join('、')}`,
        tags: best.tags.slice(0, 3),
      },
      quickReplies: ['到了叫我', '还有其他类似的吗？', '加入购物车'],
    }
  }

  // No matching product found → push to live stream
  return {
    text: `抱歉亲，这个直播间目前没有${intent.searchKeywords.join('、')}类商品 😅 我已经帮您把问题发给主播了，主播看到后会回复～`,
    intent: 'clarify',
    quickReplies: ['帮我盯着上架', '换个类型看看', '看看当前商品'],
    needHostHelp: true,
  }
}

// ====== Handle Current Product Questions ======

function handleCurrentProductQuestion(
  text: string,
  product: Product | null,
  prefs: UserPreferences
): ChatResponse {
  if (!product) {
    return {
      text: '亲，主播当前还没有展示商品哦～等商品上架了我立刻帮您分析！',
      intent: 'clarify',
      quickReplies: ['帮我盯着直播间', '之前有什么商品？'],
    }
  }

  // Material
  if (text.includes('材质') || text.includes('面料') || text.includes('成分') || text.includes('什么做的')) {
    const material = product.attributes.material || '优质材料'
    return {
      text: `"${product.name}"采用${material}，${product.description.slice(0, 50)}。${product.hostComment}`,
      intent: 'answer_question',
      quickReplies: ['透气吗？', '适合什么身材？', '加入购物车'],
    }
  }

  // Price
  if (text.includes('价格') || text.includes('多少钱') || text.includes('便宜') || text.includes('优惠')) {
    const inBudget = prefs.budgetRange && product.price <= prefs.budgetRange[1] ? '在您的预算范围内，' : ''
    return {
      text: `原价¥${product.originalPrice}，直播间价只要¥${product.price}！${inBudget}已售${product.salesCount}件，性价比很高～`,
      intent: 'answer_question',
      quickReplies: ['质量怎么样？', '有运费险吗？', '加入购物车'],
    }
  }

  // Suitability
  if (text.includes('适合') || text.includes('合适') || text.includes('可以吗') || text.includes('怎么样')) {
    const skinTone = prefs.skinTone ? `根据您是${prefs.skinTone}肤色，` : ''
    return {
      text: `${skinTone}"${product.name}"${product.description.slice(0, 60)}。评分${product.rating}分，已售${product.salesCount}件！`,
      intent: 'recommend_product',
      productCard: {
        productId: product.id, name: product.name, price: product.price,
        imageUrl: product.imageUrl,
        highlightReason: prefs.skinTone ? `适合${prefs.skinTone}肤色` : '直播间热销商品',
        tags: product.tags.slice(0, 3),
      },
      quickReplies: ['帮我推荐颜色', '有我的尺码吗？', '加入购物车'],
    }
  }

  // Size
  if (text.includes('尺码') || text.includes('大小') || text.includes('码') || text.includes('穿多大')) {
    const sizes = product.attributes.sizes
    const sizeInfo = sizes && Array.isArray(sizes) ? `有${sizes.join('、')}码可选` : '均码'
    return {
      text: `${sizeInfo}。${prefs.sizes?.clothing ? `您之前穿${prefs.sizes.clothing}码，` : ''}建议参考详情页尺码表选择～`,
      intent: 'answer_question',
      quickReplies: ['可以退换吗？', '加入购物车'],
    }
  }

  // General recommendation
  return {
    text: `关于"${product.name}"——${product.description.slice(0, 60)}。您想了解材质、价格，还是看看适不适合您？`,
    intent: 'clarify',
    productCard: {
      productId: product.id, name: product.name, price: product.price,
      imageUrl: product.imageUrl,
      highlightReason: '直播间当前主打商品',
      tags: product.tags.slice(0, 3),
    },
    quickReplies: ['材质是什么？', '适合我吗？', '有优惠吗？'],
  }
}

// ====== Handle Specific Product Question (user named a product) ======

function handleSpecificProductQuestion(
  text: string,
  product: Product,
  prefs: UserPreferences
): ChatResponse {
  // Shipping / 包邮
  if (text.includes('包邮') || text.includes('运费') || text.includes('邮费')) {
    return {
      text: `亲，"${product.name}"直播间下单享受包邮服务哦～放心购买！`,
      intent: 'answer_question',
      productCard: {
        productId: product.id, name: product.name, price: product.price,
        imageUrl: product.imageUrl,
        highlightReason: '直播间下单包邮',
        tags: product.tags.slice(0, 3),
      },
      quickReplies: ['加入购物车', '还有其他优惠吗？', '看看当前商品'],
    }
  }

  // Material
  if (text.includes('材质') || text.includes('面料') || text.includes('成分') || text.includes('什么做的')) {
    const material = product.attributes.material || '优质材料'
    return {
      text: `"${product.name}"采用${material}，${product.description.slice(0, 50)}。${product.hostComment}`,
      intent: 'answer_question',
      quickReplies: ['加入购物车', '看看当前商品'],
    }
  }

  // Price
  if (text.includes('价格') || text.includes('多少钱') || text.includes('便宜') || text.includes('优惠') || text.includes('划算')) {
    const inBudget = prefs.budgetRange && product.price <= prefs.budgetRange[1] ? '在您的预算范围内，' : ''
    return {
      text: `"${product.name}"原价¥${product.originalPrice}，直播间价只要¥${product.price}！${inBudget}已售${product.salesCount}件，性价比很高～`,
      intent: 'answer_question',
      productCard: {
        productId: product.id, name: product.name, price: product.price,
        imageUrl: product.imageUrl,
        highlightReason: inBudget ? '符合您的预算' : '直播间热销',
        tags: product.tags.slice(0, 3),
      },
      quickReplies: ['加入购物车', '现在有货吗？', '看看当前商品'],
    }
  }

  // Suitability
  if (text.includes('适合') || text.includes('合适') || text.includes('可以吗') || text.includes('怎么样')) {
    const skinTone = prefs.skinTone ? `根据您是${prefs.skinTone}肤色，` : ''
    return {
      text: `${skinTone}"${product.name}"${product.description.slice(0, 60)}。评分${product.rating}分，已售${product.salesCount}件！`,
      intent: 'recommend_product',
      productCard: {
        productId: product.id, name: product.name, price: product.price,
        imageUrl: product.imageUrl,
        highlightReason: prefs.skinTone ? `适合${prefs.skinTone}肤色` : '直播间热销商品',
        tags: product.tags.slice(0, 3),
      },
      quickReplies: ['加入购物车', '有我的尺码吗？', '看看当前商品'],
    }
  }

  // General info about the named product
  return {
    text: `亲，"${product.name}" — ${product.description.slice(0, 60)}。直播价¥${product.price}（原价¥${product.originalPrice}）。您想了解什么细节呢？`,
    intent: 'answer_question',
    productCard: {
      productId: product.id, name: product.name, price: product.price,
      imageUrl: product.imageUrl,
      highlightReason: '您提到的商品',
      tags: product.tags.slice(0, 3),
    },
    quickReplies: ['包邮吗？', '材质是什么？', '加入购物车'],
  }
}

// ====== Handle Commands ======

function handleCommand(
  text: string,
  product: Product | null,
  prefs: UserPreferences
): ChatResponse {
  // Task delegation
  if (text.includes('帮我找') || text.includes('找最好的') || text.includes('帮我挑')) {
    return {
      text: `好的亲！我会帮您持续关注直播间的商品，根据您的${prefs.skinTone ? prefs.skinTone + '肤色、' : ''}${prefs.preferredCategories?.length ? '偏好' + prefs.preferredCategories.join('、') : '购物偏好'}，自动筛选最合适的。有好物立刻通知您！`,
      intent: 'greeting',
      quickReplies: ['现在有什么商品？', '停止自动推荐'],
    }
  }

  if (text.includes('帮我盯着') || text.includes('蹲') || text.includes('监控')) {
    return {
      text: '收到！已开启"直播监控模式"，我会持续观察每个新上商品。一旦发现匹配您画像的好物，第一时间弹窗提醒您～',
      intent: 'greeting',
      quickReplies: ['目前在监控什么？', '停止监控'],
    }
  }

  // Add to cart
  if (text.includes('加购物车') || text.includes('买') || text.includes('下单') || text.includes('就要')) {
    if (!product) {
      return { text: '亲，当前没有在展示商品哦～我会帮您盯着，有合适的立马提醒！', intent: 'clarify' }
    }
    return {
      text: `好嘞！已帮您把"${product.name}"加入购物车，直播价¥${product.price}，比原价省了¥${product.originalPrice - product.price}！`,
      intent: 'add_to_cart',
      productCard: {
        productId: product.id, name: product.name, price: product.price,
        imageUrl: product.imageUrl, highlightReason: '您主动要求加购', tags: product.tags.slice(0, 3),
      },
      quickReplies: ['去购物车看看', '继续逛', '还有什么推荐？'],
      action: { type: 'add_to_cart', payload: { productId: product.id } },
    }
  }

  return {
    text: '亲，您想要做什么呢？可以说"帮我找XX"、"加入购物车"或直接问我问题～',
    intent: 'clarify',
    quickReplies: ['帮我盯着直播间', '现在有什么商品？'],
  }
}

// ====== Agent Task Handler ======

export type AgentTaskType = 'find_best' | 'monitor_deals' | 'compare_all' | 'auto_cart'
export interface AgentTask {
  type: AgentTaskType; description: string; criteria: string
  status: 'pending' | 'running' | 'completed' | 'failed'; result?: string
}

export function parseAgentTask(userText: string): AgentTask | null {
  const text = userText.toLowerCase()
  if (text.includes('帮我找') || text.includes('找最好的') || text.includes('推荐最好的')) {
    return { type: 'find_best', description: '寻找最佳商品', criteria: userText, status: 'pending' }
  }
  if (text.includes('帮我盯着') || text.includes('蹲') || text.includes('关注')) {
    return { type: 'monitor_deals', description: '监控优惠', criteria: userText, status: 'pending' }
  }
  if (text.includes('帮我对比') || text.includes('比较所有') || text.includes('全部对比')) {
    return { type: 'compare_all', description: '全面对比分析', criteria: userText, status: 'pending' }
  }
  return null
}