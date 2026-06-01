import { describe, it, expect } from 'vitest'
import { monitorAgent } from '../agents/MonitorAgent'
import { mockProducts } from '../constants/products'
import type { UserPreferences, Product } from '../types'
import type { ProductCategory } from '../types/product'

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

describe('MonitorAgent Scoring Evaluation (V2)', () => {
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
      expect(score.matchScore).toBe(65)
    })

    it('under budget adds 5 points', () => {
      const product = neutralProduct({ price: 30 })
      const prefs: UserPreferences = { budgetRange: [50, 150] }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(55)
    })

    it('slightly over budget (≤30%) adds 5 points', () => {
      const product = neutralProduct({ price: 180 })
      const prefs: UserPreferences = { budgetRange: [50, 150] }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(55)
    })

    it('category preference match adds 20 points', () => {
      const product = neutralProduct({ category: 'clothing' })
      const prefs: UserPreferences = { preferredCategories: ['服装'] }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(70)
    })

    it('skin tone match adds 10 points for clothing', () => {
      const product = neutralProduct({ category: 'clothing' })
      const prefs: UserPreferences = { skinTone: '黄黑皮' }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(60)
    })

    it('skin tone match adds 10 points for skincare', () => {
      const product = neutralProduct({ category: 'skincare' })
      const prefs: UserPreferences = { skinTone: '白皙' }
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(60)
    })

    it('high rating (≥4.7) adds 8 points', () => {
      const product = neutralProduct({ rating: 4.8 })
      const score = monitorAgent.scoreProduct(product, {})
      expect(score.matchScore).toBe(58)
    })

    it('high sales (>5000) adds 7 points', () => {
      const product = neutralProduct({ salesCount: 10000 })
      const score = monitorAgent.scoreProduct(product, {})
      expect(score.matchScore).toBe(57)
    })

    it('big discount (≥50% off) adds 10 points', () => {
      const product = neutralProduct({ price: 50, originalPrice: 200 })
      const score = monitorAgent.scoreProduct(product, {})
      expect(score.matchScore).toBe(60)
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
        originalPrice: 400,
      })
      const prefs: UserPreferences = {
        budgetRange: [50, 150],
        preferredCategories: ['服装'],
        skinTone: '黄黑皮',
      }
      // 50 + 15 + 20 + 10 + 8 + 7 + 10 = 120
      const score = monitorAgent.scoreProduct(product, prefs)
      expect(score.matchScore).toBe(120)
    })
  })

  // ─── observeProduct push threshold (≥65) ───
  describe('observeProduct push threshold (≥65)', () => {
    it('pushes when score is 65+ and user idle (budget match → 65)', () => {
      monitorAgent.reset()
      const product = neutralProduct({ price: 100 })
      const prefs: UserPreferences = { budgetRange: [50, 150] }
      const r = monitorAgent.observeProduct(product, prefs, 1)
      expect(r.matchScore).toBe(65)
      // shouldPush depends on activityClock — with no recent activity it should push
      expect(r.shouldPush).toBe(true)
    })

    it('does not push when score < 65', () => {
      monitorAgent.reset()
      const product = neutralProduct({ price: 30 })
      const prefs: UserPreferences = { budgetRange: [50, 150], skinTone: '黄黑皮' }
      const r = monitorAgent.observeProduct(product, prefs, 1)
      expect(r.matchScore).toBeLessThan(65)
      expect(r.shouldPush).toBe(false)
    })

    it('perfect match product (budget+category+skinTone on clothing)', () => {
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
      expect(r.shouldPush).toBe(true)
      expect(r.matchScore).toBeGreaterThan(100)
      expect(r.recommendation).toBeDefined()
    })
  })

  // ─── Recommendation content (from observeProduct) ───
  describe('recommendation content', () => {
    it('includes product name in recommendation text', () => {
      monitorAgent.reset()
      const product = neutralProduct({ price: 100, category: 'clothing' })
      const prefs: UserPreferences = { budgetRange: [0, 999], preferredCategories: ['服装'] }
      const r = monitorAgent.observeProduct(product, prefs, 1)
      expect(r.shouldPush).toBe(true)
      expect(r.recommendation).toBeDefined()
      expect(r.recommendation!.text).toContain(product.name)
      expect(r.recommendation!.productCard).toBeDefined()
      expect(r.recommendation!.quickReplies).toHaveLength(3)
    })
  })

  // ─── observeProduct integration ───
  describe('observeProduct', () => {
    it('skips duplicate product ids', () => {
      monitorAgent.reset()
      const product = neutralProduct({ category: 'clothing' })
      const prefs: UserPreferences = { preferredCategories: ['服装'] }
      monitorAgent.observeProduct(product, prefs, 1)
      const r2 = monitorAgent.observeProduct(product, prefs, 1)
      expect(r2.shouldPush).toBe(false)
      expect(r2.reasoning).toBe('duplicate')
    })

    it('skips duplicate product ids', () => {
      monitorAgent.reset()
      const product = neutralProduct({ category: 'clothing' })
      const prefs: UserPreferences = { preferredCategories: ['服装'] }
      monitorAgent.observeProduct(product, prefs, 1) // first observation
      const r2 = monitorAgent.observeProduct(product, prefs, 1) // same product → duplicate
      expect(r2.shouldPush).toBe(false)
      expect(r2.reasoning).toBe('duplicate')
    })

    it('skips already-pushed products (different product, same ID)', () => {
      monitorAgent.reset()
      const product = neutralProduct({
        price: 100, category: 'clothing', rating: 4.8, salesCount: 10000, originalPrice: 400,
      })
      const prefs: UserPreferences = {
        budgetRange: [50, 150], preferredCategories: ['服装'], skinTone: '黄黑皮',
      }
      // First: push product (index > 0, high score, user idle)
      monitorAgent.observeProduct({ ...product }, prefs, 1)
      // Second: same product should be blocked by duplicate check
      const r2 = monitorAgent.observeProduct({ ...product }, prefs, 1)
      expect(r2.reasoning).toBe('duplicate')
    })

    it('skips initial product (index 0)', () => {
      monitorAgent.reset()
      const product = neutralProduct()
      const prefs: UserPreferences = { preferredCategories: ['服装'] }
      const r = monitorAgent.observeProduct(product, prefs, 0)
      expect(r.shouldPush).toBe(false)
      expect(r.reasoning).toBe('initial_product')
    })

    it('notifies for high-match product at index > 0', () => {
      monitorAgent.reset()
      const product = neutralProduct({
        price: 100, category: 'clothing', rating: 4.8, salesCount: 10000, originalPrice: 400,
      })
      const prefs: UserPreferences = {
        budgetRange: [50, 150], preferredCategories: ['服装'], skinTone: '黄黑皮',
      }
      const r = monitorAgent.observeProduct(product, prefs, 1)
      expect(r.matchScore).toBeGreaterThanOrEqual(65)
      expect(r.shouldPush).toBe(true)
    })
  })

  // ─── Comprehensive scoring report ───
  it('scoring evaluation report', () => {
    console.log('\n========== 监控评分评测报告 (V2) ==========')

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
      const notify = result.matchScore >= 65 ? '(>=65可推送)' : '(<65不推送)'
      console.log(`  [${notify}] 评分:${result.matchScore} — ${tc.desc}`)
      console.log(`         理由: ${result.reasoning || '(无)'}`)
    }
    console.log('======================================\n')
  })
})
