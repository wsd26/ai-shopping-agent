import type { Product } from './product'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  type: 'text' | 'voice'
  timestamp: number
  productCard?: ProductCardData
  quickReplies?: string[]
  isAgentPush?: boolean
  feedback?: 'up' | 'down'
}

export interface ProductCardData {
  productId: string
  name: string
  price: number
  imageUrl: string
  highlightReason: string
  tags: string[]
}

export interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string; timestamp: number }[]
  currentProduct: Product | null
  userPreferences: UserPreferences
  conversationId: string
}

export interface ChatResponse {
  text: string
  intent?: 'answer_question' | 'recommend_product' | 'compare_products' | 'add_to_cart' | 'greeting' | 'clarify'
  productCard?: ProductCardData
  quickReplies?: string[]
  needHostHelp?: boolean
  action?: {
    type: 'add_to_cart' | 'show_detail' | 'switch_product' | 'none'
    payload?: Record<string, unknown>
  }
}

export type PanelState = 'collapsed' | 'half' | 'full'

export interface UserPreferences {
  skinTone?: string
  budgetRange?: [number, number]
  preferredCategories?: string[]
  sizes?: Record<string, string>
  concerns?: string[]
}