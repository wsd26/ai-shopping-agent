import { create } from 'zustand'
import type { UserPreferences, ConversationSummary } from '../types'

interface UserState {
  preferences: UserPreferences
  conversationHistory: ConversationSummary[]
  hasCompletedOnboarding: boolean

  setPreferences: (p: Partial<UserPreferences>) => void
  setOnboardingComplete: () => void
  addConversationSummary: (s: ConversationSummary) => void
}

const loadUserState = () => {
  try {
    const saved = localStorage.getItem('kuaishou-ai-guide-user')
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return null
}

const saveUserState = (state: Partial<UserState>) => {
  try {
    const current = loadUserState() || {}
    localStorage.setItem('kuaishou-ai-guide-user', JSON.stringify({ ...current, ...state }))
  } catch { /* ignore */ }
}

export const useUserStore = create<UserState>((set, get) => {
  const saved = loadUserState()

  return {
    preferences: saved?.preferences || {},
    conversationHistory: saved?.conversationHistory || [],
    hasCompletedOnboarding: saved?.hasCompletedOnboarding || false,

    setPreferences: (p) => {
      const updated = { ...get().preferences, ...p }
      set({ preferences: updated })
      saveUserState({ preferences: updated })
    },

    setOnboardingComplete: () => {
      set({ hasCompletedOnboarding: true })
      saveUserState({ hasCompletedOnboarding: true })
    },

    addConversationSummary: (s) => {
      const updated = [...get().conversationHistory.slice(-49), s]
      set({ conversationHistory: updated })
      saveUserState({ conversationHistory: updated })
    },
  }
})