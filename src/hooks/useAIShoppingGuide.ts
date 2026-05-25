import { useCallback, useRef, useEffect } from 'react'
import { useConversationStore } from '../store/useConversationStore'
import { useLiveStreamStore } from '../store/useLiveStreamStore'
import { useUserStore } from '../store/useUserStore'
import { useCartStore } from '../store/useCartStore'
import { useSpeechSynthesis } from './useSpeechSynthesis'
import { agentBus } from '../agents/AgentBus'
import { monitorAgent } from '../agents/MonitorAgent'
import type { Product } from '../types'
import type { AgentMessage } from '../agents/types'

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
  const userPreferences = useUserStore((s) => s.preferences)
  const conversationId = useConversationStore((s) => s.conversationId)
  const addItem = useCartStore((s) => s.addItem)
  const { speak, stop } = useSpeechSynthesis()
  const processingRef = useRef(false)

  // Refs for store actions — keeps UI handler closure fresh
  const currentProductRef = useRef(currentProduct)
  currentProductRef.current = currentProduct
  const addItemRef = useRef(addItem)
  addItemRef.current = addItem
  const addHostQuestionRef = useRef(addHostQuestion)
  addHostQuestionRef.current = addHostQuestion
  const addAIMessageRef = useRef(addAIMessage)
  addAIMessageRef.current = addAIMessage
  const addAgentObservationRef = useRef(addAgentObservation)
  addAgentObservationRef.current = addAgentObservation
  const setThinkingRef = useRef(setThinking)
  setThinkingRef.current = setThinking
  const setSpeakingRef = useRef(setSpeaking)
  setSpeakingRef.current = setSpeaking
  const speakRef = useRef(speak)
  speakRef.current = speak

  // Wire up AgentBus → UI: process agent_response messages
  useEffect(() => {
    agentBus.onUI((msg: AgentMessage) => {
      if (msg.type === 'agent_response') {
        const { response, userText, shouldNotify } = msg.payload
        if (!response) return

        setThinkingRef.current(false)
        setSpeakingRef.current(false)

        if (shouldNotify) {
          addAgentObservationRef.current(response.text, response.productCard)
        } else {
          addAIMessageRef.current(response.text, response.productCard, response.quickReplies)
        }

        if (response.action?.type === 'add_to_cart' && currentProductRef.current) {
          addItemRef.current(currentProductRef.current)
        }

        if (response.needHostHelp && userText) {
          addHostQuestionRef.current(userText)
        }

        setSpeakingRef.current(true)
        speakRef.current(response.text, () => {
          setSpeakingRef.current(false)
        })
      }

      if (msg.type === 'status_update') {
        const { reasoning } = msg.payload
        if (reasoning?.includes('意图分析')) {
          setAgentMode('analyzing')
        }
      }
    })
  }, [setAgentMode])

  const handleUserVoice = useCallback(
    async (transcript: string) => {
      if (processingRef.current) return
      processingRef.current = true

      stop()
      setSpeaking(false)
      setError(null)
      addUserMessage(transcript, 'voice')
      setThinking(true)
      setAgentMode('analyzing')

      try {
        await agentBus.dispatch({
          from: 'ui',
          to: 'orchestrator',
          type: 'user_input',
          payload: {
            userText: transcript,
            currentProduct,
            userPreferences,
            messages: messages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.timestamp,
            })),
            conversationId,
          },
          priority: 'normal',
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
      setThinking,
      setSpeaking,
      setError,
      setAgentMode,
      stop,
    ]
  )

  const handleUserText = useCallback(
    async (text: string) => {
      if (processingRef.current || !text.trim()) return
      processingRef.current = true

      stop()
      setSpeaking(false)
      setError(null)
      addUserMessage(text, 'text')
      setThinking(true)
      setAgentMode('analyzing')

      try {
        await agentBus.dispatch({
          from: 'ui',
          to: 'orchestrator',
          type: 'user_input',
          payload: {
            userText: text,
            currentProduct,
            userPreferences,
            messages: messages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
              timestamp: m.timestamp,
            })),
            conversationId,
          },
          priority: 'normal',
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
      setThinking,
      setSpeaking,
      setError,
      setAgentMode,
      stop,
    ]
  )

  // Agent: Auto-observation via MonitorAgent
  const runAgentObservation = useCallback(
    (product: Product) => {
      if (!autoObserve) return
      if (processingRef.current) return
      if (!userPreferences || Object.keys(userPreferences).length === 0) return

      setAgentMode('analyzing')

      const result = monitorAgent.observeProduct(product, userPreferences, -1)

      if (result.shouldNotify) {
        setAgentMode('recommending')
        setTimeout(() => {
          setAgentMode('idle')
        }, 2000)
      } else {
        setAgentMode('observing')
      }
    },
    [autoObserve, userPreferences, setAgentMode]
  )

  return {
    handleUserVoice,
    handleUserText,
    runAgentObservation,
    stopSpeaking: stop,
    isProcessing: processingRef.current,
  }
}
