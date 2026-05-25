import { useState } from 'react'
import { useConversationStore } from '../../store/useConversationStore'
import { mockProducts } from '../../constants/products'
import type { Message, Product } from '../../types'
import { ProductRecommendationCard } from './ProductRecommendationCard'
import { LoadingDots } from '../Common/LoadingDots'

interface ChatBubbleProps {
  message: Message
  isLoading?: boolean
  onProductClick?: (product: Product) => void
}

export function ChatBubble({ message, isLoading, onProductClick }: ChatBubbleProps) {
  const isAI = message.role === 'assistant'
  const setFeedback = useConversationStore((s) => s.setMessageFeedback)
  const [showThanks, setShowThanks] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-start gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-sm shrink-0">
          🤖
        </div>
        <div className="bg-white/5 rounded-2xl rounded-tl-sm">
          <LoadingDots />
        </div>
      </div>
    )
  }

  const handleCardClick = () => {
    if (message.productCard && onProductClick) {
      const targetProduct = mockProducts.find((p) => p.id === message.productCard!.productId)
      if (targetProduct) {
        onProductClick(targetProduct)
      }
    }
  }

  const handleFeedback = (fb: 'up' | 'down') => {
    setFeedback(message.id, fb)
    if (fb === 'up') {
      setShowThanks(true)
      setTimeout(() => setShowThanks(false), 2000)
    }
  }

  return (
    <div className={`flex items-start gap-2 mb-3 ${isAI ? '' : 'flex-row-reverse'}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
          isAI
            ? 'bg-gradient-to-br from-orange-500 to-pink-500'
            : 'bg-gradient-to-br from-blue-500 to-cyan-500'
        }`}
      >
        {isAI ? '🤖' : '👤'}
      </div>
      <div className={`max-w-[80%] ${isAI ? '' : 'items-end'}`}>
        <div
          className={`px-3.5 py-2.5 text-sm leading-relaxed ${
            isAI
              ? 'bg-white/5 rounded-2xl rounded-tl-sm text-white/90'
              : 'bg-kuaishou-orange/80 rounded-2xl rounded-tr-sm text-white'
          }`}
        >
          {message.type === 'voice' && !isAI && (
            <span className="inline-flex items-center gap-1 text-white/60 text-xs mb-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
              语音
            </span>
          )}
          <p>{message.content}</p>
        </div>

        {/* Feedback buttons for AI messages */}
        {isAI && message.id !== 'thinking' && !message.feedback && (
          <div className="flex items-center gap-1 mt-1 ml-1">
            <button
              onClick={() => handleFeedback('up')}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-green-500/20 text-white/30 hover:text-green-400 text-xs transition-colors"
              title="有帮助"
            >
              👍
            </button>
            <button
              onClick={() => handleFeedback('down')}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 text-xs transition-colors"
              title="不够好"
            >
              👎
            </button>
          </div>
        )}

        {message.feedback === 'up' && showThanks && (
          <p className="text-green-400/60 text-[10px] mt-1 ml-1">感谢反馈，小快会继续努力 ✨</p>
        )}
        {message.feedback === 'down' && (
          <p className="text-red-400/60 text-[10px] mt-1 ml-1">收到，小快会改进的 🙏</p>
        )}

        {message.productCard && (
          <div className="mt-2 cursor-pointer" onClick={handleCardClick}>
            <ProductRecommendationCard card={message.productCard} isAgentPush={message.isAgentPush} onClick={handleCardClick} />
          </div>
        )}
      </div>
    </div>
  )
}
