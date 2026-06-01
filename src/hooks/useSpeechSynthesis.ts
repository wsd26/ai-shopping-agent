import { useRef, useCallback } from 'react'
import { selectBestVoice, TTS_CONFIG } from '../utils/ttsConfig'

// Split long text into sentences for natural pauses
function splitSentences(text: string): string[] {
  const sentences: string[] = []
  let current = ''
  for (let i = 0; i < text.length; i++) {
    current += text[i]
    if (text[i] === '。' || text[i] === '！' || text[i] === '？' || text[i] === '!' || text[i] === '?' || text[i] === '；' || text[i] === '…') {
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
  const generationRef = useRef(0)

  const speakNext = useCallback(
    (generation: number, onEnd?: () => void) => {
      if (generation !== generationRef.current) return

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
      utterance.lang = TTS_CONFIG.lang
      utterance.rate = TTS_CONFIG.rate
      utterance.pitch = TTS_CONFIG.pitch
      utterance.volume = TTS_CONFIG.volume

      const voice = selectBestVoice()
      if (voice) utterance.voice = voice

      const capturedGeneration = generation

      utterance.onend = () => {
        if (queueRef.current.length > 0) {
          setTimeout(() => speakNext(capturedGeneration, onEnd), 150)
        } else {
          speakingRef.current = false
          onEnd?.()
        }
      }

      utterance.onerror = () => {
        if (queueRef.current.length > 0) {
          setTimeout(() => speakNext(capturedGeneration, onEnd), 100)
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
      window.speechSynthesis.cancel()
      queueRef.current = []
      speakingRef.current = false
      cancelRef.current = false
      generationRef.current += 1

      if (!text.trim()) {
        onEnd?.()
        return
      }

      const sentences = splitSentences(text)
      queueRef.current = [...sentences]

      const gen = generationRef.current
      setTimeout(() => speakNext(gen, onEnd), 80)
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
