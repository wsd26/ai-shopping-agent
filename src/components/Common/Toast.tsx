import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ToastProps {
  message: string
  visible: boolean
  onClose: () => void
  duration?: number
}

export function Toast({ message, visible, onClose, duration = 2000 }: ToastProps) {
  const [timerId, setTimerId] = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (visible) {
      const id = setTimeout(onClose, duration)
      setTimerId(id)
      return () => clearTimeout(id)
    }
    return undefined
  }, [visible, duration, onClose])

  useEffect(() => {
    return () => {
      if (timerId) clearTimeout(timerId)
    }
  }, [timerId])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-gray-900/90 backdrop-blur-md text-white text-sm rounded-full shadow-lg border border-white/10 whitespace-nowrap"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: '',
    visible: false,
  })

  const showToast = (message: string) => setToast({ message, visible: true })
  const hideToast = () => setToast((t) => ({ ...t, visible: false }))

  return { toast, showToast, hideToast }
}