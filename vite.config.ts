/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { IncomingMessage, ServerResponse } from 'http'

// Load .env.local directly (Vite's loadEnv covers .env but middleware needs explicit)
function loadLocalEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  try {
    const content = readFileSync(resolve(__dirname, '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex).trim()
        const value = trimmed.slice(eqIndex + 1).trim()
        env[key] = value
      }
    }
  } catch { /* file may not exist */ }
  return env
}

// Parse JSON body from incoming request
function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk: string) => (body += chunk))
    req.on('end', () => resolve(body))
  })
}

// Vite dev server plugin: handle /api/chat locally by forwarding to DeepSeek
function deepseekDevPlugin() {
  return {
    name: 'deepseek-dev-api',
    configureServer(server: any) {
      server.middlewares.use('/api/chat', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.writeHead(405).end('Method Not Allowed')
          return
        }

        try {
          const body = await parseBody(req)
          const request = JSON.parse(body)

          // Build messages from request
          const { buildLLMMessages, callDeepSeek, parseLLMResponse } = await import(
            './src/services/deepseekApi'
          )
          const localEnv = loadLocalEnv()
          const apiKey = process.env.DEEPSEEK_API_KEY || localEnv.DEEPSEEK_API_KEY
          if (!apiKey) {
            throw new Error('DEEPSEEK_API_KEY not set in .env.local')
          }

          const messages = buildLLMMessages(request)
          const model = process.env.DEEPSEEK_MODEL || localEnv.DEEPSEEK_MODEL || 'deepseek-chat'
          const content = await callDeepSeek(messages, apiKey, model)
          const result = parseLLMResponse(content)

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result))
        } catch (err: any) {
          console.error('[Dev API] Error:', err.message)
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              text: '',
              intent: 'clarify',
              _fallback: true,
            })
          )
        }
      })
    },
  }
}

export default defineConfig({
  base: '/ai-shopping-agent/',
  plugins: [react(), deepseekDevPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'node',
  },
})
