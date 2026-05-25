import { create } from 'zustand'
import type { Product } from '../types'
import { liveStreamConfig, type LiveStreamConfig, type LiveComment, generateComment } from '../constants/liveStream'

export interface HostQuestion {
  id: string
  text: string
  timestamp: number
}

interface LiveStreamState {
  host: LiveStreamConfig['host']
  currentProduct: Product | null
  productIndex: number
  productHistory: Product[]
  upcomingProducts: Product[]
  viewerCount: number
  comments: LiveComment[]
  hostQuestions: HostQuestion[]

  nextProduct: () => void
  prevProduct: () => void
  setViewerCount: (n: number) => void
  addComment: (c: LiveComment) => void
  generateRandomComment: () => void
  setCurrentProduct: (p: Product) => void
  addHostQuestion: (text: string) => void
  dismissHostQuestion: (id: string) => void
}

export const useLiveStreamStore = create<LiveStreamState>((set, get) => ({
  host: liveStreamConfig.host,
  currentProduct: liveStreamConfig.productSequence[0],
  productIndex: 0,
  productHistory: [],
  upcomingProducts: liveStreamConfig.productSequence.slice(1),
  viewerCount: liveStreamConfig.initialViewerCount,
  comments: [],
  hostQuestions: [],

  nextProduct: () => {
    const { productIndex, productHistory, upcomingProducts, currentProduct } = get()
    if (upcomingProducts.length === 0) return
    const next = upcomingProducts[0]
    set({
      currentProduct: next,
      productIndex: productIndex + 1,
      productHistory: [...productHistory, currentProduct!],
      upcomingProducts: upcomingProducts.slice(1),
    })
  },

  prevProduct: () => {
    const { productIndex, productHistory, upcomingProducts, currentProduct } = get()
    if (productHistory.length === 0) return
    const prev = productHistory[productHistory.length - 1]
    set({
      currentProduct: prev,
      productIndex: productIndex - 1,
      productHistory: productHistory.slice(0, -1),
      upcomingProducts: [currentProduct!, ...upcomingProducts],
    })
  },

  setViewerCount: (n) => set({ viewerCount: n }),
  addComment: (c) => set((s) => ({ comments: [...s.comments.slice(-20), c] })),
  generateRandomComment: () => {
    const comment = generateComment()
    set((s) => ({ comments: [...s.comments.slice(-20), comment] }))
  },
  setCurrentProduct: (p) => set({ currentProduct: p }),

  addHostQuestion: (text) => {
    const question: HostQuestion = {
      id: `hq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      text,
      timestamp: Date.now(),
    }
    set((s) => ({ hostQuestions: [...s.hostQuestions, question] }))
  },
  dismissHostQuestion: (id) =>
    set((s) => ({ hostQuestions: s.hostQuestions.filter((q) => q.id !== id) })),
}))