// Shared TTS voice selection — used by useSpeechSynthesis hook and LiveRoomPage direct utterances.
// Ensures all AI voices (greeting, Q&A, recommendation, push) sound consistent.

const VOICE_PATTERNS = [
  { test: (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang === 'zh-CN' && (v.name.includes('Female') || v.name.includes('女')), priority: 100 },
  { test: (v: SpeechSynthesisVoice) => v.name.includes('Google') && v.lang === 'zh-CN', priority: 90 },
  { test: (v: SpeechSynthesisVoice) => v.name.toLowerCase().includes('xiaoxiao') || v.name.toLowerCase().includes('yunxi'), priority: 85 },
  { test: (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang === 'zh-CN' && (v.name.includes('Female') || v.name.includes('女')), priority: 80 },
  { test: (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang === 'zh-CN', priority: 70 },
  { test: (v: SpeechSynthesisVoice) => v.lang === 'zh-CN' && (v.name.includes('Female') || v.name.includes('女')), priority: 60 },
  { test: (v: SpeechSynthesisVoice) => v.lang === 'zh-CN', priority: 50 },
  { test: (v: SpeechSynthesisVoice) => v.lang.startsWith('zh-TW'), priority: 30 },
]

export function selectBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null

  let best: SpeechSynthesisVoice | null = null
  let bestScore = -1
  for (const voice of voices) {
    for (const p of VOICE_PATTERNS) {
      if (p.test(voice) && p.priority > bestScore) {
        best = voice
        bestScore = p.priority
      }
    }
  }
  return best
}

// Warm, gentle voice settings — shared across all utterances
export const TTS_CONFIG = {
  lang: 'zh-CN' as const,
  rate: 0.92,    // slightly slower = gentler
  pitch: 1.08,   // slightly higher = warmer
  volume: 0.9,
}

export function speakText(text: string, onEnd?: () => void): SpeechSynthesisUtterance | null {
  if (!('speechSynthesis' in window) || !text.trim()) {
    onEnd?.()
    return null
  }

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = TTS_CONFIG.lang
  utterance.rate = TTS_CONFIG.rate
  utterance.pitch = TTS_CONFIG.pitch
  utterance.volume = TTS_CONFIG.volume

  const voice = selectBestVoice()
  if (voice) utterance.voice = voice

  if (onEnd) utterance.onend = onEnd

  window.speechSynthesis.speak(utterance)
  return utterance
}
