interface ErrorBannerProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorBanner({ message, onRetry, onDismiss }: ErrorBannerProps) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 mx-3 mb-2 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
      <span className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        {message}
      </span>
      <div className="flex gap-2 shrink-0">
        {onRetry && (
          <button onClick={onRetry} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors whitespace-nowrap">
            重试
          </button>
        )}
        {onDismiss && (
          <button onClick={onDismiss} className="text-red-400 hover:text-red-300">
            ✕
          </button>
        )}
      </div>
    </div>
  )
}