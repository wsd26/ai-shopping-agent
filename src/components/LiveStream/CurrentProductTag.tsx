import { motion } from 'framer-motion'
import { useLiveStreamStore } from '../../store/useLiveStreamStore'
import { formatSalesCount, discountPercent, getCategoryEmoji } from '../../utils/format'

interface CurrentProductTagProps {
  onClick?: () => void
}

export function CurrentProductTag({ onClick }: CurrentProductTagProps) {
  const currentProduct = useLiveStreamStore((s) => s.currentProduct)

  if (!currentProduct) return null

  const discount = discountPercent(currentProduct.price, currentProduct.originalPrice)

  return (
    <motion.div
      className="absolute bottom-16 left-3 z-10 bg-black/50 backdrop-blur-md rounded-xl p-3 max-w-[210px] border border-white/10 cursor-pointer"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center text-2xl shrink-0">
          {getCategoryEmoji(currentProduct.category)}
        </div>
        <div className="min-w-0">
          <p className="text-white text-xs font-medium line-clamp-2 leading-tight">{currentProduct.name}</p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-kuaishou-orange font-bold text-sm">¥{currentProduct.price}</span>
            <span className="text-white/30 text-[10px] line-through">¥{currentProduct.originalPrice}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-kuaishou-orange/20 text-kuaishou-orange text-[10px] px-1.5 py-0.5 rounded font-medium">
              -{discount}%
            </span>
            <span className="text-white/40 text-[10px]">已售{formatSalesCount(currentProduct.salesCount)}</span>
          </div>
        </div>
      </div>
      <p className="text-white/20 text-[10px] text-center mt-1.5">点击查看详情</p>
    </motion.div>
  )
}

