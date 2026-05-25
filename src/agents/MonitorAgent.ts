import type {
  ShoppingAgent,
  AgentInfo,
  AgentMessage,
  AgentState,
} from './types'
import type { Product, UserPreferences, ChatResponse } from '../types'
import { agentBus } from './AgentBus'

// ====== Monitor Agent ======
// Autonomous observer. Responsibilities:
// 1. Continuously watch product changes in the live stream
// 2. Score each product against user preferences (0-100)
// 3. Proactively push recommendations when score ≥ 65 threshold
// 4. Respect cooldown periods after user interaction

export class MonitorAgent implements ShoppingAgent {
  readonly info: AgentInfo = {
    id: 'mon-001',
    type: 'monitor',
    name: '监控Agent',
    icon: '👀',
    state: 'idle',
    description: '持续观察直播间，自动发现匹配好物',
  }

  private state: AgentState = 'idle'
  private observationCount = 0
  private lastObservedProductId: string | null = null
  private enabled = true

  async handleMessage(msg: AgentMessage): Promise<Omit<AgentMessage, 'id' | 'timestamp'> | null> {
    if (!this.enabled) return null

    switch (msg.type) {
      case 'status_update':
        // External toggle: enable/disable monitoring
        if (msg.payload.reasoning === 'enable') {
          this.enabled = true
        } else if (msg.payload.reasoning === 'disable') {
          this.enabled = false
        }
        return null

      default:
        return null
    }
  }

  // Main observation method - called from outside when product changes
  observeProduct(
    product: Product,
    preferences: UserPreferences,
    productIndex: number
  ): { shouldNotify: boolean; matchScore: number; reasoning: string } {
    this.state = 'busy'

    // Skip duplicate observations
    if (product.id === this.lastObservedProductId) {
      this.state = 'idle'
      return { shouldNotify: false, matchScore: 0, reasoning: 'duplicate' }
    }
    this.lastObservedProductId = product.id

    // Skip initial product (index 0) - don't analyze on page load
    if (productIndex === 0) {
      this.state = 'idle'
      return { shouldNotify: false, matchScore: 0, reasoning: 'initial product' }
    }

    const analysis = this.scoreProduct(product, preferences)
    this.observationCount++

    if (analysis.shouldNotify && analysis.recommendation) {
      // Push alert to bus → Orchestrator decides timing
      agentBus.dispatch({
        from: 'monitor',
        to: 'orchestrator',
        type: 'monitor_alert',
        payload: {
          product,
          response: analysis.recommendation,
          matchScore: analysis.matchScore,
          shouldNotify: true,
          reasoning: analysis.reasoning,
        },
        priority: 'high',
      })

      this.state = 'idle'
      return { shouldNotify: true, matchScore: analysis.matchScore, reasoning: analysis.reasoning }
    }

    this.state = 'idle'
    return { shouldNotify: false, matchScore: analysis.matchScore, reasoning: analysis.reasoning }
  }

  // ====== Product Scoring Engine ======

  // Public for testability — scores product against user preferences (0-100)
  scoreProduct(
    product: Product,
    preferences: UserPreferences
  ): { shouldNotify: boolean; matchScore: number; reasoning: string; recommendation?: ChatResponse } {
    let score = 50
    const reasons: string[] = []

    // Budget match
    if (preferences.budgetRange) {
      const [min, max] = preferences.budgetRange
      if (product.price >= min && product.price <= max) {
        score += 15
        reasons.push('在您的预算范围内')
      } else if (product.price < min) {
        score += 5
        reasons.push('低于预算，超值选择')
      } else if (product.price <= max * 1.3) {
        score += 5
        reasons.push('略超预算但性价比高')
      }
    }

    // Category preference
    if (preferences.preferredCategories?.length) {
      const categoryMap: Record<string, string[]> = {
        '服装': ['clothing'],
        '美妆护肤': ['skincare'],
        '配饰': ['accessories'],
        '美食': ['food'],
        '数码': ['electronics'],
      }
      const preferredCats = preferences.preferredCategories.flatMap((c) => categoryMap[c] || [])
      if (preferredCats.includes(product.category)) {
        score += 20
        reasons.push('是您感兴趣的品类')
      }
    }

    // Skin tone match
    if (preferences.skinTone && (product.category === 'clothing' || product.category === 'skincare')) {
      reasons.push('很适合您的肤色')
      score += 10
    }

    // Quality signals
    if (product.rating >= 4.7) {
      score += 8
      reasons.push('好评率很高')
    }
    if (product.salesCount > 5000) {
      score += 7
      reasons.push('销量火爆')
    }
    if (product.originalPrice > 0 && product.price / product.originalPrice <= 0.5) {
      score += 10
      reasons.push(`打${Math.round((product.price / product.originalPrice) * 10)}折`)
    }

    const shouldNotify = score >= 65
    const recommendation: ChatResponse | undefined = shouldNotify
      ? {
          text: `👀 亲！刚上了一个很适合您的商品——"${product.name}"，${reasons.slice(0, 2).join('，')}。`,
          intent: 'recommend_product',
          productCard: {
            productId: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            highlightReason: reasons.join('；'),
            tags: product.tags.slice(0, 3),
          },
          quickReplies: ['帮我看看详情', '加入购物车', '跳过'],
        }
      : undefined

    return {
      shouldNotify,
      matchScore: score,
      reasoning: reasons.join('；'),
      recommendation,
    }
  }

  getState(): AgentState {
    return this.state
  }

  getObservationCount(): number {
    return this.observationCount
  }

  isEnabled(): boolean {
    return this.enabled
  }

  setEnabled(v: boolean): void {
    this.enabled = v
  }

  reset(): void {
    this.state = 'idle'
    this.observationCount = 0
    this.lastObservedProductId = null
    this.enabled = true
  }
}

export const monitorAgent = new MonitorAgent()
