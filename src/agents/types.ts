// Simplified types for V2 architecture (1+1 Agent model).
// Removed: AgentBus message protocol, multi-agent routing types.

import type { Product } from '../types'

export interface IntentResult {
  type: 'product_search' | 'current_product' | 'specific_product' | 'command' | 'general' | 'greeting'
  searchKeywords: string[]
  targetCategory: string | null
  matchedProduct?: Product
}

// Re-export ShoppingAgent types for convenience
export type { ShoppingInput, ShoppingOutput, ShoppingAction } from './ShoppingAgent'
export type { ObserveResult } from './MonitorAgent'
