import { useLiveStreamStore } from '../../store/useLiveStreamStore'
import { formatSalesCount } from '../../utils/format'

export function HostInfoBar() {
  const host = useLiveStreamStore((s) => s.host)
  const viewerCount = useLiveStreamStore((s) => s.viewerCount)

  return (
    <div className="absolute top-8 left-3 z-10 flex items-center gap-2">
      <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-full px-3 py-1.5">
        <span className="text-lg">{host.avatar}</span>
        <div>
          <p className="text-white text-xs font-medium leading-tight">{host.name}</p>
          <p className="text-white/50 text-[10px] leading-tight">{formatSalesCount(host.followers)}粉丝</p>
        </div>
      </div>
      <div className="bg-black/30 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-white text-xs">{formatSalesCount(viewerCount)}观看</span>
      </div>
    </div>
  )
}