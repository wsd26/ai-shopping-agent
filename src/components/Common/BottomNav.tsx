import { useCartStore } from '../../store/useCartStore'

export function BottomNav() {
  const itemCount = useCartStore((s) => s.items.length)
  const toggleCart = useCartStore((s) => s.toggleDrawer)

  return (
    <div className="absolute bottom-0 left-0 right-0 h-12 bg-black/40 backdrop-blur-md border-t border-white/10 flex items-center justify-around px-4 z-20">
      <NavItem icon="🏠" label="首页" />
      <button onClick={() => toggleCart()} className="flex flex-col items-center gap-0.5 relative">
        <span className="text-lg">🛒</span>
        <span className="text-[10px] text-white/60">购物车</span>
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-kuaishou-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce-in">
            {itemCount}
          </span>
        )}
      </button>
      <NavItem icon="📤" label="分享" />
      <NavItem icon="❤️" label="点赞" />
    </div>
  )
}

function NavItem({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="flex flex-col items-center gap-0.5">
      <span className="text-lg">{icon}</span>
      <span className="text-[10px] text-white/60">{label}</span>
    </button>
  )
}