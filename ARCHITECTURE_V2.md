# AI语音导购 — 架构重构方案 V2

> 从4-Agent → 1+1 Agent的简化设计 | 2026年5月

---

## 一、现状诊断

### 1.1 当前架构

```
                        ┌──────────┐
                        │ AgentBus │ (单例消息总线)
                        └──┬─┬─┬──┘
                           │ │ │
              ┌────────────┼─┼─┼────────────┐
              ▼            ▼ ▼ ▼            │
        ┌───────────┐   ┌──────────┐   ┌────┴──────┐
        │Orchestrator│   │ Advisor  │   │ Executor  │
        │ 意图分析+路由│──▶│ 回复生成  │   │ 动作执行   │
        └───────────┘   └──────────┘   └───────────┘
              ▲
              │ monitor_alert
        ┌─────┴─────┐
        │  Monitor  │ (独立的商品观察者)
        └───────────┘

用户输入路径: UI → Bus → Orchestrator → Bus → Advisor/Executor → Bus → UI
              ├─ 序列化1 ─┤  ├─ 序列化2 ─┤  ├─ 序列化3 ─┤
              
Monitor推送路径: Product Switch → Monitor → Bus → Orchestrator(冲突检查) → Bus → UI
                                       ├─ 序列化 ─┤  ├─ 路由 ─┤  ├─ 序列化 ─┤
```

### 1.2 核心问题

**问题1: 串行链路被强行异步化**

Orchestrator → Advisor → Executor 本质是一个连续的推理过程（意图分类→回复生成→动作映射），三者之间没有任何并行化空间。拆成三个Agent后，每一步都要经过AgentBus的序列化/反序列化、路由匹配、类型检查。这不是解耦，是凭空增加了延迟。

**问题2: 上下文重复传递**

Orchestrator把 `userText + currentProduct + userPreferences + messages` 传给Advisor，Advisor再用几乎相同的上下文生成回复。这些信息天然属于同一个推理过程，不需要在不同的Agent间"搬运"。

**问题3: AgentBus过度设计**

当前AgentBus实现了：消息路由、类型订阅、冲突检测、优先级队列、日志记录。而实际需要的只是一个"Monitor推送时检查用户是否活跃"的简单互斥机制——一个共享时间戳就够了。

**问题4: Monitor和其他Agent性质不同**

Monitor是事件驱动的（商品切换）、持续运行的、有自己内部状态的。其他三者是请求驱动的（用户说话）、一次性执行的、无状态的。把性质完全不同的组件放在同一个AgentBus框架下，增加了概念复杂度。

---

## 二、新架构设计

### 2.1 总体方案: 1+1 Agent

```
┌──────────────────────────────────────────────────┐
│                                                  │
│   用户输入 (语音/文字)                              │
│     │                                            │
│     ▼                                            │
│   ┌──────────────────────┐                       │
│   │   ShoppingAgent      │   (统一对话Agent)       │
│   │                      │                       │
│   │   意图分析  (regex/L) │  ← 同步，无跳转          │
│   │     ↓                │                       │
│   │   回复生成  (模板/L)  │  ← 共享上下文             │
│   │     ↓                │                       │
│   │   动作提取  (+购物车) │  ← 同次返回               │
│   │                      │                       │
│   │   返回: { text,       │                       │
│   │     productCard?,     │                       │
│   │     quickReplies?,    │                       │
│   │     action? }         │                       │
│   └──────────────────────┘                       │
│     │                                            │
│     ▼                                            │
│   UI层处理: 渲染气泡 + TTS播放 + 执行action          │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│   商品切换事件                                     │
│     │                                            │
│     ▼                                            │
│   ┌──────────────────────┐     共享时间戳          │
│   │   MonitorAgent       │◀──────────────────┐   │
│   │                      │                   │   │
│   │   7维度评分引擎        │    lastUserActivityTime │
│   │   去重 & 阈值检查      │                   │   │
│   │   活跃度检查 (>3s)    │── 由ShoppingAgent更新 ─┘   │
│   │                      │                       │
│   │   推送决策:           │                       │
│   │   score≥65 且 用户空闲 → 推送到UI              │
│   │   score≥65 且 用户活跃 → 延迟3s→重试           │
│   │   score<65           → 不推送                 │
│   └──────────────────────┘                       │
│     │                                            │
│     ▼                                            │
│   UI层处理: 渲染推送卡片 + TTS语音播报              │
│                                                  │
└──────────────────────────────────────────────────┘
```

### 2.2 组件职责

**ShoppingAgent（统一对话Agent）**

| 维度 | 说明 |
|------|------|
| 输入 | `userText, currentProduct, userPreferences, messages(最近3轮)` |
| 处理 | 意图分析 → 回复生成 → 动作提取，三步在同一个函数调用内完成 |
| 输出 | `{ text, intent, productCard?, quickReplies?, action? }` |
| 运行方式 | 同步/异步单次调用（请求-响应模式） |
| 状态 | 无内部状态，所有上下文由调用方传入 |

**MonitorAgent（商品观察Agent）**

| 维度 | 说明 |
|------|------|
| 输入 | `observeProduct(product, userPreferences, productIndex)` |
| 处理 | 7维度评分 → 阈值检查 → 活跃度检查 → 推送决策 |
| 输出 | `{ shouldPush: bool, matchScore: number, reason?: string, productCard?: ProductCard }` |
| 运行方式 | 事件驱动（商品切换时由UI层调用） |
| 状态 | 内部维护: `observationCount`, `lastObservedProductId`, `pushedProductIds: Set` |

**sharedActivityClock（共享活跃度时间戳）**

| 维度 | 说明 |
|------|------|
| 实现 | `let lastUserActivityTime = Date.now()` 放在一个共享模块中 |
| 更新方 | ShoppingAgent 每次处理用户输入时更新 |
| 读取方 | MonitorAgent 推送前检查 |
| 阈值 | `Date.now() - lastUserActivityTime > 3000` (3秒) |

### 2.3 数据流对比

**重构前 (一次商品咨询)**:
```
User says "这个什么材质"
  → useAIShoppingGuide (组装上下文)
    → AgentBus.dispatch({ from:'ui', to:'orchestrator', type:'user_input', payload... })
      → OrchestratorAgent.handleMessage() (反序列化 → 正则分析 → 路由决策)
        → AgentBus.dispatch({ from:'orchestrator', to:'advisor', type:'product_query', payload... })
          → AdvisorAgent.handleMessage() (反序列化 → 意图匹配 → 回复生成)
            → AgentBus.dispatch({ from:'advisor', to:'ui', type:'agent_response', payload... })
              → useAIShoppingGuide.onUI (反序列化 → 渲染)

总计: 6次跳转 (3次dispatch + 3次handleMessage)
      3次序列化/反序列化
      2个Agent间上下文搬运
```

**重构后 (同一次商品咨询)**:
```
User says "这个什么材质"
  → ShoppingAgent.process({
      userText: "这个什么材质",
      currentProduct: {...},
      userPreferences: {...},
      recentMessages: [...]
    })
      → 意图分析: current_product_query + 属性:材质
      → 回复生成: "这款是雪纺面料的..."
      → 返回 { text, productCard, quickReplies }
    → UI直接消费返回值

总计: 1次函数调用
      0次序列化
      0次上下文搬运
```

**重构前 (Monitor推送)**:
```
Product Switch
  → MonitorAgent.observeProduct() (评分 → dispatch monitor_alert)
    → AgentBus.dispatch({ to:'orchestrator' })
      → OrchestratorAgent (冲突检查 → 通过后dispatch)
        → AgentBus.dispatch({ to:'ui' })
          → UI消费

总计: 2次dispatch + 1次直接调用
```

**重构后 (Monitor推送)**:
```
Product Switch
  → MonitorAgent.observeProduct()
    → 评分(120分制) → 检查阈值(≥65) → 检查活跃度(>3s) → 推送决策
    → 返回 { shouldPush: true, productCard, matchScore, reason }
    → UI直接消费返回值

总计: 1次函数调用
```

### 2.4 V1规则引擎 vs 未来LLM的适配

```
规则引擎版 (V1):
  ShoppingAgent.process = (input) => {
    const intent = this.classifyIntent(input.userText)     // regex
    const response = this.generateResponse(intent, input)  // template matching
    const action = this.extractAction(intent, input)       // command regex
    return { ...response, action }
  }

LLM版 (V2):
  ShoppingAgent.process = async (input) => {
    const completion = await llm.chat({
      system: SYSTEM_PROMPT,
      messages: buildMessages(input),
      functions: [searchProduct, addToCart, escalateToHost],
      temperature: 0.3
    })
    return parseStructuredResponse(completion)
  }
```

同一个ShoppingAgent接口，切换实现即可。不需要修改调用方、不需要调整AgentBus、不需要修改消息格式。

---

## 三、代码结构

### 3.1 新文件结构

```
src/
├── agents/
│   ├── ShoppingAgent.ts       ← 统一对话Agent (融合原Orchestrator+Advisor+Executor)
│   ├── MonitorAgent.ts        ← 商品观察Agent (保持, 简化输出)
│   └── activityClock.ts       ← 共享活跃度时间戳 (替代AgentBus的冲突检测)
├── hooks/
│   └── useAIShoppingGuide.ts  ← 简化为: 调用ShoppingAgent + 调用MonitorAgent
└── store/
    └── useConversationStore.ts ← 不变 (仍管理消息/状态/ui)
```

**删除的**:
- `src/agents/OrchestratorAgent.ts`
- `src/agents/AdvisorAgent.ts`
- `src/agents/ExecutorAgent.ts`
- `src/agents/AgentBus.ts`
- `src/agents/types.ts` (缩减为简单类型)
- `src/agents/index.ts` (不再需要初始化注册)

### 3.2 ShoppingAgent 接口设计

```typescript
interface ShoppingInput {
  userText: string
  currentProduct: Product | null
  userPreferences: UserPreferences
  recentMessages: Message[]       // 最近3轮对话
}

interface ShoppingOutput {
  text: string                    // AI回复文本 (必含)
  intent: IntentType              // 意图类型
  productCard?: ProductCardData   // 可选商品推荐卡片
  productComparison?: ProductComparisonData  // 可选对比卡片
  quickReplies?: string[]         // 快捷回复建议
  action?: ShoppingAction         // 可选动作
}

type ShoppingAction =
  | { type: 'add_to_cart'; productId: string }
  | { type: 'escalate_to_host'; question: string }
  | { type: 'toggle_monitor' }

class ShoppingAgent {
  process(input: ShoppingInput): ShoppingOutput
  // 内部: 意图分析 → 回复生成 → 动作提取 (串联, 无跳转)
}
```

### 3.3 MonitorAgent 接口设计 (简化)

```typescript
interface ObserveInput {
  product: Product
  preferences: UserPreferences
  productIndex: number
}

interface ObserveOutput {
  shouldPush: boolean
  matchScore: number
  reason?: string              // 推送原因, 如"预算匹配+品类偏好"
  productCard?: ProductCardData
}

class MonitorAgent {
  observeProduct(input: ObserveInput): ObserveOutput
  // 内部: 评分 → 阈值 → 活跃度检查 → 推送决策
  // 读取 activityClock.lastUserActivityTime 做冲突检测
  // 维护内部状态: observationCount, lastObservedId, pushedIds
}
```

### 3.4 activityClock (共享活跃度时间戳)

```typescript
// src/agents/activityClock.ts
// 替代AgentBus的冲突检测功能，极简设计

let lastUserActivityTime = 0
const ACTIVITY_COOLDOWN_MS = 3000   // 用户活跃后3秒内不推送

export const activityClock = {
  /** ShoppingAgent每次处理用户输入时调用 */
  touch() {
    lastUserActivityTime = Date.now()
  },

  /** MonitorAgent推送前调用 */
  isUserActive(): boolean {
    return Date.now() - lastUserActivityTime < ACTIVITY_COOLDOWN_MS
  },

  /** 距离上次用户活动的时间(ms) */
  idleTime(): number {
    return Date.now() - lastUserActivityTime
  }
}
```

---

## 四、与当前代码的迁移对照

### 4.1 核心逻辑迁移

| 当前代码位置 | 逻辑 | 迁移到 |
|-------------|------|--------|
| OrchestratorAgent.analyzeIntent() | 6种意图的正则分类 | ShoppingAgent.classifyIntent() (private) |
| OrchestratorAgent.getSearchPatterns() | 品类搜索模式 | ShoppingAgent.searchPatterns (private) |
| OrchestratorAgent.hasRecentUserInteraction() | 冲突检测 | activityClock.isUserActive() |
| AdvisorAgent.handleMessage() | 13个意图→回复分支 | ShoppingAgent.generateResponse() (private) |
| AdvisorAgent.searchProductByKeyword() | 商品搜索 | ShoppingAgent.searchProduct() (private) |
| AdvisorAgent.findBestProductForCategory() | 分类回退搜索 | ShoppingAgent.findBestForCategory() (private) |
| ExecutorAgent.handleMessage() | 3个命令→动作映射 | ShoppingAgent.extractAction() (private) |
| MonitorAgent.observeProduct() | 7维度评分+去重 | MonitorAgent.observeProduct() (保持, 简化返回值) |
| AgentBus | 消息路由/序列化 | 删除。ShoppingAgent的返回值直接被UI消费 |
| AgentBus.pendingConflicts | Monitor推送延迟队列 | MonitorAgent内部维护, 用setTimeout实现延迟重试 |

### 4.2 useAIShoppingGuide 简化

```typescript
// 重构前 (~220行)
function handleUserVoice(text: string) {
  const message = buildMessage(...)
  agentBus.dispatch({ to: 'orchestrator', type: 'user_input', payload: message })
  agentBus.dispatch({ to: 'orchestrator', type: 'conflict_resolve' })  // 额外的冲突清理
}
agentBus.onUI((msg) => { /* 处理agent_response, 购物车, 推送等 */ })

// 重构后 (~80行)
function handleUserVoice(text: string) {
  activityClock.touch()                                             // 记录活跃时间
  const output = shoppingAgent.process({                            // 一次调用
    userText: text,
    currentProduct,
    userPreferences,
    recentMessages: messages.slice(-6)                              // 最近3轮
  })
  
  // 直接消费返回值
  addMessage({ role: 'ai', text: output.text, productCard: output.productCard, ... })
  if (output.action?.type === 'add_to_cart') cartStore.addItem(output.action.productId)
  ttsSpeak(output.text)
}

function handleProductSwitch(product: Product, index: number) {
  const result = monitorAgent.observeProduct({ product, preferences: userStore.preferences, productIndex: index })
  if (result.shouldPush) {
    addMessage({ role: 'ai', type: 'monitor_push', text: result.reason, productCard: result.productCard })
    ttsSpeak(`亲，${result.reason}`)
  } else if (result.matchScore >= 65) {
    // 用户活跃导致延迟, 3秒后重试
    setTimeout(() => handleProductSwitch(product, index), 3000)
  }
}
```

---

## 五、收益评估

### 5.1 量化对比

| 维度 | 4-Agent方案 | 1+1方案 | 改善 |
|------|------------|---------|------|
| 用户输入处理跳转数 | 6次 (3 dispatch + 3 handler) | 1次函数调用 | **-83%** |
| 序列化/反序列化次数 | 3次 (AgentMessage payload) | 0次 | **-100%** |
| Monitor推送跳转数 | 3次 (observe + dispatch×2) | 1次函数调用 | **-67%** |
| 任务类型数 (types.ts) | 10种AgentMessageType | 0种 (不需要) | **-100%** |
| Agent注册/初始化 | AgentBus.register ×4 | 无注册 (new即可) | **-100%** |
| 文件数 (agents/) | 8个文件 | 3个文件 | **-62%** |
| 总代码行数 (agents/) | ~650行 | ~350行 | **-46%** |

### 5.2 定性收益

- **可读性**: ShoppingAgent.process() 内部是线性代码，意图→回复→动作三步一目了然。不需要在不同文件间跳跃追踪消息流
- **可测试性**: ShoppingAgent 是纯函数 (input → output)，不依赖AgentBus、不依赖Zustand Store。单元测试就是 `assert(agent.process(input).text === expected)`
- **可扩展性**: 接入LLM时，只需替换ShoppingAgent.process()的内部实现，接口不变。不需要修改AgentBus、不需要调整消息格式、不需要重新注册Agent
- **可调试性**: 一个console.log(input, output)就能看到完整链路，而不是在4个Agent + AgentBus之间追踪dispatch日志

### 5.3 风险

| 风险 | 缓解 |
|------|------|
| ShoppingAgent 变成"God Object" | 内部按方法拆分 (classifyIntent / generateResponse / extractAction)，职责清晰、可单独测试 |
| MonitorAgent 延迟重试没有AgentBus保证 | 用setTimeout + 递归实现，比AgentBus的pendingConflicts队列更简单且更可控 |
| 未来需要增加新Agent类型 | MonitorAgent的模式已验证"独立职责+事件驱动 = 适合独立Agent"。新Agent满足此标准时再添加，不为"可能的需求"提前设计 |

---

## 六、结论

**当前4-Agent架构的本质问题**: 把同一对话管线的三个串行步骤（意图→回复→动作）伪装成了三个独立Agent，用AgentBus制造了"解耦"的假象。实际效果是增加了6次跳转、3次序列化、2次上下文搬运，没有任何并行化收益。

**1+1方案**: 统一对话Agent处理请求驱动的串行链路，MonitorAgent处理事件驱动的并行观察。共享活跃度时间戳替代AgentBus的冲突检测。代码量减少46%，跳转次数减少83%。

**核心原则**: 多Agent只适用于三类场景——有并行化空间、有独立的上下文边界、有根本不同的能力需求。三者都不满足时，单一Agent是最好的Agent。
