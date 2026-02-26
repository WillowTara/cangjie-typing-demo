import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from './logger'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  public static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  public state: AppErrorBoundaryState = {
    hasError: false,
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logger.error('React render error captured by boundary', {
      context: 'AppErrorBoundary',
      error,
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    })
  }

  private reloadPage = () => {
    window.location.reload()
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <section className="result-screen" role="alert" aria-live="assertive">
          <h2 className="result-title">發生未預期錯誤</h2>
          <p className="source-text">請重新整理後再試一次。</p>
          <div className="result-actions">
            <button type="button" className="btn-primary" onClick={this.reloadPage}>
              重新整理
            </button>
          </div>
        </section>
      )
    }

    return this.props.children
  }
}
