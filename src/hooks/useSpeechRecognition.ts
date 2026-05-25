import { useRef, useCallback, useEffect } from 'react'

const SpeechRecognitionAPI =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  start: () => void
  stop: () => void
  isListening: boolean
  error: string | null
}

export function useSpeechRecognition(
  onResult: (transcript: string) => void,
  onError?: (error: string) => void
): UseSpeechRecognitionReturn {
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)

  const isSupported = !!SpeechRecognitionAPI

  const start = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      onError?.('您的浏览器不支持语音识别，请使用Chrome浏览器')
      return
    }

    try {
      const recognition = new SpeechRecognitionAPI()
      recognition.lang = 'zh-CN'
      recognition.interimResults = true
      recognition.continuous = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript
          }
        }
        if (finalTranscript) {
          onResult(finalTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          onError?.('没有听到您说话，请再试一次')
        } else if (event.error === 'audio-capture') {
          onError?.('无法访问麦克风，请检查权限设置')
        } else if (event.error !== 'aborted') {
          onError?.(`语音识别出错: ${event.error}`)
        }
        isListeningRef.current = false
      }

      recognition.onend = () => {
        isListeningRef.current = false
      }

      recognitionRef.current = recognition
      recognition.start()
      isListeningRef.current = true
    } catch (err) {
      onError?.('语音识别启动失败')
    }
  }, [onResult, onError])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
      isListeningRef.current = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  return {
    isSupported,
    start,
    stop,
    isListening: isListeningRef.current,
    error: null,
  }
}