import { motion } from 'framer-motion'
import { useConversationStore, type AgentMode } from '../../store/useConversationStore'

export function AIGuideAvatar() {
  const isThinking = useConversationStore((s) => s.isThinking)
  const isSpeaking = useConversationStore((s) => s.isSpeaking)
  const isRecording = useConversationStore((s) => s.isRecording)
  const panelState = useConversationStore((s) => s.panelState)
  const setPanelState = useConversationStore((s) => s.setPanelState)
  const agentMode = useConversationStore((s) => s.agentMode)
  const agentTask = useConversationStore((s) => s.agentTask)
  const agentObservationCount = useConversationStore((s) => s.agentObservationCount)

  if (panelState !== 'collapsed') return null

  const isActive = agentMode !== 'idle' || isThinking || isRecording

  return (
    <motion.button
      className="absolute bottom-20 right-3 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 shadow-lg shadow-orange-500/30 flex items-center justify-center"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      animate={
        isActive
          ? { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 1.5 } }
          : { y: [0, -3, 0], transition: { repeat: Infinity, duration: 3 } }
      }
      onClick={() => setPanelState('half')}
      title={agentTask || 'AI购物助手小快'}
    >
      <span className="text-2xl">🤖</span>

      {/* Speaking ring */}
      {isSpeaking && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-orange-400"
          animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      )}

      {/* Active indicator */}
      {isActive && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 animate-pulse flex items-center justify-center text-[8px] text-white font-bold">
          !
        </span>
      )}

      {/* Agent mode label */}
      {agentMode !== 'idle' && (
        <motion.div
          className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap border border-white/10"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {getAgentLabel(agentMode)}
        </motion.div>
      )}

      {/* Observation count badge */}
      {agentObservationCount > 0 && (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {agentObservationCount}
        </span>
      )}
    </motion.button>
  )
}

function getAgentLabel(mode: AgentMode): string {
  switch (mode) {
    case 'observing': return '👀 监控中'
    case 'analyzing': return '🔍 分析中'
    case 'recommending': return '✨ 有好物'
    case 'executing': return '⚡ 执行中'
    default: return ''
  }
}