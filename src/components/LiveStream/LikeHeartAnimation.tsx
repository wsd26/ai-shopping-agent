import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Heart {
  id: number
  x: number
  size: number
}

export function LikeHeartAnimation() {
  const [hearts, setHearts] = useState<Heart[]>([])
  const idCounterRef = useRef(0)

  const addHeart = useCallback(
    (e: React.MouseEvent) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const size = 16 + Math.random() * 20
      const heart: Heart = { id: idCounterRef.current++, x, size }
      setHearts((prev) => [...prev.slice(-10), heart])
      setTimeout(() => {
        setHearts((prev) => prev.filter((h) => h.id !== heart.id))
      }, 1500)
    },
    []
  )

  return (
    <div
      className="absolute inset-0 z-20 cursor-pointer"
      onDoubleClick={addHeart}
      onClick={(e) => { if (e.detail === 2) addHeart(e) }}
    >
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ opacity: 1, scale: 0.5, y: 0 }}
            animate={{ opacity: 0, scale: 1.2, y: -200 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="absolute bottom-20 text-red-400 pointer-events-none"
            style={{ left: `${heart.x}%`, fontSize: heart.size }}
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}