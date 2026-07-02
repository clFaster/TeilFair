import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches unexpected render errors anywhere in the tree and shows a
 * recoverable fallback UI instead of a blank page.
 *
 * Uses the i18n instance directly (not hooks) because error boundaries
 * must be class components and should not depend on providers that may
 * themselves have crashed.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Unhandled application error:', error, errorInfo);
    }
  }

  handleReload = () => {
    globalThis.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="app">
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
          }}
        >
          <div className="card text-center" style={{ maxWidth: '400px' }} role="alert">
            <h2 style={{ marginBottom: '8px' }}>{i18n.t('errorBoundary.title')}</h2>
            <p className="text-secondary mb-4">{i18n.t('errorBoundary.description')}</p>
            <button className="btn btn-primary" onClick={this.handleReload}>
              {i18n.t('errorBoundary.reload')}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
