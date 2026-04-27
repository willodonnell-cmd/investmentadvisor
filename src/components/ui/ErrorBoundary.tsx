import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  label?: string
}

interface State {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {}

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="border border-red-900/40 bg-red-950/20 rounded-xl px-4 py-3">
          <p className="text-[11px] text-danger font-medium mb-0.5">
            {this.props.label ?? 'Section failed to render'}
          </p>
          <p className="text-[10px] text-text-muted">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="text-[10px] text-accent hover:underline mt-1"
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
