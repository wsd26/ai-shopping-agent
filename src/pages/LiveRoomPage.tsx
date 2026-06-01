import { useEffect, useRef, useState, useCallback } from 'react'
import { MobileFrame } from '../components/Layout/MobileFrame'
import { LiveStreamPlayer } from '../components/LiveStream/LiveStreamPlayer'
import { HostInfoBar } from '../components/LiveStream/HostInfoBar'
import { CurrentProductTag } from '../components/LiveStream/CurrentProductTag'
import { LiveCommentsFeed } from '../components/LiveStream/LiveCommentsFeed'
import { LikeHeartAnimation } from '../components/LiveStream/LikeHeartAnimation'
import { ProductNavButtons } from '../components/LiveStream/ProductNavButtons'
import { QuestionBoard } from '../components/LiveStream/QuestionBoard'
import { AIGuidePanel } from '../components/AIGuide/AIGuidePanel'
import { AIGuideAvatar } from '../components/AIGuide/AIGuideAvatar'
import { BottomNav } from '../components/Common/BottomNav'
import { CartDrawer } from '../components/Cart/CartDrawer'
import { ProductDetailSheet } from '../components/Product/ProductDetailSheet'
import { useLiveStreamStore } from '../store/useLiveStreamStore'
import { useConversationStore } from '../store/useConversationStore'
import { useUserStore } from '../store/useUserStore'
import { monitorAgent } from '../agents/MonitorAgent'
import { activityClock } from '../agents/activityClock'
import { speakText } from '../utils/ttsConfig'
import type { Product } from '../types'

const AUTO_ROTATE_INTERVAL = 15000

export default function LiveRoomPage() {
  const currentProduct = useLiveStreamStore((s) => s.currentProduct)
  const productIndex = useLiveStreamStore((s) => s.productIndex)
  const upcomingProducts = useLiveStreamStore((s) => s.upcomingProducts)
  const nextProduct = useLiveStreamStore((s) => s.nextProduct)
  const autoObserve = useConversationStore((s) => s.autoObserve)
  const setAutoObserve = useConversationStore((s) => s.setAutoObserve)
  const userPreferences = useUserStore((s) => s.preferences)
  const setAgentMode = useConversationStore((s) => s.setAgentMode)
  const setSpeaking = useConversationStore((s) => s.setSpeaking)
  const prevProductIdRef = useRef<string | null>(null)
  const greetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Product detail sheet state
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const openDetail = useCallback((product: Product) => {
    setDetailProduct(product)
    setIsDetailOpen(true)
  }, [])

  const closeDetail = useCallback(() => setIsDetailOpen(false), [])

  // Preload voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
    }
    return () => {
      if (greetTimerRef.current) clearTimeout(greetTimerRef.current)
    }
  }, [])

  // Auto-rotate products (simulate live stream)
  useEffect(() => {
    if (upcomingProducts.length === 0) return

    const timer = setInterval(() => {
      nextProduct()
    }, AUTO_ROTATE_INTERVAL)

    return () => clearInterval(timer)
  }, [upcomingProducts.length, nextProduct])

  // Agent: Auto-observe when product changes (via MonitorAgent)
  useEffect(() => {
    if (!currentProduct) return
    if (currentProduct.id === prevProductIdRef.current) return
    prevProductIdRef.current = currentProduct.id

    if (!autoObserve) return
    if (!userPreferences || Object.keys(userPreferences).length === 0) return
    if (productIndex === 0) return

    // Check activity cooldown via activityClock (replaces AgentBus conflict detection)
    if (activityClock.isUserActive()) {
      setAgentMode('observing')
      return
    }

    setAgentMode('analyzing')

    const result = monitorAgent.observeProduct(currentProduct, userPreferences, productIndex)

    if (result.shouldPush && result.recommendation) {
      setAgentMode('recommending')
      // Add observation to conversation and speak
      useConversationStore.getState().addAgentObservation(
        result.recommendation.text,
        result.recommendation.productCard
      )
      if ('speechSynthesis' in window) {
        setSpeaking(true)
        speakText(result.recommendation.text, () => setSpeaking(false))
      }
      const timer = setTimeout(() => {
        setAgentMode('idle')
        useConversationStore.getState().setPanelState('half')
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      setAgentMode('observing')
    }
  }, [currentProduct?.id])

  // Agent proactive prompts: after 60s idle, nudge user
  useEffect(() => {
    const idleMs = 60000
    const messages = useConversationStore.getState().messages
    if (messages.length === 0) return

    const timer = setInterval(() => {
      const idleTime = activityClock.idleTime()
      if (idleTime >= idleMs) {
        const prompts = [
          { text: '亲，还在看吗？需要小快帮你找什么吗？', replies: ['现在有什么商品？', '帮我推荐好物', '不用了'] },
          { text: '小快一直在帮你盯着呢～有需要随时喊我！', replies: ['推荐个适合我的', '购物车里有什么？'] },
          { text: '直播间还在直播中哦，想了解哪个商品直接问我～', replies: ['看看当前商品', '有没有优惠的？'] },
        ]
        const prompt = prompts[Math.floor(Math.random() * prompts.length)]
        useConversationStore.getState().addAIMessage(prompt.text, undefined, prompt.replies)
        useConversationStore.getState().setPanelState('half')
      }
    }, idleMs)

    return () => clearInterval(timer)
  }, [])

  // Initial greeting from Agent
  useEffect(() => {
    const hasMessages = useConversationStore.getState().messages.length > 0
    if (hasMessages) return

    setAutoObserve(true)

    greetTimerRef.current = setTimeout(() => {
      const greetingText = currentProduct
        ? `你好亲！我是你的AI导购小快。我会主动帮你监控直播间，找到最适合你的商品。当前展示的是"${currentProduct.name}"，有问题随时语音问我！`
        : '你好亲！我是你的AI导购小快。我会主动帮你监控直播间，自动分析每个商品是否适合你。开启自动监控后，有好物我会立刻通知你～'

      useConversationStore.getState().addAIMessage(
        greetingText,
        undefined,
        ['帮我盯着直播间', '现在有什么商品？', '怎么使用？']
      )

      if ('speechSynthesis' in window) {
        setSpeaking(true)
        speakText(greetingText, () => setSpeaking(false))
      }
    }, 1000)

    return () => {
      if (greetTimerRef.current) clearTimeout(greetTimerRef.current)
    }
  }, [])

  const handleProductCardClick = useCallback(() => {
    if (currentProduct) {
      openDetail(currentProduct)
    }
  }, [currentProduct, openDetail])

  return (
    <MobileFrame>
      {/* Live Stream */}
      <LiveStreamPlayer onClick={handleProductCardClick} />
      <HostInfoBar />
      <CurrentProductTag onClick={handleProductCardClick} />
      <LiveCommentsFeed />
      <LikeHeartAnimation />
      <ProductNavButtons />
      <QuestionBoard />

      {/* Product indicator dots */}
      <ProductDots />

      {/* AI Guide */}
      <AIGuideAvatar />
      <AIGuidePanel onProductClick={openDetail} />

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        product={detailProduct}
        isOpen={isDetailOpen}
        onClose={closeDetail}
      />

      {/* Cart */}
      <CartDrawer />

      {/* Bottom Nav */}
      <BottomNav />
    </MobileFrame>
  )
}

function ProductDots() {
  const productIndex = useLiveStreamStore((s) => s.productIndex)
  const totalProducts = 8

  return (
    <div className="absolute top-20 right-3 z-10 flex flex-col gap-1.5">
      {Array.from({ length: totalProducts }).map((_, i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
            i === productIndex
              ? 'bg-kuaishou-orange w-4'
              : i < productIndex
              ? 'bg-white/30'
              : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}
