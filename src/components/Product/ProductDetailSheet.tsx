import { motion, AnimatePresence } from 'framer-motion'
import type { Product } from '../../types'
import { formatSalesCount, discountPercent, formatPrice, getCategoryEmoji } from '../../utils/format'
import { useCartStore } from '../../store/useCartStore'

interface ProductDetailSheetProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export function ProductDetailSheet({ product, isOpen, onClose }: ProductDetailSheetProps) {
  const addItem = useCartStore((s) => s.addItem)
  const toggleCart = useCartStore((s) => s.toggleDrawer)

  if (!product) return null

  const discount = discountPercent(product.price, product.originalPrice)

  const handleAddToCart = () => {
    addItem(product)
    onClose()
  }

  const handleBuyNow = () => {
    addItem(product)
    onClose()
    toggleCart(true)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="absolute inset-0 bg-black/70 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(25,25,35,0.99) 0%, rgba(15,15,22,1) 100%)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0, height: '75%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-center py-3 shrink-0">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              <div className="px-5 pb-4 shrink-0">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full aspect-[4/3] rounded-2xl object-cover bg-gradient-to-br from-gray-800 to-gray-900 border border-white/5 shadow-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    const parent = target.parentElement
                    if (parent) {
                      parent.innerHTML = `<span style="font-size:80px;display:flex;align-items:center;justify-content:center;height:100%">${getCategoryEmoji(product.category)}</span>`
                    }
                  }}
                />
              </div>

              <div className="flex-1 overflow-y-auto px-5">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-white text-lg font-semibold flex-1 mr-3">{product.name}</h2>
                  <button onClick={onClose} className="text-white/30 hover:text-white/60 text-lg shrink-0">✕</button>
                </div>

                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-kuaishou-orange text-2xl font-bold">{formatPrice(product.price)}</span>
                  <span className="text-white/30 text-sm line-through">{formatPrice(product.originalPrice)}</span>
                  <span className="bg-kuaishou-orange/20 text-kuaishou-orange text-xs px-2 py-0.5 rounded-full font-medium">
                    -{discount}%
                  </span>
                </div>

                <div className="flex items-center gap-4 mb-4 text-white/40 text-xs">
                  <span>已售 {formatSalesCount(product.salesCount)}</span>
                  <span className="text-yellow-400">★ {product.rating}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {product.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-white/60 text-xs">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mb-4">
                  <h3 className="text-white/80 text-sm font-medium mb-2">商品描述</h3>
                  <p className="text-white/50 text-sm leading-relaxed">{product.description}</p>
                </div>

                {product.attributes && Object.keys(product.attributes).length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-white/80 text-sm font-medium mb-2">商品属性</h3>
                    <div className="space-y-2">
                      {Object.entries(product.attributes).map(([key, value]) => {
                        if (!value) return null
                        const displayValue = Array.isArray(value) ? value.join(' / ') : value
                        return (
                          <div key={key} className="flex items-center text-sm">
                            <span className="text-white/40 w-20 shrink-0">{getAttrLabel(key)}</span>
                            <span className="text-white/70">{displayValue}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-4 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                  <p className="text-orange-300/80 text-xs mb-1">🎙️ 主播说</p>
                  <p className="text-white/60 text-sm">{product.hostComment}</p>
                </div>
              </div>

              <div className="px-5 py-4 border-t border-white/5 flex gap-3 shrink-0">
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-colors active:scale-[0.98]"
                >
                  加入购物车
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 py-3 rounded-xl bg-kuaishou-orange text-white text-sm font-medium hover:bg-orange-600 transition-colors active:scale-[0.98]"
                >
                  立即购买
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function getAttrLabel(key: string): string {
  const map: Record<string, string> = {
    material: '材质',
    sizes: '尺码',
    colors: '颜色',
    fit: '版型',
    skinType: '适合肤质',
    effect: '功效',
    weight: '重量',
    origin: '产地',
    shelfLife: '保质期',
    ingredients: '成分',
  }
  return map[key] || key
}