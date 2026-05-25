interface MobileFrameProps {
  children: React.ReactNode
}

export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="w-full max-w-[390px] h-full max-h-[844px] bg-gray-950 rounded-[40px] overflow-hidden shadow-2xl border-2 border-gray-800 relative flex flex-col">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-50 flex items-center justify-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-800" />
        </div>
        <div className="flex-1 relative overflow-hidden">
          {children}
        </div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-28 h-1 bg-gray-700 rounded-full z-50" />
      </div>
    </div>
  )
}