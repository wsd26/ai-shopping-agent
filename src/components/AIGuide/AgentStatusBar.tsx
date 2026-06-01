import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useConversationStore, type AgentMode } from '../../store/useConversationStore'
import { useUserStore } from '../../store/useUserStore'
import { monitorAgent } from '../../agents/MonitorAgent'

const AGENT_MODE_CONFIG: Record<AgentMode, { label: string; color: string; icon: string; pulse: boolean }> = {
  idle: { label: '待命中', color: 'bg-gray-500', icon: '⏸️', pulse: false },
  observing: { label: '正在监控直播...', color: 'bg-blue-500', icon: '👀', pulse: true },
  analyzing: { label: '正在分析商品...', color: 'bg-yellow-500', icon: '🔍', pulse: true },
  recommending: { label: '发现匹配好物！', color: 'bg-green-500', icon: '✨', pulse: true },
  executing: { label: '正在执行任务...', color: 'bg-purple-500', icon: '⚡', pulse: true },
}

export function AgentStatusBar() {
  const agentMode = useConversationStore((s) => s.agentMode)
  const agentTask = useConversationStore((s) => s.agentTask)
  const autoObserve = useConversationStore((s) => s.autoObserve)
  const setAutoObserve = useConversationStore((s) => s.setAutoObserve)
  const preferences = useUserStore((s) => s.preferences)
  const [showProfile, setShowProfile] = useState(false)

  const config = AGENT_MODE_CONFIG[agentMode]

  const profileTags: string[] = []
  if (preferences.skinTone) profileTags.push(`肤色:${preferences.skinTone}`)
  if (preferences.budgetRange) profileTags.push(`预算¥${preferences.budgetRange[0]}-${preferences.budgetRange[1]}`)
  if (preferences.preferredCategories?.length) {
    profileTags.push(...preferences.preferredCategories.map((c) => `喜欢${c}`))
  }

  const monitorEnabled = monitorAgent.isEnabled()
  const observationCount = monitorAgent.getObservationCount()

  return (
    <AnimatePresence>
      <motion.div
        className="flex flex-col mx-3 mb-2 bg-white/3 border border-white/5 rounded-xl overflow-hidden"
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
      >
        <div className="flex items-center gap-2 px-4 py-2">
          {/* Status indicator */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm">{config.icon}</span>
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className={`w-2 h-2 rounded-full ${config.color} ${
                  config.pulse ? 'animate-pulse' : ''
                } shrink-0`}
              />
              <span className="text-white/60 text-xs truncate">{config.label}</span>
            </div>
          </div>

          {/* Agent status dots: Shopping (orange) + Monitor (blue) */}
          <div className="flex items-center gap-1 shrink-0">
            <span
              title="ShoppingAgent (对话)"
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                agentMode !== 'idle' ? 'bg-orange-500 animate-pulse' : 'bg-white/10'
              }`}
            />
            <span
              title={`MonitorAgent (${monitorEnabled ? '监控中' : '已关闭'})`}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                monitorEnabled ? 'bg-blue-500' : 'bg-white/10'
              }`}
            />
          </div>

          {/* Agent stats */}
          <div className="flex items-center gap-3 text-white/30 text-[10px] shrink-0">
            {agentTask && (
              <span className="text-purple-300/60 truncate max-w-[120px]">
                {agentTask}
              </span>
            )}
            {observationCount > 0 && (
              <span>已观察 {observationCount} 件</span>
            )}
          </div>

          {/* Auto-observe toggle */}
          <button
            onClick={() => setAutoObserve(!autoObserve)}
            className={`shrink-0 px-2 py-1 rounded-full text-[10px] transition-colors ${
              autoObserve
                ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                : 'bg-white/5 text-white/30 border border-white/5'
            }`}
          >
            {autoObserve ? '自动监控:开' : '自动监控:关'}
          </button>
        </div>

        {/* User profile chip - expandable */}
        {profileTags.length > 0 && (
          <div className="px-4 pb-2">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-1 text-[10px] text-white/25 hover:text-white/50 transition-colors"
            >
              <span>{showProfile ? '🔽' : '🔼'}</span>
              小快了解的您
            </button>
            <AnimatePresence>
              {showProfile && (
                <motion.div
                  className="flex flex-wrap gap-1 mt-1.5"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {profileTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/15 text-orange-300/70 text-[10px]"
                    >
                      {tag}
                    </span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}

export function AgentThinkingIndicator() {
  const agentMode = useConversationStore((s) => s.agentMode)

  if (agentMode === 'idle') return null

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 mx-4 mb-2 rounded-lg">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-white/40 text-xs">
        {agentMode === 'observing' && 'AI正在观察直播间...'}
        {agentMode === 'analyzing' && 'AI正在分析商品匹配度...'}
        {agentMode === 'executing' && 'AI正在执行您的任务...'}
        {agentMode === 'recommending' && 'AI发现了一个匹配好物！'}
      </span>
    </div>
  )
}
