import type { Product, UserPreferences, ProductCardData } from '../types'
import { activityClock } from './activityClock'

// Autonomous observer — watches product changes and scores against user preferences.
// Runs independently of ShoppingAgent. Triggered by product switch events, not user input.
// Uses activityClock (not AgentBus) for conflict detection.

export interface ObserveResult {
  shouldPush: boolean
  matchScore: number
  reasoning: string
  recommendation?: {
    text: string
    productCard: ProductCardData
    quickReplies: string[]
  }
}

export class MonitorAgent {
  private observationCount = 0
  private lastObservedProductId: string | null = null
  private pushedProductIds = new Set<string>()
  private enabled = true

  observeProduct(
    product: Product,
    preferences: UserPreferences,
    productIndex: number
  ): ObserveResult {
    if (!this.enabled) {
      return { shouldPush: false, matchScore: 0, reasoning: 'disabled' }
    }

    // Skip duplicates
    if (product.id === this.lastObservedProductId) {
      return { shouldPush: false, matchScore: 0, reasoning: 'duplicate' }
    }
    this.lastObservedProductId = product.id

    // Don't push already-pushed products
    if (this.pushedProductIds.has(product.id)) {
      return { shouldPush: false, matchScore: 0, reasoning: 'already_pushed' }
    }

    // Skip initial product (index 0)
    if (productIndex === 0) {
      return { shouldPush: false, matchScore: 0, reasoning: 'initial_product' }
    }

    const { matchScore, reasoning } = this.scoreProduct(product, preferences)
    this.observationCount++

    const shouldPush = matchScore >= 65 && !activityClock.isUserActive()

    if (!shouldPush) {
      const blockReason = matchScore < 65
        ? reasoning || `分数不足(${matchScore}<65)`
        : 'user_active'
      return { shouldPush: false, matchScore, reasoning: blockReason }
    }

    this.pushedProductIds.add(product.id)

    return {
      shouldPush: true,
      matchScore,
      reasoning,
      recommendation: {
        text: `亲！刚上了一个很适合您的商品——"${product.name}"，${reasoning}。`,
        productCard: {
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          highlightReason: reasoning,
          tags: product.tags.slice(0, 3),
        },
        quickReplies: ['帮我看看详情', '加入购物车', '跳过'],
      },
    }
  }

  // ===== Scoring Engine =====

  scoreProduct(
    product: Product,
    preferences: UserPreferences
  ): { matchScore: number; reasoning: string } {
    let score = 50
    const reasons: string[] = []

    // Budget match (0–15)
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

    // Category preference (0–20)
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

    // Skin tone match (0–10)
    if (preferences.skinTone && (product.category === 'clothing' || product.category === 'skincare')) {
      score += 10
      reasons.push('很适合您的肤色')
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

    return {
      matchScore: score,
      reasoning: reasons.join('；'),
    }
  }

  // ===== State =====

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
    this.observationCount = 0
    this.lastObservedProductId = null
    this.pushedProductIds.clear()
    this.enabled = true
  }
}

export const monitorAgent = new MonitorAgent()
