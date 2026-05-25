import type {
  ShoppingAgent,
  AgentInfo,
  AgentMessage,
  AgentState,
  IntentResult,
} from './types'
import { mockProducts } from '../constants/products'
import type { Product } from '../types'
import { agentBus } from './AgentBus'

// ====== Orchestrator Agent ======
// Central coordinator. Responsibilities:
// 1. Analyze user intent from raw text
// 2. Route to the correct specialist agent (Advisor / Executor)
// 3. Arbitrate conflicts (e.g., Monitor wants to push while user is talking)
// 4. Track conversation context

export class OrchestratorAgent implements ShoppingAgent {
  readonly info: AgentInfo = {
    id: 'orch-001',
    type: 'orchestrator',
    name: '调度中心',
    icon: '🎯',
    state: 'idle',
    description: '理解意图、分发任务、仲裁冲突',
  }

  private state: AgentState = 'idle'

  async handleMessage(msg: AgentMessage): Promise<Omit<AgentMessage, 'id' | 'timestamp'> | null> {
    this.state = 'busy'

    switch (msg.type) {
      case 'user_input':
        return this.handleUserInput(msg)
      case 'monitor_alert':
        return this.handleMonitorAlert(msg)
      case 'conflict_resolve':
        return this.handleConflict(msg)
      default:
        this.state = 'idle'
        return null
    }
  }

  // Analyze user intent and route to specialist
  private async handleUserInput(msg: AgentMessage): Promise<Omit<AgentMessage, 'id' | 'timestamp'> | null> {
    const userText = msg.payload.userText || ''
    const intent = this.analyzeIntent(userText)

    // Emit status update
    await agentBus.dispatch({
      from: 'orchestrator',
      to: 'ui',
      type: 'status_update',
      payload: { reasoning: `意图分析: ${intent.type}`, intent },
      priority: 'normal',
    })

    // Route based on intent
    switch (intent.type) {
      case 'greeting':
        return {
          from: 'orchestrator',
          to: 'advisor',
          type: 'product_query',
          payload: {
            userText,
            intent,
            product: msg.payload.currentProduct || undefined,
            userPreferences: msg.payload.userPreferences,
          },
          priority: 'normal',
        }

      case 'specific_product':
      case 'current_product':
      case 'product_search':
        return {
          from: 'orchestrator',
          to: 'advisor',
          type: intent.type === 'product_search' ? 'product_search' : 'product_query',
          payload: {
            userText,
            intent,
            product: intent.matchedProduct || msg.payload.currentProduct || undefined,
            currentProduct: msg.payload.currentProduct,
            userPreferences: msg.payload.userPreferences,
            searchKeywords: intent.searchKeywords,
            targetCategory: intent.targetCategory,
          },
          priority: 'normal',
        }

      case 'command':
        return {
          from: 'orchestrator',
          to: 'executor',
          type: 'command_request',
          payload: {
            userText,
            intent,
            product: msg.payload.currentProduct || undefined,
            userPreferences: msg.payload.userPreferences,
            messages: msg.payload.messages,
            conversationId: msg.payload.conversationId,
          },
          priority: 'high',
        }

      case 'general':
        return {
          from: 'orchestrator',
          to: 'advisor',
          type: 'product_query',
          payload: {
            userText,
            intent,
            product: msg.payload.currentProduct || undefined,
            currentProduct: msg.payload.currentProduct,
            userPreferences: msg.payload.userPreferences,
          },
          priority: 'low',
        }

      default:
        this.state = 'idle'
        return null
    }
  }

  // Handle monitor's proactive alert
  private async handleMonitorAlert(msg: AgentMessage): Promise<Omit<AgentMessage, 'id' | 'timestamp'> | null> {
    // Conflict check: if user interacted recently, delay
    if (agentBus.hasRecentUserInteraction(15000)) {
      console.log('[Orchestrator] ⚠️ Monitor alert suppressed: user active within 15s')
      this.state = 'idle'
      return null
    }

    // Forward to UI directly
    await agentBus.dispatch({
      from: 'orchestrator',
      to: 'ui',
      type: 'agent_response',
      payload: {
        response: msg.payload.response,
        reasoning: msg.payload.reasoning,
        shouldNotify: true,
      },
      priority: 'normal',
    })

    this.state = 'idle'
    return null
  }

  // Handle conflict resolution
  private async handleConflict(_msg: AgentMessage): Promise<Omit<AgentMessage, 'id' | 'timestamp'> | null> {
    agentBus.flushPendingConflicts()
    this.state = 'idle'
    return null
  }

  // ====== Intent Analysis Engine ======

  // Question indicators — user is asking something specific, not just browsing
  private hasQuestionIndicator(text: string): boolean {
    return /[?？吗呢]|包邮|包有|包油|运费|邮费|材质|面料|成分|什么|怎么|如何|多少|价格|便宜|优惠|划算|适合|合适|尺码|大小|码|颜色|可以|能不能|有没有|有没有|有.*吗|有没有/.test(text)
  }

  // Product search patterns — defined early so existence check can use as fallback
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

  private analyzeIntent(userText: string): IntentResult {
    const text = userText.toLowerCase()

    // Greeting
    if (/你好|hi|hello|在吗|嗨|哈喽|在不在|主播好|大家好|晚上好|上午好/.test(text)) {
      return { type: 'greeting', searchKeywords: [], targetCategory: null }
    }

    // Commands — check first so "帮我找面膜" routes to executor, not specific_product
    if (/加入购物车|加到购物车|加购物车|加购|买|下单|就要|帮我找|帮我盯着|帮我看一下|监控|蹲/.test(text)) {
      return { type: 'command', searchKeywords: [], targetCategory: null }
    }

    // Named product detection (e.g., "和田大枣包邮吗")
    const namedProduct = this.detectProductMention(text)
    if (namedProduct) {
      return { type: 'specific_product', searchKeywords: [], targetCategory: null, matchedProduct: namedProduct }
    }

    // Current product reference
    if (/这个|这款|这个商品|当前|现在这个|它/.test(text)) {
      return { type: 'current_product', searchKeywords: [], targetCategory: null }
    }

    // "有没有X" / "有X吗" — explicit product existence check
    const existenceMatch = text.match(/有(?:没有)?(.{1,8})[吗呢？?]?$|有没有(.{1,8})/)
    if (existenceMatch) {
      const rawTerm = (existenceMatch[1] || existenceMatch[2] || '').trim()
      const searchTerm = rawTerm.replace(/[吗呢？?]+$/g, '').trim()
      if (searchTerm && /[一-鿿]/.test(searchTerm)) {
        const found = this.searchProductByKeyword(searchTerm)
        if (found) {
          return { type: 'specific_product', searchKeywords: [searchTerm], targetCategory: null, matchedProduct: found }
        }
        // Exact match failed — check if searchTerm matches a category pattern
        for (const [pattern, category, label] of this.getSearchPatterns()) {
          if (pattern.test(searchTerm) && category) {
            const bestProduct = this.findBestProductForCategory(category, [searchTerm, label])
            if (bestProduct) {
              return { type: 'specific_product', searchKeywords: [searchTerm, label], targetCategory: category, matchedProduct: bestProduct }
            }
            return { type: 'product_search', searchKeywords: [searchTerm, label], targetCategory: category }
          }
        }
        // Truly not found — let AdvisorAgent handle the "not found" response
        return { type: 'product_search', searchKeywords: [searchTerm], targetCategory: null }
      }
    }

    const searchPatterns = this.getSearchPatterns()

    // If the text contains a question indicator AND a category keyword,
    // find the best matching product and route to product_query (specific_product)
    const hasQuestion = this.hasQuestionIndicator(text)

    for (const [pattern, category, label] of searchPatterns) {
      const match = text.match(pattern)
      if (match) {
        const matchedWord = match[0]
        const keywords = matchedWord !== label ? [matchedWord, label] : [label]

        if (hasQuestion && category) {
          // User is asking a question about a category — find best product match
          const bestProduct = this.findBestProductForCategory(category, keywords)
          if (bestProduct) {
            return { type: 'specific_product', searchKeywords: keywords, targetCategory: category, matchedProduct: bestProduct }
          }
        }

        return { type: 'product_search', searchKeywords: keywords, targetCategory: category || null }
      }
    }

    // No product match but user is asking a question — route to general
    return { type: 'general', searchKeywords: [], targetCategory: null }
  }

  // Search product catalog by keyword
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

  // Find best product for a category
  private findBestProductForCategory(category: string, _keywords: string[]): Product | null {
    const matches = mockProducts.filter((p) => p.category === category)
    if (matches.length === 0) return null
    return matches.sort((a, b) => b.rating - a.rating)[0]
  }

  // Detect if user mentions a specific product by name
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

  getState(): AgentState {
    return this.state
  }

  reset(): void {
    this.state = 'idle'
  }
}

export const orchestratorAgent = new OrchestratorAgent()
