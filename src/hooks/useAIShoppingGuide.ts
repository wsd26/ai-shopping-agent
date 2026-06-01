import { useCallback, useRef } from 'react'
import { useConversationStore } from '../store/useConversationStore'
import { useLiveStreamStore } from '../store/useLiveStreamStore'
import { useUserStore } from '../store/useUserStore'
import { useCartStore } from '../store/useCartStore'
import { useSpeechSynthesis } from './useSpeechSynthesis'
import { shoppingAgent } from '../agents/ShoppingAgent'
import { monitorAgent } from '../agents/MonitorAgent'
import { activityClock } from '../agents/activityClock'
import type { Product } from '../types'

export function useAIShoppingGuide() {
  const {
    messages,
    addUserMessage,
    addAIMessage,
    addAgentObservation,
    setThinking,
    setSpeaking,
    setError,
    setAgentMode,
    autoObserve,
  } = useConversationStore()

  const currentProduct = useLiveStreamStore((s) => s.currentProduct)
  const addHostQuestion = useLiveStreamStore((s) => s.addHostQuestion)
  const conversationId = useConversationStore((s) => s.conversationId)
  const addItem = useCartStore((s) => s.addItem)
  const userPreferences = useUserStore((s) => s.preferences)
  const { speak, stop } = useSpeechSynthesis()
  const processingRef = useRef(false)

  const doHandleUserInput = useCallback(
    async (transcript: string, inputType: 'voice' | 'text') => {
      if (processingRef.current) return
      processingRef.current = true

      stop()
      setSpeaking(false)
      setError(null)
      addUserMessage(transcript, inputType)
      setThinking(true)
      setAgentMode('analyzing')

      try {
        const recentMessages = messages.slice(-6).map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          timestamp: m.timestamp,
        }))

        // Try LLM first, fallback to regex on any error
        let output = await shoppingAgent.processLLM({
          userText: transcript,
          currentProduct,
          userPreferences,
          recentMessages,
        })

        setThinking(false)
        setAgentMode('idle')

        // Consume response
        addAIMessage(output.text, output.productCard, output.quickReplies)

        // Execute action
        if (output.action) {
          switch (output.action.type) {
            case 'add_to_cart': {
              const product = currentProduct
              if (product) addItem(product)
              break
            }
            case 'escalate_to_host':
              addHostQuestion(output.action.question)
              break
            case 'toggle_monitor':
              monitorAgent.setEnabled(output.action.enable)
              break
          }
        }

        if (output.needHostHelp) {
          addHostQuestion(transcript)
        }

        // Speak response — touch clock on end so cooldown starts after TTS finishes
        setSpeaking(true)
        speak(output.text, () => {
          setSpeaking(false)
          activityClock.touch()
        })
      } catch {
        setThinking(false)
        setAgentMode('idle')
        setError('网络连接失败，请重试')
      } finally {
        processingRef.current = false
      }
    },
    [
      messages,
      currentProduct,
      userPreferences,
      conversationId,
      addUserMessage,
      addAIMessage,
      addItem,
      addHostQuestion,
      setThinking,
      setSpeaking,
      setError,
      setAgentMode,
      speak,
      stop,
    ]
  )

  const handleUserVoice = useCallback(
    (transcript: string) => doHandleUserInput(transcript, 'voice'),
    [doHandleUserInput]
  )

  const handleUserText = useCallback(
    (text: string) => {
      if (!text.trim()) return
      doHandleUserInput(text, 'text')
    },
    [doHandleUserInput]
  )

  // Auto-observation via MonitorAgent — called on product switch
  const runAgentObservation = useCallback(
    (product: Product) => {
      if (!autoObserve) return
      if (processingRef.current) return
      if (!userPreferences || Object.keys(userPreferences).length === 0) return

      setAgentMode('analyzing')

      const result = monitorAgent.observeProduct(product, userPreferences, -1)

      if (result.shouldPush && result.recommendation) {
        setAgentMode('recommending')
        addAgentObservation(result.recommendation.text, result.recommendation.productCard)
        setSpeaking(true)
        speak(result.recommendation.text, () => {
          setSpeaking(false)
        })
        setTimeout(() => setAgentMode('idle'), 2000)
      } else {
        setAgentMode('observing')
      }
    },
    [autoObserve, userPreferences, setAgentMode, addAgentObservation, speak, setSpeaking]
  )

  return {
    handleUserVoice,
    handleUserText,
    runAgentObservation,
    stopSpeaking: stop,
    isProcessing: processingRef.current,
  }
}
