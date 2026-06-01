# AI语音导购Agent — 直播间智能购物助手

1v1私密语音导购，模拟直播间场景下的AI购物咨询体验。DeepSeek LLM + 规则引擎兜底 + 代码安全网，三层混合架构。

**在线体验：** https://wsd26.github.io/ai-shopping-agent/

---

## 架构

**1+1 Agent 模型** — 从最初4-Agent重构而来，代码量-46%，每次交互跳转-83%。

| 组件 | 职责 |
|------|------|
| **ShoppingAgent** | 统一对话Agent：意图理解→回复生成→动作提取，一次函数调用完成 |
| **MonitorAgent** | 商品观察Agent：事件驱动，7维度评分引擎，独立并行运行 |
| **activityClock** | 共享活跃度时间戳（10行），替代AgentBus的冲突检测 |

**LLM混合架构：**

```
用户提问 → ShoppingAgent.processLLM()
  ├─ 成功 → DeepSeek API → 结构化JSON → 安全网校正 → 渲染
  └─ 失败 → 规则引擎兜底（6种意图 + 13种回复模板）
```

**三层安全网：** 价格校正 / 加购补全 / 送礼确定性映射 — 将LLM幻觉率降至零。

## 技术栈

React 19 + TypeScript + Vite 8 + Zustand 5 + Tailwind CSS 3 + Framer Motion + Web Speech API + DeepSeek LLM

## 核心功能

- **语音交互：** 按住说话 → AI语音回复 + 文字气泡 + 商品推荐卡片，支持打断
- **LLM智能问答：** DeepSeek处理送礼推荐、场景化需求、多轮对话等复杂语义
- **规则引擎兜底：** LLM不可用时自动降级，保证100%可用
- **主动推荐：** MonitorAgent 7维度评分（预算/品类/肤色/评分/销量/折扣），阈值≥65推送，10秒对话冷却
- **语音加购：** 语音命令触发购物车操作，安全网保证意图不丢失

## 本地运行

```bash
npm install
cp .env.example .env.local   # 编辑填入 DeepSeek API Key（可选，不填则使用规则引擎）
npm run dev                   # http://localhost:5173/ai-shopping-agent/
npm test                      # 168个测试用例
npm run build                 # 生产构建
```

> 需要 Chrome 浏览器以获得最佳 Web Speech API 中文语音识别体验。

## 项目结构

```
src/
├── agents/            # ShoppingAgent + MonitorAgent + activityClock
├── components/        # React组件（直播间/导购面板/购物车/通用）
├── pages/             # 落地页 + 直播间页面
├── hooks/             # 语音识别/合成/导购流程
├── store/             # Zustand状态管理（4个Store）
├── services/          # DeepSeek API服务 + LLM上下文构建
├── utils/             # TTS语音配置（统一温柔女声）
├── constants/         # Mock商品数据(8个) + 直播配置
├── types/             # TypeScript类型定义
└── __tests__/         # 168个测试用例（5个文件）
api/
└── chat.ts            # Vercel Serverless Function（生产环境LLM代理）
```

---

*AI产品经理校招作品 | 1+1 Agent架构 | LLM混合方案 | 语音交互*
