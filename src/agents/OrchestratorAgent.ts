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

    // Product search patterns
    const searchPatterns: [RegExp, string, string][] = [
      [/男装|男款|男士|男生/, 'clothing', '男装'],
      [/女装|女款|女士|女生|裙子|连衣裙|T恤|上衣|裤子|外套/, 'clothing', '女装'],
      [/面膜|精华|护肤|面霜|化妆水|爽肤水|卸妆|防晒/, 'skincare', '美妆护肤'],
      [/鞋子|运动鞋|跑鞋|休闲鞋/, 'clothing', '鞋类'],
      [/包包|手提包|斜挎包|单肩包|双肩包|配饰/, 'accessories', '配饰包包'],
      [/耳机|数码|电子产品|手机|平板/, 'electronics', '数码产品'],
      [/吃的|零食|食品|枣|坚果/, 'food', '食品'],
      [/便宜的|平价|学生党|实惠/, '', '高性价比'],
      [/贵的|高端|大牌|奢侈/, '', '高端商品'],
    ]

    for (const [pattern, category, label] of searchPatterns) {
      const match = text.match(pattern)
      if (match) {
        const matchedWord = match[0]
        const keywords = matchedWord !== label ? [matchedWord, label] : [label]
        return { type: 'product_search', searchKeywords: keywords, targetCategory: category || null }
      }
    }

    return { type: 'general', searchKeywords: [], targetCategory: null }
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
