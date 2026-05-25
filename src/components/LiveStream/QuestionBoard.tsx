import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLiveStreamStore, type HostQuestion } from '../../store/useLiveStreamStore'

export function QuestionBoard() {
  const hostQuestions = useLiveStreamStore((s) => s.hostQuestions)
  const dismissHostQuestion = useLiveStreamStore((s) => s.dismissHostQuestion)

  return (
    <div className="absolute top-24 left-3 right-16 z-10 pointer-events-none">
      <AnimatePresence>
        {hostQuestions.map((q) => (
          <QuestionBanner
            key={q.id}
            question={q}
            onDismiss={() => dismissHostQuestion(q.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function QuestionBanner({
  question,
  onDismiss,
}: {
  question: HostQuestion
  onDismiss: () => void
}) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 500)
    }, 8000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      className="pointer-events-auto bg-gradient-to-r from-red-500/90 to-orange-500/90 backdrop-blur-sm rounded-xl px-3.5 py-2.5 mb-2 shadow-lg shadow-red-500/20 border border-red-400/30"
      initial={{ opacity: 0, y: -20, scale: 0.9 }}
      animate={visible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: -20, scale: 0.9 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onDismiss}
    >
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0 mt-0.5">📢</span>
        <div className="min-w-0 flex-1">
          <p className="text-white text-xs font-semibold leading-tight mb-0.5">
            用户提问
          </p>
          <p className="text-white/90 text-xs leading-snug line-clamp-2">
            「{question.text}」
          </p>
          <p className="text-white/50 text-[10px] mt-1">
            主播看到请回复 🙏
          </p>
        </div>
        <button
          className="text-white/50 hover:text-white/80 text-xs shrink-0 px-1"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
        >
          ✕
        </button>
      </div>
    </motion.div>
  )
}
