import { useMemo } from 'react'
import { useLiveStreamStore } from '../../store/useLiveStreamStore'

interface LiveStreamPlayerProps {
  onClick?: () => void
}

export function LiveStreamPlayer({ onClick }: LiveStreamPlayerProps) {
  const currentProduct = useLiveStreamStore((s) => s.currentProduct)
  const host = useLiveStreamStore((s) => s.host)

  const gradient = useMemo(() => {
    const colors = [
      'from-purple-900 via-pink-800 to-orange-700',
      'from-blue-900 via-purple-800 to-pink-700',
      'from-emerald-900 via-teal-800 to-cyan-700',
      'from-rose-900 via-red-800 to-amber-700',
      'from-indigo-900 via-violet-800 to-fuchsia-700',
    ]
    return colors[Math.floor(Math.random() * colors.length)]
  }, [])

  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center cursor-pointer`}
      onClick={onClick}
    >
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/5 blur-xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 rounded-full bg-white/5 blur-xl" />

      <div className="text-center z-10">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-3xl animate-float shadow-lg border border-white/10">
          {host.avatar}
        </div>
        {currentProduct && (
          <div className="bg-black/30 backdrop-blur-md rounded-2xl px-5 py-4 mx-8 shadow-xl border border-white/10 max-w-[280px]">
            <img
              src={currentProduct.imageUrl}
              alt={currentProduct.name}
              className="w-24 h-24 mx-auto mb-3 rounded-xl object-cover shadow-md bg-white/5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
            <p className="text-white/90 font-bold text-base mb-1">{currentProduct.name}</p>
            <p className="text-kuaishou-orange font-bold text-xl">¥{currentProduct.price}</p>
            <p className="text-white/30 text-xs line-through mt-0.5">原价¥{currentProduct.originalPrice}</p>
            <p className="text-white/20 text-[10px] mt-2">点击查看详情</p>
          </div>
        )}
      </div>

      <div className="absolute top-3 right-14 z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
        LIVE
      </div>
    </div>
  )
}