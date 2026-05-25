import type { ChatResponse, Product, UserPreferences } from '../types'

// ====== Agent Identity ======

export type AgentType = 'orchestrator' | 'monitor' | 'advisor' | 'executor' | 'ui'
export type AgentState = 'idle' | 'busy' | 'error'

export interface AgentInfo {
  id: string
  type: AgentType
  name: string
  icon: string
  state: AgentState
  description: string
}

// ====== Agent Message Protocol ======

export type AgentMessageType =
  | 'user_input'          // User speaks → Orchestrator
  | 'intent_result'       // Orchestrator analysis complete → routes to specialist
  | 'product_query'       // → Advisor
  | 'product_search'      // → Advisor
  | 'command_request'     // → Executor
  | 'monitor_alert'       // Monitor → Orchestrator (proactive push)
  | 'task_delegate'       // Orchestrator → Executor
  | 'agent_response'      // Any agent → UI
  | 'conflict_resolve'    // Orchestrator arbitration
  | 'status_update'       // Agent → Bus (for UI display)

export interface AgentMessage {
  id: string
  from: AgentType
  to: AgentType | 'bus' | 'ui'
  type: AgentMessageType
  payload: AgentMessagePayload
  timestamp: number
  priority: 'high' | 'normal' | 'low'
}

export interface AgentMessagePayload {
  // User input
  userText?: string
  // Intent analysis result
  intent?: IntentResult
  // Product data
  product?: Product
  products?: Product[]
  currentProduct?: Product | null
  // User context
  userPreferences?: UserPreferences
  // Response
  response?: ChatResponse
  // Monitor scoring
  matchScore?: number
  shouldNotify?: boolean
  // Task
  task?: AgentTask
  // Search
  searchKeywords?: string[]
  targetCategory?: string | null
  // Metadata
  reasoning?: string
  conversationId?: string
  messages?: { role: 'user' | 'assistant'; content: string; timestamp: number }[]
}

// ====== Intent Analysis ======

export interface IntentResult {
  type: 'product_search' | 'current_product' | 'specific_product' | 'command' | 'general' | 'greeting'
  searchKeywords: string[]
  targetCategory: string | null
  matchedProduct?: Product
}

// ====== Agent Task ======

export type AgentTaskType = 'find_best' | 'monitor_deals' | 'compare_all' | 'auto_cart'

export interface AgentTask {
  type: AgentTaskType
  description: string
  criteria: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result?: string
  assignedTo: AgentType
}

// ====== Agent Interface ======

export interface ShoppingAgent {
  readonly info: AgentInfo
  handleMessage(msg: AgentMessage): Promise<Omit<AgentMessage, 'id' | 'timestamp'> | null>
  getState(): AgentState
  reset(): void
}

// ====== Bus Events ======

export type BusEventHandler = (msg: AgentMessage) => void
