import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '../../store/useCartStore'
import { CartItemRow } from './CartItemRow'
import { EmptyState } from '../Common/EmptyState'
import { formatPrice } from '../../utils/format'

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isDrawerOpen)
  const toggleDrawer = useCartStore((s) => s.toggleDrawer)
  const items = useCartStore((s) => s.items)
  const totalAmount = useCartStore((s) => s.totalAmount)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="absolute inset-0 bg-black/60 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => toggleDrawer(false)}
          />
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-40 rounded-t-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(20,20,30,0.98) 0%, rgba(10,10,18,1) 100%)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255,255,255,0.08)',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0, height: '65%' }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                <h3 className="text-white font-medium">购物车 ({items.length})</h3>
                <button onClick={() => toggleDrawer(false)} className="text-white/40 text-lg">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3">
                {items.length === 0 ? (
                  <EmptyState title="购物车空空如也" description="让小快帮您挑选好物吧～" icon="🛒" />
                ) : (
                  items.map((item) => (
                    <CartItemRow key={item.product.id} item={item} />
                  ))
                )}
              </div>

              {items.length > 0 && (
                <div className="px-5 py-4 border-t border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/60 text-sm">合计</span>
                    <span className="text-kuaishou-orange font-bold text-lg">{formatPrice(totalAmount)}</span>
                  </div>
                  <button className="w-full py-3 bg-kuaishou-orange text-white font-medium rounded-xl text-sm hover:bg-orange-600 transition-colors active:scale-[0.98]">
                    立即下单
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}