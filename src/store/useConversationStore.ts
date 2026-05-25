import { create } from 'zustand'
import type { Message, PanelState, ProductCardData } from '../types'
import { v4 as uuidv4 } from 'uuid'

export type AgentMode = 'idle' | 'observing' | 'analyzing' | 'recommending' | 'executing'

interface ConversationState {
  messages: Message[]
  isRecording: boolean
  isThinking: boolean
  isSpeaking: boolean
  quickReplies: string[]
  suggestedProduct: ProductCardData | null
  panelState: PanelState
  error: string | null
  conversationId: string

  // Agent states
  agentMode: AgentMode
  agentTask: string | null
  autoObserve: boolean
  agentObservationCount: number
  lastUserInteractionTime: number

  addUserMessage: (text: string, type: 'voice' | 'text') => void
  addAIMessage: (text: string, productCard?: ProductCardData, quickReplies?: string[]) => void
  addAgentObservation: (text: string, productCard?: ProductCardData) => void
  setRecording: (v: boolean) => void
  setThinking: (v: boolean) => void
  setSpeaking: (v: boolean) => void
  setPanelState: (s: PanelState) => void
  setQuickReplies: (r: string[]) => void
  setError: (e: string | null) => void
  setAgentMode: (m: AgentMode) => void
  setAgentTask: (t: string | null) => void
  setAutoObserve: (v: boolean) => void
  setMessageFeedback: (messageId: string, feedback: 'up' | 'down') => void
  clearConversation: () => void
}

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isRecording: false,
  isThinking: false,
  isSpeaking: false,
  quickReplies: [],
  suggestedProduct: null,
  panelState: 'collapsed' as PanelState,
  error: null,
  conversationId: uuidv4(),

  // Agent defaults
  agentMode: 'idle' as AgentMode,
  agentTask: null,
  autoObserve: true,
  agentObservationCount: 0,
  lastUserInteractionTime: 0,

  addUserMessage: (text, type) => {
    const msg: Message = {
      id: uuidv4(),
      role: 'user',
      content: text,
      type,
      timestamp: Date.now(),
    }
    set((s) => ({
      messages: [...s.messages, msg],
      panelState: 'half',
      error: null,
      lastUserInteractionTime: Date.now(),
    }))
  },

  addAIMessage: (text, productCard, quickReplies) => {
    const msg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: text,
      type: 'text',
      timestamp: Date.now(),
      productCard,
      quickReplies,
    }
    set((s) => ({
      messages: [...s.messages, msg],
      suggestedProduct: productCard || s.suggestedProduct,
      quickReplies: quickReplies || [],
      panelState: 'half',
      agentMode: 'idle' as AgentMode,
    }))
  },

  addAgentObservation: (text, productCard) => {
    const msg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: text,
      type: 'text',
      timestamp: Date.now(),
      productCard,
      quickReplies: ['帮我看看详情', '加入购物车', '跳过'],
      isAgentPush: true,
    }
    set((s) => ({
      messages: [...s.messages, msg],
      suggestedProduct: productCard || s.suggestedProduct,
      quickReplies: msg.quickReplies!,
      agentObservationCount: s.agentObservationCount + 1,
      agentMode: 'idle' as AgentMode,
    }))
  },

  setRecording: (v) => set({ isRecording: v }),
  setThinking: (v) => set({ isThinking: v }),
  setSpeaking: (v) => set({ isSpeaking: v }),
  setPanelState: (s) => set({ panelState: s }),
  setQuickReplies: (r) => set({ quickReplies: r }),
  setError: (e) => set({ error: e }),
  setAgentMode: (m) => set({ agentMode: m }),
  setAgentTask: (t) => set({ agentTask: t }),
  setAutoObserve: (v) => set({ autoObserve: v }),
  setMessageFeedback: (messageId, feedback) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === messageId ? { ...m, feedback } : m)),
    })),
  clearConversation: () =>
    set({
      messages: [],
      quickReplies: [],
      suggestedProduct: null,
      error: null,
      conversationId: uuidv4(),
      agentMode: 'idle',
      agentTask: null,
      agentObservationCount: 0,
      lastUserInteractionTime: 0,
    }),
}))