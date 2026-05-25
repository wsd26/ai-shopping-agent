import { motion } from 'framer-motion'
import { useLiveStreamStore } from '../../store/useLiveStreamStore'

export function ProductNavButtons() {
  const productHistory = useLiveStreamStore((s) => s.productHistory)
  const upcomingProducts = useLiveStreamStore((s) => s.upcomingProducts)
  const nextProduct = useLiveStreamStore((s) => s.nextProduct)
  const prevProduct = useLiveStreamStore((s) => s.prevProduct)

  return (
    <div className="absolute top-1/3 left-0 right-0 z-15 flex justify-between px-2 pointer-events-none">
      {/* Prev button */}
      {productHistory.length > 0 && (
        <motion.button
          className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={prevProduct}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </motion.button>
      )}

      {/* Next button */}
      {upcomingProducts.length > 0 && (
        <motion.button
          className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/80 ml-auto"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={nextProduct}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </motion.button>
      )}
    </div>
  )
}