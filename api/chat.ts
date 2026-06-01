/**
 * Vercel Serverless Function — POST /api/chat
 *
 * Receives ChatRequest from the frontend, builds LLM context with system prompt +
 * product catalog + user preferences, calls DeepSeek API, parses structured JSON
 * response, returns ChatResponse.
 */
import type { ChatRequest, ChatResponse } from '../src/types/conversation'
import { buildLLMMessages, callDeepSeek, parseLLMResponse } from '../src/services/deepseekApi'

export async function POST(request: Request): Promise<Response> {
  try {
    const body: ChatRequest = await request.json()

    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      // No API key → fallback to regex engine via the frontend
      return Response.json({
        text: '',
        intent: 'clarify',
        _fallback: true,
      } as ChatResponse & { _fallback: boolean })
    }

    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
    const messages = buildLLMMessages(body)
    console.log(`[DeepSeek] Calling ${model}...`)

    const content = await callDeepSeek(messages, apiKey, model)
    console.log(`[DeepSeek] Response:`, content.slice(0, 120))

    const result = parseLLMResponse(content)
    return Response.json(result)
  } catch (error: any) {
    console.error('[DeepSeek] Error:', error.message)
    return Response.json(
      {
        text: '',
        intent: 'clarify',
        _fallback: true,
      } as ChatResponse & { _fallback: boolean },
      { status: 200 }
    )
  }
}
