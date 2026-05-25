import { describe, it, expect } from 'vitest'
import { monitorAgent } from '../agents/MonitorAgent'
import { mockProducts } from '../constants/products'
import type { UserPreferences, Product } from '../types'
import type { ProductCategory } from '../types/product'

// Helper: create a neutral product with no bonus-triggering properties
function neutralProduct(overrides: Partial<Product> = {}): Product {
  const base: Product = {
    ...mockProducts[0],
    price: 100,
    originalPrice: 100,
    rating: 4.0,
    salesCount: 100,
    category: 'food' as ProductCategory,
  }
  const merged = { ...base, ...overrides } as Product
  if (overrides.price !== undefined && overrides.originalPrice === undefined) {
    merged.originalPrice = merged.price
  }
  return merged
}

describe('MonitorAgent Scoring Evaluation', () => {
  // ─── Scoring engine correctness ───
  describe('scoreProduct — base scoring', () => {
    it('base score is 50 with neutral product and no preferences', () => {
      const product = neutralProduct()
      const score = monitorAgent.scoreProduct(product, {})
      expect(score.matchScore).toBe(50)
    })

    it('budget match adds 15 points', () => {
      const product = neutralProduct({ price: 100 })
      const prefs: UserPreferences = { budgetRange: [50, 150] }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(65) // 50 + 15
    })

    it('under budget adds 5 points', () => {
      const product = neutralProduct({ price: 30 })
      const prefs: UserPreferences = { budgetRange: [50, 150] }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(55) // 50 + 5
    })

    it('slightly over budget (≤30%) adds 5 points', () => {
      const product = neutralProduct({ price: 180 })
      const prefs: UserPreferences = { budgetRange: [50, 150] }
      const score = monitorAgent.scoreProduct(product, prefs)
      // 180 vs max 150 → 30 over → 20% → ≤30% → +5
      expect(score.matchScore).toBe(55)
    })

    it('category preference match adds 20 points', () => {
      const product = neutralProduct({ category: 'clothing' })
      const prefs: UserPreferences = { preferredCategories: ['服装'] }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(70) // 50 + 20
    })

    it('skin tone match adds 10 points for clothing', () => {
      const product = neutralProduct({ category: 'clothing' })
      const prefs: UserPreferences = { skinTone: '黄黑皮' }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(60) // 50 + 10
    })

    it('skin tone match adds 10 points for skincare', () => {
      const product = neutralProduct({ category: 'skincare' })
      const prefs: UserPreferences = { skinTone: '白皙' }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(60) // 50 + 10
    })

    it('high rating (≥4.7) adds 8 points', () => {
      const product = neutralProduct({ rating: 4.8 })
      const score = monitorAgent.scoreProduct(product, {})
      expect(score.matchScore).toBe(58) // 50 + 8
    })

    it('high sales (>5000) adds 7 points', () => {
      const product = neutralProduct({ salesCount: 10000 })
      const score = monitorAgent.scoreProduct(product, {})
      expect(score.matchScore).toBe(57) // 50 + 7
    })

    it('big discount (≥50% off) adds 10 points', () => {
      const product = neutralProduct({ price: 50, originalPrice: 200 })
      const score = monitorAgent.scoreProduct(product, {})
      expect(score.matchScore).toBe(60) // 50 + 10
    })
  })

  // ─── Composite scoring ───
  describe('scoreProduct — composite scoring', () => {
    it('stacks multiple bonuses correctly', () => {
      const product = neutralProduct({
        price: 100,
        category: 'clothing',
        rating: 4.8,
        salesCount: 10000,
        originalPrice: 400, // 75% discount
      })
      const prefs: UserPreferences = {
        budgetRange: [50, 150],
        preferredCategories: ['服装'],
        skinTone: '黄黑皮',
      }
      // 50 + 15(budget) + 20(category) + 10(skinTone) + 8(rating) + 7(sales) + 10(discount) = 120
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(120)
    })
  })

  // ─── Threshold: shouldNotify when score ≥ 65 ───
  describe('notification threshold (≥65)', () => {
    it('notifies when score is exactly 65', () => {
      const product = neutralProduct({ price: 100 })
      const prefs: UserPreferences = { budgetRange: [50, 150] }
      // 50 + 15 = 65
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.shouldNotify).toBe(true)
    })

    it('does not notify when score is 64', () => {
      const product = neutralProduct({ price: 30 })
      const prefs: UserPreferences = { budgetRange: [50, 150], skinTone: '黄黑皮' }
      // 50 + 5(under budget) + 0(skinTone on food) = 55
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.shouldNotify).toBe(false)
      expect(score.matchScore).toBeLessThan(65)
    })

    it('perfect match product (budget+category+skinTone on clothing)', () => {
      const product = neutralProduct({
        price: 100,
        category: 'clothing',
        rating: 4.8,
        salesCount: 10000,
        originalPrice: 400,
      })
      const prefs: UserPreferences = {
        budgetRange: [50, 150],
        preferredCategories: ['服装'],
        skinTone: '黄黑皮',
      }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.shouldNotify).toBe(true)
      expect(score.matchScore).toBeGreaterThan(100)
    })
  })

  // ─── Recommendation content ───
  describe('recommendation content', () => {
    it('includes product name in recommendation text', () => {
      const product = neutralProduct({ price: 100, category: 'clothing' })
      const prefs: UserPreferences = { budgetRange: [0, 999], preferredCategories: ['服装'] }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.shouldNotify).toBe(true)
      expect(score.recommendation).toBeDefined()
      expect(score.recommendation!.text).toContain(product.name)
      expect(score.recommendation!.intent).toBe('recommend_product')
      expect(score.recommendation!.productCard).toBeDefined()
      expect(score.recommendation!.quickReplies).toHaveLength(3)
    })
  })

  // ─── observeProduct integration ───
  describe('observeProduct', () => {
    it('skips duplicate product ids', () => {
      monitorAgent.reset()
      const product = neutralProduct({ category: 'clothing' })
      const prefs: UserPreferences = { preferredCategories: ['服装'] }

      monitorAgent.observeProduct(product, prefs, 1) // first observation
      const r2 = monitorAgent.observeProduct(product, prefs, 1)

      expect(r2.shouldNotify).toBe(false)
      expect(r2.reasoning).toBe('duplicate')
    })

    it('skips initial product (index 0)', () => {
      monitorAgent.reset()
      const product = neutralProduct()
      const prefs: UserPreferences = { preferredCategories: ['服装'] }
      const r = monitorAgent.observeProduct(product, prefs, 0)
      expect(r.shouldNotify).toBe(false)
      expect(r.reasoning).toBe('initial product')
    })

    it('notifies for high-match product at index > 0', () => {
      monitorAgent.reset()
      const product = neutralProduct({
        price: 100,
        category: 'clothing',
        rating: 4.8,
        salesCount: 10000,
        originalPrice: 400,
      })
      const prefs: UserPreferences = {
        budgetRange: [50, 150],
        preferredCategories: ['服装'],
        skinTone: '黄黑皮',
      }
      const r = monitorAgent.observeProduct(product, prefs, 1)
      expect(r.matchScore).toBeGreaterThanOrEqual(65)
      expect(r.shouldNotify).toBe(true)
    })
  })

  // ─── Comprehensive scoring report ───
  it('scoring evaluation report', () => {
    console.log('\n========== 监控评分评测报告 ==========')

    const testCases = [
      {
        product: neutralProduct({ price: 100, category: 'clothing', rating: 4.8, salesCount: 10000, originalPrice: 400 }),
        prefs: { budgetRange: [50, 150], preferredCategories: ['服装'], skinTone: '黄黑皮' } as UserPreferences,
        desc: '完美匹配(预算+品类+肤色+评分+销量+折扣)',
      },
      {
        product: neutralProduct({ price: 300, category: 'electronics' }),
        prefs: { budgetRange: [0, 100], preferredCategories: ['服装'] } as UserPreferences,
        desc: '完全不匹配(超预算+错品类)',
      },
      {
        product: neutralProduct({ price: 80, category: 'clothing', rating: 4.8, salesCount: 8000, originalPrice: 160 }),
        prefs: { budgetRange: [0, 200] } as UserPreferences,
        desc: '预算匹配+高评分+高销量+折扣',
      },
      {
        product: neutralProduct({ price: 120, category: 'skincare' }),
        prefs: { skinTone: '白皙', preferredCategories: ['美妆护肤'] } as UserPreferences,
        desc: '品类+肤色匹配',
      },
      {
        product: neutralProduct({ originalPrice: 200 }),
        prefs: {} as UserPreferences,
        desc: '无画像(仅折扣分)',
      },
    ]

    for (const tc of testCases) {
      const result = monitorAgent.scoreProduct(tc.product, tc.prefs)
      const notify = result.shouldNotify ? '🔔 推送' : '🔇 不推送'
      console.log(`  [${notify}] 评分:${result.matchScore} — ${tc.desc}`)
      console.log(`         理由: ${result.reasoning || '(无)'}`)
    }

    console.log('======================================\n')
  })
})
