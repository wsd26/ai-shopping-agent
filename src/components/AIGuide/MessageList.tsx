import { useAutoScroll } from '../../hooks/useAutoScroll'
import { useConversationStore } from '../../store/useConversationStore'
import { ChatBubble } from './ChatBubble'
import { EmptyState } from '../Common/EmptyState'
import type { Product } from '../../types'

interface MessageListProps {
  onProductClick?: (product: Product) => void
}

export function MessageList({ onProductClick }: MessageListProps) {
  const messages = useConversationStore((s) => s.messages)
  const isThinking = useConversationStore((s) => s.isThinking)
  const { containerRef, handleScroll } = useAutoScroll(messages.length)

  if (messages.length === 0 && !isThinking) {
    return (
      <EmptyState
        icon="🤖"
        title="你好！我是小快"
        description="你的AI购物Agent，按住下方按钮问我问题吧～"
      />
    )
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
    >
      {messages.map((msg) => (
        <ChatBubble key={msg.id} message={msg} onProductClick={onProductClick} />
      ))}
      {isThinking && (
        <ChatBubble
          message={{
            id: 'thinking',
            role: 'assistant',
            content: '',
            type: 'text',
            timestamp: Date.now(),
          }}
          isLoading
          onProductClick={onProductClick}
        />
      )}
    </div>
  )
}