import { motion } from 'framer-motion'
import type { ProductCardData } from '../../types'

interface ProductRecommendationCardProps {
  card: ProductCardData
  isAgentPush?: boolean
  onClick?: () => void
}

export function ProductRecommendationCard({
  card,
  isAgentPush = false,
  onClick,
}: ProductRecommendationCardProps) {
  return (
    <motion.div
      className={`rounded-xl p-3.5 max-w-[280px] border cursor-pointer ${
        isAgentPush
          ? 'bg-white/5 border-white/10'
          : 'bg-gradient-to-br from-orange-500/10 to-pink-500/10 border-orange-500/30'
      }`}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Source indicator */}
      <div className="flex items-center gap-1.5 mb-2">
        <span className={`text-xs ${isAgentPush ? 'text-green-400/80' : 'text-orange-400/80'}`}>
          {isAgentPush ? '🤖 Agent主动推荐' : '💡 为您匹配'}
        </span>
        {!isAgentPush && (
          <span className="text-white/20 text-[10px]">点击查看详情</span>
        )}
      </div>

      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-xl bg-white/10 flex items-center justify-center text-2xl shrink-0 shadow-inner">
          {getCategoryEmoji(card.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-white text-sm font-semibold line-clamp-2 leading-snug">{card.name}</p>
          <p className="text-kuaishou-orange font-bold text-lg mt-1">¥{card.price}</p>
        </div>
      </div>

      {card.highlightReason && (
        <div className={`mt-2.5 p-2 rounded-lg text-xs leading-relaxed ${
          isAgentPush ? 'bg-green-500/5 border border-green-500/10 text-green-300/80' : 'bg-orange-500/5 border border-orange-500/10 text-orange-300/80'
        }`}>
          <span className="font-medium">✨ 推荐理由：</span>
          {card.highlightReason}
        </div>
      )}

      {card.tags && card.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {card.tags.map((tag) => (
            <span
              key={tag}
              className={`px-2.5 py-0.5 text-[10px] rounded-full border ${
                isAgentPush
                  ? 'bg-green-500/5 text-green-300/70 border-green-500/15'
                  : 'bg-orange-500/10 text-orange-300/80 border-orange-500/20'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function getCategoryEmoji(name: string): string {
  if (name.includes('裙') || name.includes('T恤') || name.includes('鞋')) return '👗'
  if (name.includes('面膜') || name.includes('精华')) return '🧴'
  if (name.includes('包')) return '👜'
  if (name.includes('枣') || name.includes('食品')) return '🫘'
  if (name.includes('耳机')) return '🎧'
  return '📦'
}