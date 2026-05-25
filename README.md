# AI语音导购Agent — 快手直播间智能导购系统

多Agent协作架构的AI语音购物导购，模拟快手直播间的1v1私密语音咨询服务。

**在线体验：** https://wsd26.github.io/ai-shopping-agent/

---

## 项目背景

校招面试——快手AI产品经理岗位作品集。解决直播购物中用户不敢提问、打字不便、决策犹豫的痛点，通过AI语音导购提升转化率和用户体验。

## 多Agent架构

| Agent | 职责 |
|-------|------|
| Orchestrator 调度中心 | 意图分析、消息路由、冲突仲裁 |
| MonitorAgent 监控 | 商品观察、评分引擎、主动推送 |
| AdvisorAgent 导购 | 商品问答、目录搜索、个性化推荐 |
| ExecutorAgent 执行 | 购物车操作、任务委派、问题转交 |

4个Agent通过**AgentBus（事件总线）**通信，10种消息类型，15秒冲突冷却机制。

## 技术栈

React 19 + TypeScript + Vite 8 + Zustand 5 + Tailwind CSS 3 + Framer Motion + Web Speech API

## 核心功能

- 语音交互：按住说话 → AI语音回复 + 文字气泡 + 商品推荐卡片
- 意图识别：6种意图类型，正则+中文部分字匹配，100%准确率
- 评分引擎：10项评分规则（预算/品类/肤色/评分/销量/折扣），阈值≥65主动推送
- 商品搜索：中文部分字匹配，品类筛选，诚实返回"无结果"
- 主动监控：商品切换时自动分析匹配度，高匹配商品主动推送
- 语音加购：语音命令触发购物车操作

## 评测体系

169个测试用例，综合评分100%：

```
npm test
```

| 维度 | 用例数 | 通过率 |
|------|--------|--------|
| 意图识别 | 112+ | 100% |
| 商品搜索 | 14 | 100% |
| 监控评分 | 19 | 100% |
| Agent协作 | 22 | 100% |

评测报告：`evaluation-report.html`（浏览器打开后Ctrl+P可存为PDF）

## 本地运行

```bash
npm install
npm run dev        # 启动开发服务器 → http://localhost:5173
npm test           # 运行169个测试用例
npm run build      # 生产构建
```

## 项目结构

```
src/
├── agents/            # 4个Agent + AgentBus通信总线
├── components/        # React组件（直播间/导购面板/购物车/通用）
├── pages/             # 落地页 + 直播间页面
├── hooks/             # 语音识别/合成/导购流程/AI交互
├── store/             # Zustand状态管理（4个Store）
├── services/          # AI对话服务（本地/远程API）
├── constants/         # Mock商品数据 + 直播配置
├── types/             # TypeScript类型定义
└── __tests__/         # 评测用例（5个测试文件）
```

---

*快手AI产品经理面试作品 | 多Agent架构 | 语音交互 | 评测驱动*
