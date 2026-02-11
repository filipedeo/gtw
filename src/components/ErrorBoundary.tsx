import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <div className="error-boundary-icon">!</div>
            <h2 className="error-boundary-title">Something went wrong</h2>
            <p className="error-boundary-message">
              An unexpected error occurred. Please try again.
            </p>
            {this.state.error && (
              <details className="error-boundary-details">
                <summary>Error details</summary>
                <pre>{this.state.error.message}</pre>
              </details>
            )}
            <button
              onClick={this.handleRetry}
              className="error-boundary-retry-btn"
            >
              Try Again
            </button>
          </div>
          <style>{`
            .error-boundary-container {
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 200px;
              padding: 2rem;
            }

            .error-boundary-content {
              text-align: center;
              max-width: 400px;
            }

            .error-boundary-icon {
              width: 48px;
              height: 48px;
              margin: 0 auto 1rem;
              background-color: var(--error);
              color: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.5rem;
              font-weight: bold;
            }

            .error-boundary-title {
              color: var(--text-primary);
              font-size: 1.25rem;
              font-weight: 600;
              margin: 0 0 0.5rem;
            }

            .error-boundary-message {
              color: var(--text-secondary);
              font-size: 0.875rem;
              margin: 0 0 1rem;
            }

            .error-boundary-details {
              text-align: left;
              margin-bottom: 1rem;
              padding: 0.75rem;
              background-color: var(--bg-tertiary);
              border-radius: 0.5rem;
              font-size: 0.75rem;
            }

            .error-boundary-details summary {
              color: var(--text-secondary);
              cursor: pointer;
              font-weight: 500;
            }

            .error-boundary-details pre {
              margin: 0.5rem 0 0;
              color: var(--error);
              white-space: pre-wrap;
              word-break: break-word;
            }

            .error-boundary-retry-btn {
              background-color: var(--accent-primary);
              color: white;
              padding: 0.5rem 1.5rem;
              border-radius: 0.5rem;
              font-weight: 500;
              border: none;
              cursor: pointer;
              transition: background-color 0.2s;
            }

            .error-boundary-retry-btn:hover {
              background-color: var(--accent-hover);
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
