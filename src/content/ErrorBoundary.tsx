import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Called with the failing key (e.g. repoKey) so the caller can clear any bad cached state on retry. */
  onReset?: () => void
}

interface State {
  error: Error | null
}

/**
 * Without this, an uncaught render error anywhere below (e.g. a future data-
 * shape bug) unmounts React's entire tree, which — since the toggle button
 * and the panel live under the same root — silently erases the sidebar
 * itself with no visible sign anything went wrong. This confines a crash to
 * a recoverable message instead, and keeps the toggle button (rendered
 * outside this boundary in Sidebar) always clickable.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('Code Navigator render error', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="cn-error-block">
          Something went wrong rendering this view.
          <div className="cn-muted" style={{ marginTop: 6 }}>{this.state.error.message}</div>
          <button
            className="cn-flow-btn"
            style={{ marginTop: 10 }}
            onClick={() => {
              this.props.onReset?.()
              this.setState({ error: null })
            }}
          >
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
