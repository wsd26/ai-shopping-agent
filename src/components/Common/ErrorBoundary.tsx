import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center text-2xl">
                😵
              </div>
              <h2 className="text-white text-lg font-semibold mb-2">页面出错了</h2>
              <p className="text-white/50 text-sm mb-4">
                抱歉，页面遇到了一些问题。请尝试刷新页面。
              </p>
              <p className="text-red-400/50 text-xs mb-6 line-clamp-2">
                {this.state.error?.message}
              </p>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                  window.location.reload()
                }}
                className="px-6 py-2.5 rounded-full bg-kuaishou-orange text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                刷新页面
              </button>
            </div>
          </div>
        )
      )
    }
    return this.props.children
  }
}
