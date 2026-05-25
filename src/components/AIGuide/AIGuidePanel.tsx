import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConversationStore } from '../../store/useConversationStore'
import { useAIShoppingGuide } from '../../hooks/useAIShoppingGuide'
import { MessageList } from './MessageList'
import { QuickReplyChips } from './QuickReplyChips'
import { VoiceInputButton } from './VoiceInputButton'
import { AgentStatusBar, AgentThinkingIndicator } from './AgentStatusBar'
import { ErrorBanner } from '../Common/ErrorBanner'
import type { Product } from '../../types'

interface AIGuidePanelProps {
  onProductClick?: (product: Product) => void
}

export function AIGuidePanel({ onProductClick }: AIGuidePanelProps) {
  const panelState = useConversationStore((s) => s.panelState)
  const setPanelState = useConversationStore((s) => s.setPanelState)
  const quickReplies = useConversationStore((s) => s.quickReplies)
  const error = useConversationStore((s) => s.error)
  const setError = useConversationStore((s) => s.setError)
  const isThinking = useConversationStore((s) => s.isThinking)
  const agentMode = useConversationStore((s) => s.agentMode)
  const { handleUserText } = useAIShoppingGuide()

  const handleQuickReply = useCallback(
    (reply: string) => {
      handleUserText(reply)
    },
    [handleUserText]
  )

  const panelHeight =
    panelState === 'full' ? '75%' : panelState === 'half' ? '58%' : '0%'

  return (
    <AnimatePresence>
      {panelState !== 'collapsed' && (
        <motion.div
          className="absolute bottom-12 left-0 right-0 z-20 rounded-t-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(20,20,30,0.96) 0%, rgba(10,10,18,0.99) 100%)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
          initial={{ y: '100%' }}
          animate={{ y: 0, height: panelHeight }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          <div className="h-full flex flex-col">
            {/* Handle bar + Agent mode label */}
            <div className="flex items-center justify-center py-2.5 relative">
              <button
                className="w-10 h-1 bg-white/20 rounded-full"
                onClick={() => {
                  if (panelState === 'full') setPanelState('half')
                  else setPanelState('full')
                }}
              />
              {/* Agent mode chip */}
              {agentMode !== 'idle' && (
                <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-300 border border-orange-500/20">
                  {agentMode === 'observing' && '👀 Agent监控中'}
                  {agentMode === 'analyzing' && '🔍 Agent分析中'}
                  {agentMode === 'executing' && '⚡ Agent执行中'}
                  {agentMode === 'recommending' && '✨ Agent推荐中'}
                </span>
              )}
            </div>

            {/* Agent Status Bar */}
            <AgentStatusBar />

            {/* Agent thinking indicator */}
            <AgentThinkingIndicator />

            {/* Error */}
            {error && (
              <ErrorBanner
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            {/* Messages */}
            <MessageList onProductClick={onProductClick} />

            {/* Quick replies */}
            {quickReplies.length > 0 && (
              <div className="px-4 py-2">
                <QuickReplyChips replies={quickReplies} onSelect={handleQuickReply} disabled={isThinking} />
              </div>
            )}

            {/* Voice input */}
            <VoiceInputButton />

            {/* Collapse button */}
            <button
              onClick={() => setPanelState('collapsed')}
              className="absolute top-2.5 right-4 text-white/30 hover:text-white/60 text-sm z-10"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}