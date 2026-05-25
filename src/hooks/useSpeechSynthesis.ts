import { useRef, useCallback } from 'react'

// Voice quality tiers - prefer natural female Mandarin voices
const PREFERRED_VOICE_PATTERNS = [
  // Best: Google's natural Mandarin female voices (Chrome)
  { test: (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang === 'zh-CN' && (v.name.includes('Female') || v.name.includes('女')), priority: 100 },
  // Next: Any Google zh-CN voice
  { test: (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang === 'zh-CN', priority: 90 },
  // Natural/Neural voices from Microsoft
  { test: (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('xiaoxiao') || v.name.toLowerCase().includes('yunxi'), priority: 85 },
  // Microsoft zh-CN voices (Edge)
  { test: (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang === 'zh-CN' && (v.name.includes('Female') || v.name.includes('女')), priority: 80 },
  // Any Microsoft zh-CN
  { test: (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang === 'zh-CN', priority: 70 },
  // Any zh-CN female voice
  { test: (v: SpeechSynthesisVoice) => v.lang === 'zh-CN' && (v.name.includes('Female') || v.name.includes('女') || v.name.includes('f')), priority: 60 },
  // Fallback: Any zh-CN voice
  { test: (v: SpeechSynthesisVoice) => v.lang === 'zh-CN', priority: 50 },
  // zh-TW as last resort
  { test: (v: SpeechSynthesisVoice) => v.lang.startsWith('zh-TW'), priority: 30 },
]

function selectBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null

  let bestVoice: SpeechSynthesisVoice | null = null
  let bestScore = -1

  for (const voice of voices) {
    for (const pattern of PREFERRED_VOICE_PATTERNS) {
      if (pattern.test(voice) && pattern.priority > bestScore) {
        bestVoice = voice
        bestScore = pattern.priority
      }
    }
  }

  return bestVoice
}

// Split long text into sentences for natural pauses
function splitSentences(text: string): string[] {
  const sentences: string[] = []
  let current = ''
  // Split on Chinese punctuation markers
  for (let i = 0; i < text.length; i++) {
    current += text[i]
    if (
      text[i] === '。' ||
      text[i] === '！' ||
      text[i] === '？' ||
      text[i] === '!' ||
      text[i] === '?' ||
      text[i] === '；' ||
      text[i] === '…'
    ) {
      if (current.trim()) sentences.push(current.trim())
      current = ''
    }
  }
  if (current.trim()) sentences.push(current.trim())
  return sentences.length > 1 ? sentences : [text]
}

export function useSpeechSynthesis() {
  const queueRef = useRef<string[]>([])
  const speakingRef = useRef(false)
  const cancelRef = useRef(false)

  const speakNext = useCallback(
    (onEnd?: () => void) => {
      if (cancelRef.current || queueRef.current.length === 0) {
        speakingRef.current = false
        if (cancelRef.current) {
          cancelRef.current = false
          queueRef.current = []
        }
        onEnd?.()
        return
      }

      speakingRef.current = true
      const sentence = queueRef.current.shift()!
      const utterance = new SpeechSynthesisUtterance(sentence)
      utterance.lang = 'zh-CN'
      utterance.rate = 0.95  // Slightly slower, more natural
      utterance.pitch = 1.05  // Slightly higher, more friendly
      utterance.volume = 0.9

      const bestVoice = selectBestVoice()
      if (bestVoice) {
        utterance.voice = bestVoice
      }

      utterance.onend = () => {
        // Small pause between sentences for natural rhythm
        if (queueRef.current.length > 0) {
          setTimeout(() => speakNext(onEnd), 150)
        } else {
          speakingRef.current = false
          onEnd?.()
        }
      }

      utterance.onerror = (e) => {
        console.warn('TTS error:', e)
        // Continue with next sentence despite error
        if (queueRef.current.length > 0) {
          setTimeout(() => speakNext(onEnd), 100)
        } else {
          speakingRef.current = false
          onEnd?.()
        }
      }

      window.speechSynthesis.speak(utterance)
    },
    []
  )

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      queueRef.current = []
      speakingRef.current = false
      cancelRef.current = false

      if (!text.trim()) {
        onEnd?.()
        return
      }

      // Split into sentences for natural pauses
      const sentences = splitSentences(text)
      queueRef.current = [...sentences]

      // Small initial delay for natural feel
      setTimeout(() => speakNext(onEnd), 80)
    },
    [speakNext]
  )

  const stop = useCallback(() => {
    cancelRef.current = true
    window.speechSynthesis.cancel()
    queueRef.current = []
    speakingRef.current = false
  }, [])

  return { speak, stop, isSupported: 'speechSynthesis' in window }
}