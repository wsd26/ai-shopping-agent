import { useRef, useCallback, useState } from 'react'
import { motion } from 'framer-motion'
import { useConversationStore } from '../../store/useConversationStore'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { useAIShoppingGuide } from '../../hooks/useAIShoppingGuide'
import { AudioWaveform } from './AudioWaveform'
import { useToast } from '../Common/Toast'
import { Toast } from '../Common/Toast'

export function VoiceInputButton() {
  const isRecording = useConversationStore((s) => s.isRecording)
  const isThinking = useConversationStore((s) => s.isThinking)
  const isSpeaking = useConversationStore((s) => s.isSpeaking)
  const setRecording = useConversationStore((s) => s.setRecording)
  const setSpeaking = useConversationStore((s) => s.setSpeaking)
  const setError = useConversationStore((s) => s.setError)
  const { handleUserVoice, handleUserText } = useAIShoppingGuide()
  const { toast, showToast, hideToast } = useToast()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [textInput, setTextInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)

  const handleResult = useCallback(
    (transcript: string) => {
      if (transcript.trim()) {
        handleUserVoice(transcript.trim())
        setRecording(false)
      }
    },
    [handleUserVoice, setRecording]
  )

  const handleError = useCallback(
    (error: string) => {
      showToast(error)
      setRecording(false)
      setError(error)
    },
    [showToast, setRecording, setError]
  )

  const { isSupported, start, stop } = useSpeechRecognition(handleResult, handleError)

  const handlePressStart = useCallback(() => {
    // When AI is speaking, pressing interrupts and starts listening
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
    if (isThinking) return
    setRecording(true)
    start()
    timeoutRef.current = setTimeout(() => {
      stop()
      setRecording(false)
      showToast('说话时间太长啦，请简短一点')
    }, 10000)
  }, [isThinking, isSpeaking, setSpeaking, setRecording, start, stop, showToast])

  const handlePressEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    stop()
    setRecording(false)
  }, [stop, setRecording])

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim() && !isThinking) {
      handleUserText(textInput.trim())
      setTextInput('')
    }
  }, [textInput, isThinking, handleUserText])

  if (!isSupported) {
    return (
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder="输入您的问题..."
            disabled={isThinking}
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white text-sm placeholder-white/30 outline-none focus:border-orange-500/50 transition-colors disabled:opacity-30"
          />
          <button
            onClick={handleTextSubmit}
            disabled={isThinking || !textInput.trim()}
            className="w-10 h-10 rounded-full bg-kuaishou-orange flex items-center justify-center disabled:opacity-30 shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-white/20 text-[10px] text-center mt-2">您的浏览器不支持语音，请使用文字输入或Chrome浏览器</p>
      </div>
    )
  }

  return (
    <div className="px-4 pb-4">
      <Toast message={toast.message} visible={toast.visible} onClose={hideToast} />

      <AudioWaveform />

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowTextInput(!showTextInput)}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:text-white/80 shrink-0"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>

        <motion.button
          className={`flex-1 h-12 rounded-full flex items-center justify-center gap-2 text-white font-medium text-sm transition-all ${
            isRecording
              ? 'bg-red-500 shadow-lg shadow-red-500/30'
              : isThinking
              ? 'bg-white/5 border border-white/10'
              : isSpeaking
              ? 'bg-yellow-500 shadow-lg shadow-yellow-500/20 active:scale-95'
              : 'bg-kuaishou-orange shadow-lg shadow-kuaishou-orange/30 active:scale-95'
          }`}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          disabled={isThinking}
          whileHover={isRecording || isThinking ? {} : { scale: 1.02 }}
          animate={
            isRecording
              ? { scale: [1, 1.03, 1], transition: { repeat: Infinity, duration: 1 } }
              : {}
          }
        >
          {isRecording ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              正在聆听...
            </>
          ) : isThinking ? (
            <>
              <span className="w-2 h-2 rounded-full bg-white/40" />
              思考中...
            </>
          ) : isSpeaking ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
              点击打断
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              </svg>
              按住说话
            </>
          )}
        </motion.button>
      </div>

      {showTextInput && (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
            placeholder="或输入文字..."
            disabled={isThinking}
            className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-white text-sm placeholder-white/30 outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>
      )}
    </div>
  )
}