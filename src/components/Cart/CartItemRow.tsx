import { useCartStore } from '../../store/useCartStore'
import { formatPrice, getCategoryEmoji } from '../../utils/format'
import type { CartItem } from '../../types'

interface CartItemRowProps {
  item: CartItem
}

export function CartItemRow({ item }: CartItemRowProps) {
  const removeItem = useCartStore((s) => s.removeItem)

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-b-0">
      <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center text-xl shrink-0">
        {getCategoryEmoji(item.product.category)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm line-clamp-2 leading-snug">{item.product.name}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-kuaishou-orange font-medium">{formatPrice(item.product.price)}</span>
          <span className="text-white/30 text-xs">×{item.quantity}</span>
        </div>
      </div>
      <button
        onClick={() => removeItem(item.product.id)}
        className="text-white/20 hover:text-red-400 text-lg shrink-0"
      >
        ✕
      </button>
    </div>
  )
}

