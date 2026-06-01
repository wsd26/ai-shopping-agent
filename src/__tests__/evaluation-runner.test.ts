/**
 * ====== AI Shopping Agent — Comprehensive Evaluation Runner V2 ======
 *
 * Aggregates results from all evaluation suites and produces a summary report.
 * Run with: npm test
 *
 * V2 Architecture: 1+1 Agent model (ShoppingAgent + MonitorAgent), no AgentBus.
 */

import { describe, it, expect } from 'vitest'
import { mockProducts } from '../constants/products'
import { shoppingAgent } from '../agents/ShoppingAgent'
import { monitorAgent } from '../agents/MonitorAgent'

const emptyInput = { currentProduct: null, userPreferences: {}, recentMessages: [] }

describe('AI Shopping Agent — 综合评测报告 (V2)', () => {
  it('prints comprehensive evaluation summary', () => {
    console.log('\n')
    console.log('╔══════════════════════════════════════════════╗')
    console.log('║   AI语音导购Agent — 综合评测报告 (V2)        ║')
    console.log('║   1+1 Agent架构 (ShoppingAgent + Monitor)     ║')
    console.log('╚══════════════════════════════════════════════╝')
    console.log('')

    // ─── 1. System Architecture ───
    console.log('━━━ 1. 系统架构 ━━━')
    console.log('  Agent数量: 2 (ShoppingAgent + MonitorAgent)')
    console.log('  Mock商品: ' + mockProducts.length + '个')
    console.log('  通信方式: 直接函数调用 (无消息总线)')
    console.log('  冲突检测: activityClock (共享时间戳)')
    console.log('')

    // ─── 2. Intent Recognition ───
    console.log('━━━ 2. 意图识别评测 ━━━')
    const intentTests = [
      { text: '你好', expected: 'greeting' },
      { text: 'hi小快', expected: 'greeting' },
      { text: '和田大枣包邮吗', expected: 'specific_product' },
      { text: '有没有男装', expected: 'specific_product' },  // category fallback finds clothing
      { text: '有裙子吗', expected: 'specific_product' },     // category fallback finds clothing
      { text: '这个多少钱', expected: 'current_product' },
      { text: '加入购物车', expected: 'command' },
      { text: '帮我盯着直播间', expected: 'command' },
      { text: '帮我找最好的', expected: 'command' },
      { text: '今天天气不错', expected: 'general' },
    ]

    let intentCorrect = 0
    for (const t of intentTests) {
      const output = shoppingAgent.process({ userText: t.text, ...emptyInput })
      const predicted = output.intent
      const ok = predicted === t.expected
      if (ok) intentCorrect++
      console.log(`  ${ok ? '✓' : '✗'} "${t.text}" → ${predicted} ${ok ? '' : `(expected: ${t.expected})`}`)
    }
    const intentAcc = ((intentCorrect / intentTests.length) * 100).toFixed(1)
    console.log(`  → 意图识别准确率: ${intentCorrect}/${intentTests.length} (${intentAcc}%)`)
    console.log('')

    // ─── 3. Product Search ───
    console.log('━━━ 3. 商品搜索评测 ━━━')
    const searchTests = [
      { keywords: ['裙子'], category: 'clothing', desc: '裙子→碎花连衣裙', expectFound: true },
      { keywords: ['枣'], category: 'food', desc: '枣→新疆和田大枣', expectFound: true },
      { keywords: ['跑鞋'], category: 'clothing', desc: '跑鞋→男士跑鞋', expectFound: true },
      { keywords: ['精华'], category: 'skincare', desc: '精华→美白精华液', expectFound: true },
      { keywords: ['面膜'], category: 'skincare', desc: '面膜→补水保湿面膜', expectFound: true },
      { keywords: ['手表'], category: null, desc: '手表→空(无此商品)', expectFound: false },
      { keywords: ['家具'], category: null, desc: '家具→空(无此商品)', expectFound: false },
    ]

    let searchCorrect = 0
    for (const t of searchTests) {
      const results = shoppingAgent.searchProducts(t.keywords, t.category)
      const found = results.length > 0
      const ok = found === t.expectFound
      if (ok) searchCorrect++
      console.log(`  ${ok ? '✓' : '✗'} ${t.desc}: ${results.length} results`)
    }
    const searchAcc = ((searchCorrect / searchTests.length) * 100).toFixed(1)
    console.log(`  → 搜索准确率: ${searchCorrect}/${searchTests.length} (${searchAcc}%)`)
    console.log('')

    // ─── 4. Monitor Scoring ───
    console.log('━━━ 4. 监控评分评测 ━━━')
    const scoreTests = [
      {
        product: { ...mockProducts[0], price: 100, category: 'clothing', rating: 4.8, salesCount: 8000, originalPrice: 200 },
        prefs: { budgetRange: [50, 150] as [number, number], preferredCategories: ['服装'], skinTone: '黄黑皮' },
        desc: '完美匹配', expectNotify: true,
      },
      {
        product: { ...mockProducts[0], price: 300, category: 'electronics', rating: 3.5, salesCount: 100, originalPrice: 350 },
        prefs: { budgetRange: [0, 100] as [number, number], preferredCategories: ['服装'] },
        desc: '完全不匹配', expectNotify: false,
      },
      {
        product: { ...mockProducts[0], price: 80, category: 'clothing', rating: 4.0, salesCount: 100, originalPrice: 160 },
        prefs: { budgetRange: [0, 200] as [number, number] },
        desc: '预算+折扣匹配', expectNotify: true, // 50 + 15(budget) + 10(50% discount) = 75 ≥ 65
      },
    ]

    for (const t of scoreTests) {
      // Use scoreProduct for pure score test (independent of activityClock)
      const result = monitorAgent.scoreProduct(t.product as any, t.prefs)
      const shouldNotify = result.matchScore >= 65
      const ok = shouldNotify === t.expectNotify
      console.log(`  ${ok ? '✓' : '✗'} ${t.desc}: 评分=${result.matchScore} shouldNotify=${shouldNotify} (expected=${t.expectNotify})`)
    }
    console.log('')

    // ─── 5. Agent Architecture ───
    console.log('━━━ 5. Agent架构 ━━━')
    console.log('  ShoppingAgent: 统一对话Agent (意图→回复→动作)')
    console.log('    - classifyIntent: 6种意图正则分类')
    console.log('    - generateResponse: 13个意图→回复分支')
    console.log('    - extractAction: 3条命令→动作映射')
    console.log('  MonitorAgent: 商品观察Agent (事件驱动)')
    console.log('    - scoreProduct: 7维度评分引擎 (0-100)')
    console.log('    - observeProduct: 去重+阈值+活跃度检查')
    console.log('    - 推送阈值: ≥65分')
    console.log('  activityClock: 共享活跃度时间戳')
    console.log('    - touch(): ShoppingAgent记录用户活动')
    console.log('    - isUserActive(): MonitorAgent推送前检查')
    console.log('')

    // ─── 6. Overall Score ───
    console.log('╔══════════════════════════════════════════════╗')
    const scores = [parseFloat(intentAcc), parseFloat(searchAcc)]
    const overall = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    console.log(`  ║  综合评分: ${overall}%                              ║`)
    console.log(`  ║  意图识别: ${intentAcc}% | 搜索: ${searchAcc}%       ║`)
    console.log('  ║  架构简化: 4Agent→2Agent, -50%                    ║')
    console.log('  ╚══════════════════════════════════════════════╝')
    console.log('')

    expect(parseFloat(overall)).toBeGreaterThan(60)
  })
})
