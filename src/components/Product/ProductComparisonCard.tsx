import { formatPrice, discountPercent, getCategoryEmoji } from '../../utils/format'
import type { Product } from '../../types'

interface ProductComparisonCardProps {
  productA: Product
  productB: Product
  advantage: 'a' | 'b' | 'tie'
}

export function ProductComparisonCard({ productA, productB, advantage }: ProductComparisonCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <h4 className="text-white/60 text-xs font-medium mb-3 text-center">📊 AI对比分析</h4>

      <div className="flex gap-3">
        {/* Product A */}
        <div className="flex-1">
          <CompareItem product={productA} isWinner={advantage === 'a'} />
        </div>

        <div className="flex items-center text-white/20 text-lg font-bold">VS</div>

        {/* Product B */}
        <div className="flex-1">
          <CompareItem product={productB} isWinner={advantage === 'b'} />
        </div>
      </div>

      {/* Winning reason */}
      {advantage !== 'tie' && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-orange-300/80 text-xs">
            ✨ 推荐结论：
            <span className="font-medium">
              {advantage === 'a' ? productA.name : productB.name}
            </span>
            {' '}更值得入手
          </p>
        </div>
      )}
    </div>
  )
}

function CompareItem({ product, isWinner }: { product: Product; isWinner: boolean }) {
  const discount = discountPercent(product.price, product.originalPrice)

  return (
    <div className={`text-center p-2 rounded-xl relative ${isWinner ? 'bg-orange-500/10 border border-orange-500/20' : ''}`}>
      {isWinner && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
          推荐 🏆
        </span>
      )}
      <div className="w-12 h-12 mx-auto mb-1.5 rounded-lg bg-white/5 flex items-center justify-center text-xl">
        {getCategoryEmoji(product.category)}
      </div>
      <p className="text-white text-xs line-clamp-2 leading-tight">{product.name}</p>
      <p className="text-kuaishou-orange font-bold text-sm mt-1">{formatPrice(product.price)}</p>
      <div className="flex items-center justify-center gap-1.5 mt-0.5">
        <span className="text-white/30 text-[10px] line-through">{formatPrice(product.originalPrice)}</span>
        <span className="text-orange-400 text-[10px]">-{discount}%</span>
      </div>
    </div>
  )
}
