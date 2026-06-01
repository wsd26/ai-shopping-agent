/**
 * DeepSeek API service — shared by Vite dev plugin and Vercel serverless function.
 *
 * Takes ChatRequest (messages + context) → builds system prompt + product catalog
 * → calls DeepSeek API → parses structured JSON response → returns ChatResponse.
 */
import type { ChatRequest, ChatResponse } from '../types/conversation'
import { mockProducts } from '../constants/products'

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEFAULT_MODEL = 'deepseek-chat'

// ====== System Prompt ======

const SYSTEM_PROMPT = `你是"小快"，一个直播间AI语音导购。你在直播间内为用户提供1对1私密语音咨询服务。

## 核心规则（必须严格遵守，每条都不可违反）

**规则1 — 当前商品自动关联**:
如果"当前直播商品"不为空，用户说的"这个""这款""它""材质""价格""多少钱""包邮"等**一律理解为在问当前商品**。
示例: 用户说"这个什么材质"且当前商品是碎花连衣裙 → 回答碎花连衣裙的材质是雪纺。

**规则2 — 加购必须返回action**:
用户说"加入购物车"/"加购"/"帮我加"时:
- 有当前商品 → **必须**返回action:{"type":"add_to_cart","productId":"当前商品ID"}，text中确认加购
- 无当前商品 → 追问要哪款，action为null

**规则3 — 数据原样复制**:
productCard中的productId/name/price必须**原样照抄**下方商品数据，绝不修改任何数字。
price必须是纯数字（如299），不能加¥符号或文字。

**规则4 — 诚实原则**:
不知道就诚实说不知道，绝不编造商品信息。

## 送礼推荐规则
用户问"送XX什么礼物"且没有指定具体商品时，按收礼人优先推荐：
- 妈妈/长辈 → 优先精华液(p004)或大枣(p006)，理由"实用贴心"
- 女朋友/老婆 → 优先连衣裙(p001)或小方包(p003)，理由"精致浪漫"
- 男朋友/老公 → 优先耳机(p008)或运动鞋(p005)，理由"数码运动潮品"
- 闺蜜/朋友 → 优先面膜(p002)或T恤(p007)，理由"实用好看"
如果用户提到了具体商品（如"精华液适合送女友吗"），就正常评价该商品是否适合，不需要套用上面的优先规则。

## 回复规范
- 用中文回复，语气亲和接地气，可适当使用"亲"
- 每条回复控制在80字以内，适合TTS语音播报
- 推荐商品时给出具体推荐理由
- 问"有没有X"时在可用商品列表查找，有就推荐没有就诚实告知

## 输出格式
只返回纯JSON，不要加markdown代码块标记:
{"text":"回复","intent":"greeting|answer_question|recommend_product|add_to_cart|clarify","productCard":null,"quickReplies":["快捷回复"],"action":null}
productCard: {"productId":"原样复制","name":"原样复制","price":数字,"imageUrl":"","highlightReason":"推荐理由","tags":["标签"]}
action: null或{"type":"add_to_cart","productId":"商品ID"}`

// ====== Build context for LLM ======

export function buildLLMMessages(request: ChatRequest) {
  const { messages, currentProduct, userPreferences } = request
  const contextParts: string[] = [SYSTEM_PROMPT]

  // Current product
  if (currentProduct) {
    contextParts.push('\n## 当前直播商品')
    contextParts.push(`ID: ${currentProduct.id}`)
    contextParts.push(`名称: ${currentProduct.name}`)
    contextParts.push(`价格: ¥${currentProduct.price}（原价¥${currentProduct.originalPrice}，${Math.round((1 - currentProduct.price / currentProduct.originalPrice) * 100)}%折扣）`)
    contextParts.push(`品类: ${currentProduct.category}`)
    contextParts.push(`材质: ${currentProduct.attributes.material || '无'}`)
    contextParts.push(`尺码: ${(currentProduct.attributes.sizes || []).join('、') || '均码'}`)
    contextParts.push(`颜色: ${(currentProduct.attributes.colors || []).join('、') || '无'}`)
    contextParts.push(`描述: ${currentProduct.description}`)
    if (currentProduct.hostComment) {
      contextParts.push(`主播评价: ${currentProduct.hostComment}`)
    }
    contextParts.push(`销量: ${currentProduct.salesCount}件 | 评分: ★${currentProduct.rating}`)
    contextParts.push(`标签: ${currentProduct.tags.join('、')}`)
  }

  // Full product catalog for search
  contextParts.push('\n## 可用商品列表（搜索和推荐时从这里选）')
  for (const p of mockProducts) {
    contextParts.push(`- [${p.id}] ${p.name} | ¥${p.price} | ${p.category} | ${p.tags.join('/')} | ${p.description.slice(0, 40)}`)
  }

  // User preferences
  if (userPreferences && Object.keys(userPreferences).length > 0) {
    contextParts.push('\n## 用户画像')
    if (userPreferences.skinTone) contextParts.push(`肤色: ${userPreferences.skinTone}`)
    if (userPreferences.budgetRange) {
      contextParts.push(`预算: ¥${userPreferences.budgetRange[0]}-¥${userPreferences.budgetRange[1]}`)
    }
    if (userPreferences.preferredCategories?.length) {
      contextParts.push(`偏好品类: ${userPreferences.preferredCategories.join('、')}`)
    }
    if (userPreferences.sizes && Object.keys(userPreferences.sizes).length) {
      contextParts.push(`尺码: ${JSON.stringify(userPreferences.sizes)}`)
    }
    if (userPreferences.concerns?.length) {
      contextParts.push(`关注点: ${userPreferences.concerns.join('、')}`)
    }
  }

  const systemMsg = contextParts.join('\n')

  return [
    { role: 'system', content: systemMsg },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ]
}

// ====== Call DeepSeek API ======

export async function callDeepSeek(chatMessages: { role: string; content: string }[], apiKey: string, model?: string): Promise<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || DEFAULT_MODEL,
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 600,
      top_p: 0.9,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`DeepSeek API error ${response.status}: ${errorText.slice(0, 200)}`)
  }

  const data: any = await response.json()
  return data.choices?.[0]?.message?.content || ''
}

// ====== Parse LLM response → ChatResponse ======

export function parseLLMResponse(content: string): ChatResponse {
  // Strip markdown code fences if present
  let jsonStr = content.trim()
  if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
  else if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
  if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)
  jsonStr = jsonStr.trim()

  try {
    const parsed = JSON.parse(jsonStr)
    return {
      text: parsed.text || '亲，有什么想了解的呢？',
      intent: parsed.intent || 'clarify',
      productCard: parsed.productCard || undefined,
      quickReplies: parsed.quickReplies || ['看看当前商品', '帮我推荐', '加入购物车'],
      action: parsed.action || undefined,
    }
  } catch {
    // JSON parse failed — return raw content as plain text
    return {
      text: content.slice(0, 200),
      intent: 'answer_question',
      quickReplies: ['再说详细点', '加入购物车', '换一个推荐'],
    }
  }
}

// ====== Full pipeline: request → LLM → ChatResponse ======

export async function processChat(request: ChatRequest, apiKey: string, model?: string): Promise<ChatResponse> {
  const messages = buildLLMMessages(request)
  const content = await callDeepSeek(messages, apiKey, model)
  return parseLLMResponse(content)
}
