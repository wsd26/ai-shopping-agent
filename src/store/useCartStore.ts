import { create } from 'zustand'
import type { Product, CartItem } from '../types'

interface CartState {
  items: CartItem[]
  isDrawerOpen: boolean
  totalAmount: number

  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  clearCart: () => void
  toggleDrawer: (open?: boolean) => void
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  isDrawerOpen: false,
  totalAmount: 0,

  addItem: (product) => {
    const { items } = get()
    const existing = items.find((i) => i.product.id === product.id)
    if (existing) {
      set((s) => ({
        items: s.items.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
        totalAmount: s.totalAmount + product.price,
      }))
    } else {
      set((s) => ({
        items: [...s.items, { product, quantity: 1, addedAt: Date.now() }],
        totalAmount: s.totalAmount + product.price,
      }))
    }
  },

  removeItem: (productId) => {
    const { items } = get()
    const item = items.find((i) => i.product.id === productId)
    if (!item) return
    set((s) => ({
      items: s.items.filter((i) => i.product.id !== productId),
      totalAmount: s.totalAmount - item.product.price * item.quantity,
    }))
  },

  clearCart: () => set({ items: [], totalAmount: 0 }),

  toggleDrawer: (open) =>
    set((s) => ({ isDrawerOpen: open !== undefined ? open : !s.isDrawerOpen })),
}))