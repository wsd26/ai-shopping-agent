import type {
  ShoppingAgent,
  AgentInfo,
  AgentMessage,
  AgentState,
} from './types'
import type { ChatResponse } from '../types'
import { agentBus } from './AgentBus'

// ====== Executor Agent ======
// Action specialist. Responsibilities:
// 1. Execute cart actions (add to cart)
// 2. Handle task delegation (find_best, monitor_deals)
// 3. Push unanswered questions to host

export class ExecutorAgent implements ShoppingAgent {
  readonly info: AgentInfo = {
    id: 'exec-001',
    type: 'executor',
    name: '执行Agent',
    icon: '⚡',
    state: 'idle',
    description: '购物车操作、任务委派、问题转交主播',
  }

  private state: AgentState = 'idle'

  async handleMessage(msg: AgentMessage): Promise<Omit<AgentMessage, 'id' | 'timestamp'> | null> {
    this.state = 'busy'

    const { userText, product, userPreferences } = msg.payload
    const text = userText || ''
    const prefs = userPreferences || {}

    let response: ChatResponse

    // Task delegation: "帮我找" / "帮我盯着"
    if (/帮我找|找最好的|帮我挑/.test(text)) {
      response = {
        text: `好的亲！我会帮您持续关注直播间的商品，根据您的${prefs.skinTone ? prefs.skinTone + '肤色、' : ''}${prefs.preferredCategories?.length ? '偏好' + prefs.preferredCategories.join('、') : '购物偏好'}，自动筛选最合适的。有好物立刻通知您！`,
        intent: 'greeting',
        quickReplies: ['现在有什么商品？', '停止自动推荐'],
      }
    } else if (/帮我盯着|蹲|监控/.test(text)) {
      response = {
        text: '收到！已开启"直播监控模式"，我会持续观察每个新上商品。一旦发现匹配您画像的好物，第一时间弹窗提醒您～',
        intent: 'greeting',
        quickReplies: ['目前在监控什么？', '停止监控'],
      }
    } else if (/加入购物车|加到购物车|加购物车|加购|买|下单|就要/.test(text)) {
      if (!product) {
        response = {
          text: '亲，当前没有在展示商品哦～我会帮您盯着，有合适的立马提醒！',
          intent: 'clarify',
        }
      } else {
        response = {
          text: `好嘞！已帮您把"${product.name}"加入购物车，直播价¥${product.price}，比原价省了¥${product.originalPrice - product.price}！`,
          intent: 'add_to_cart',
          productCard: {
            productId: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            highlightReason: '您主动要求加购',
            tags: product.tags.slice(0, 3),
          },
          quickReplies: ['去购物车看看', '继续逛', '还有什么推荐？'],
          action: { type: 'add_to_cart', payload: { productId: product.id } },
        }
      }
    } else {
      response = {
        text: '亲，您想要做什么呢？可以说"帮我找XX"、"加入购物车"或直接问我问题～',
        intent: 'clarify',
        quickReplies: ['帮我盯着直播间', '现在有什么商品？'],
      }
    }

    this.state = 'idle'

    await agentBus.dispatch({
      from: 'executor',
      to: 'ui',
      type: 'agent_response',
      payload: { response, reasoning: `ExecutorAgent: command`, product: product || undefined },
      priority: 'normal',
    })

    return null
  }

  getState(): AgentState {
    return this.state
  }

  reset(): void {
    this.state = 'idle'
  }
}

export const executorAgent = new ExecutorAgent()
