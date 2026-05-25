import type { ChatRequest, ChatResponse } from '../src/types/conversation'
import { sendChatMessageLocal } from '../src/services/aiService'

// ====== 通义千问 (Qwen) API 配置 ======
// 阿里云百炼 DashScope API
// 设置环境变量 DASHSCOPE_API_KEY 或在下方直接填入

const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-max'

// ====== System Prompt（通义千问优化版）======

const SYSTEM_PROMPT = `你是"小快"，一名专业的快手直播间AI购物导购Agent。你在直播间内为用户提供1对1的私密语音咨询服务。

## Agent核心能力
1. **主动监控**：持续观察直播间上新的商品，自动分析匹配度
2. **智能推荐**：基于用户画像（肤色、预算、偏好品类、尺码等）做个性化推荐
3. **任务执行**：接收用户委派的任务（如"帮我找最好的连衣裙"），持续执行
4. **商品解答**：解答用户对商品的疑问（材质、尺码、颜色、功效等）
5. **交易辅助**：帮用户加购、对比商品

## 回复规范
- 始终用中文回复，语气温暖、像朋友一样，适当使用"亲"
- 每条回复控制在2-3句话以内，适合语音播报
- 推荐商品时必须说明"为什么适合这位用户"
- 如果用户没说清楚需求，主动追问澄清
- 加购时回复轻松愉快，如"好嘞"、"没问题"

## 输出格式（必须严格返回合法JSON，不要包含markdown代码块标记）
{
  "text": "你的文字回复",
  "intent": "greeting | answer_question | recommend_product | compare_products | add_to_cart | clarify",
  "productCard": null 或 {
    "productId": "商品ID（保持原样）",
    "name": "商品名",
    "price": 价格数字,
    "imageUrl": "图片路径（保持原样）",
    "highlightReason": "为该用户推荐的具体理由",
    "tags": ["标签1", "标签2"]
  },
  "quickReplies": ["快捷回复1", "快捷回复2"],
  "action": null 或 {
    "type": "add_to_cart | none"
  }
}`

export async function POST(request: Request): Promise<Response> {
  try {
    const body: ChatRequest = await request.json()
    const { messages, currentProduct, userPreferences } = body

    // Build context
    const contextParts: string[] = [SYSTEM_PROMPT]

    if (currentProduct) {
      contextParts.push('\n## 当前直播间展示的商品')
      contextParts.push(`名称: ${currentProduct.name}`)
      contextParts.push(`直播价: ¥${currentProduct.price}（原价¥${currentProduct.originalPrice}）`)
      contextParts.push(`品类: ${currentProduct.category}`)
      contextParts.push(`属性详情: ${JSON.stringify(currentProduct.attributes)}`)
      contextParts.push(`描述: ${currentProduct.description}`)
      if (currentProduct.hostComment) {
        contextParts.push(`主播评价: ${currentProduct.hostComment}`)
      }
      contextParts.push(`销量: ${currentProduct.salesCount}件 | 评分: ${currentProduct.rating}分`)
      contextParts.push(`标签: ${currentProduct.tags.join('、')}`)
    }

    if (userPreferences && Object.keys(userPreferences).length > 0) {
      contextParts.push('\n## 用户画像（用于个性化推荐）')
      if (userPreferences.skinTone) contextParts.push(`肤色: ${userPreferences.skinTone}`)
      if (userPreferences.budgetRange) {
        const [min, max] = userPreferences.budgetRange
        contextParts.push(`预算: ¥${min}-¥${max}`)
      }
      if (userPreferences.preferredCategories?.length) {
        contextParts.push(`偏好品类: ${userPreferences.preferredCategories.join('、')}`)
      }
      if (userPreferences.sizes && Object.keys(userPreferences.sizes).length) {
        contextParts.push(`尺码信息: ${JSON.stringify(userPreferences.sizes)}`)
      }
      if (userPreferences.concerns?.length) {
        contextParts.push(`关注点: ${userPreferences.concerns.join('、')}`)
      }
    }

    const systemMessage = contextParts.join('\n')

    const chatMessages = [
      { role: 'system', content: systemMessage },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ]

    const apiKey = process.env.DASHSCOPE_API_KEY

    if (apiKey) {
      console.log(`[Qwen] Calling ${QWEN_MODEL}...`)

      const response = await fetch(QWEN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: QWEN_MODEL,
          messages: chatMessages,
          temperature: 0.7,
          max_tokens: 500,
          top_p: 0.9,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Qwen] API error ${response.status}:`, errorText)
        throw new Error(`Qwen API error: ${response.status}`)
      }

      const data = await response.json()
      const content: string = data.choices?.[0]?.message?.content || ''

      console.log(`[Qwen] Response:`, content.slice(0, 100))

      // Qwen可能返回带markdown代码块的JSON，需要提取
      let jsonStr = content.trim()
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7)
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3)
      }
      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3)
      }
      jsonStr = jsonStr.trim()

      try {
        const parsed = JSON.parse(jsonStr)
        return Response.json(parsed as ChatResponse)
      } catch {
        // JSON parse failed, treat as plain text response
        return Response.json({
          text: content,
          intent: 'answer_question',
          quickReplies: ['再说详细点', '加入购物车', '换一个推荐'],
        } as ChatResponse)
      }
    }

    // No API key: use local fallback
    console.log('[Qwen] No API key configured, using local fallback')
    return Response.json(await sendChatMessageLocal(body))

  } catch (error) {
    console.error('[Qwen] Error:', error)
    return Response.json(
      {
        text: '抱歉亲，网络开小差了，请稍后再试～',
        intent: 'answer_question',
      } as ChatResponse,
      { status: 200 }
    )
  }
}
