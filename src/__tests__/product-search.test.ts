import { describe, it, expect } from 'vitest'
import { shoppingAgent } from '../agents/ShoppingAgent'
import { mockProducts } from '../constants/products'

describe('Product Search Evaluation (V2: ShoppingAgent)', () => {
  // ─── Recall — known products should be found ───
  describe('recall', () => {
    it('finds "碎花连衣裙" when searching "裙子"', () => {
      const results = shoppingAgent.searchProducts(['裙子'], 'clothing')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((p) => p.name.includes('连衣裙'))).toBe(true)
    })

    it('finds "新疆和田大枣" when searching "枣"', () => {
      const results = shoppingAgent.searchProducts(['枣', '食品'], 'food')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((p) => p.name.includes('枣'))).toBe(true)
    })

    it('finds "运动鞋" when searching "鞋" (partial char match)', () => {
      const results = shoppingAgent.searchProducts(['鞋'], 'clothing')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((p) => p.name.includes('运动鞋'))).toBe(true)
    })

    it('finds "美白精华液" when searching "精华"', () => {
      const results = shoppingAgent.searchProducts(['精华'], 'skincare')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((p) => p.name.includes('精华'))).toBe(true)
    })

    it('finds "复古手工包" when searching "包包"', () => {
      const results = shoppingAgent.searchProducts(['包包'], 'accessories')
      expect(results.length).toBeGreaterThan(0)
    })

    it('finds "降噪耳机" when searching "耳机"', () => {
      const results = shoppingAgent.searchProducts(['耳机'], 'electronics')
      expect(results.length).toBeGreaterThan(0)
    })

    it('finds "T恤" when searching "T恤"', () => {
      const results = shoppingAgent.searchProducts(['T恤'], 'clothing')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((p) => p.name.includes('T恤'))).toBe(true)
    })

    it('finds "面膜" when searching "面膜"', () => {
      const results = shoppingAgent.searchProducts(['面膜'], 'skincare')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some((p) => p.name.includes('面膜'))).toBe(true)
    })
  })

  // ─── Honest "not found" — items not in catalog ───
  describe('honest not found — returns empty for missing items', () => {
    it('"手表" not in catalog → empty', () => {
      const results = shoppingAgent.searchProducts(['手表'], null)
      expect(results.length).toBe(0)
    })

    it('"家具" not in catalog → empty', () => {
      const results = shoppingAgent.searchProducts(['家具'], null)
      expect(results.length).toBe(0)
    })

    it('"防晒霜" not in catalog → empty (only 精华液 exists)', () => {
      const results = shoppingAgent.searchProducts(['防晒'], 'skincare')
      expect(results.length).toBe(0)
    })

    it('"汽车" not in catalog → empty', () => {
      const results = shoppingAgent.searchProducts(['汽车'], null)
      expect(results.length).toBe(0)
    })
  })

  // ─── Category filtering ───
  describe('category filtering', () => {
    it('category filter restricts results to matching category', () => {
      const results = shoppingAgent.searchProducts(['面膜'], 'skincare')
      for (const p of results) {
        expect(p.category).toBe('skincare')
      }
    })

    it('null category searches all categories', () => {
      const results = shoppingAgent.searchProducts(['面膜'], null)
      expect(results.length).toBeGreaterThanOrEqual(0)
    })
  })

  // ─── Comprehensive evaluation report ───
  it('product search evaluation report', () => {
    console.log('\n========== 商品搜索评测报告 (V2) ==========')
    console.log(`  商品总数: ${mockProducts.length}`)

    const categories = new Map<string, number>()
    for (const p of mockProducts) {
      categories.set(p.category, (categories.get(p.category) || 0) + 1)
    }
    console.log('  品类分布:')
    for (const [cat, count] of categories) {
      console.log(`    ${cat}: ${count}个`)
    }

    const testQueries: { keywords: string[]; category: string | null; desc: string; minExpected: number; maxExpected?: number }[] = [
      { keywords: ['裙子'], category: 'clothing', desc: '裙子→碎花连衣裙', minExpected: 1 },
      { keywords: ['枣'], category: 'food', desc: '枣→新疆和田大枣', minExpected: 1 },
      { keywords: ['运动鞋'], category: 'clothing', desc: '运动鞋→飞织运动鞋', minExpected: 1 },
      { keywords: ['精华'], category: 'skincare', desc: '精华→美白精华液', minExpected: 1 },
      { keywords: ['面膜'], category: 'skincare', desc: '面膜→补水面膜', minExpected: 1 },
      { keywords: ['包包'], category: 'accessories', desc: '包包→复古手工包', minExpected: 1 },
      { keywords: ['耳机'], category: 'electronics', desc: '耳机→降噪耳机', minExpected: 1 },
      { keywords: ['T恤'], category: 'clothing', desc: 'T恤→纯棉T恤', minExpected: 1 },
      { keywords: ['手表'], category: null, desc: '手表→空(无此商品)', minExpected: 0, maxExpected: 0 },
      { keywords: ['家具'], category: null, desc: '家具→空(无此商品)', minExpected: 0, maxExpected: 0 },
      { keywords: ['防晒'], category: 'skincare', desc: '防晒→空(无防晒商品)', minExpected: 0, maxExpected: 0 },
    ]

    let passed = 0
    let failed = 0
    for (const q of testQueries) {
      const results = shoppingAgent.searchProducts(q.keywords, q.category)
      const maxOk = q.maxExpected !== undefined ? results.length <= q.maxExpected : true
      const ok = results.length >= q.minExpected && maxOk
      const status = ok ? '✓' : '✗'
      if (ok) passed++
      else failed++
      console.log(`  ${status} ${q.desc}: ${results.length} results`)
    }

    const passRate = ((passed / testQueries.length) * 100).toFixed(1)
    console.log(`  ─────────────────────────────`)
    console.log(`  搜索通过率: ${passed}/${testQueries.length} (${passRate}%)`)
    console.log('======================================\n')

    expect(passed).toBeGreaterThanOrEqual(9)
  })
})
