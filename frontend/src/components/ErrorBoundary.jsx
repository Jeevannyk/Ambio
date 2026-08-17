import React from 'react';
import { ArrowClockwise } from '@phosphor-icons/react';
import './ErrorBoundary.css';

// A stale tab after a redeploy asks for a chunk filename that no longer exists,
// so the dynamic import behind a lazy() route rejects. Worth telling apart from
// a plain render crash: the remedy (reload to pick up the new build) is the same
// button, but the copy shouldn't imply the app is broken.
const CHUNK_ERROR = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror/i;
const isChunkError = (err) => CHUNK_ERROR.test(String((err && err.message) || err || ''));

class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[Ambio] Render error caught by boundary:', error, info.componentStack);
  }

  // React re-throws a rejected lazy() import during render, so those already
  // land in getDerivedStateFromError. Chunk loads that reject outside the render
  // path (Vite's module preload helper) never reach React at all — they only
  // ever surface as an unhandled rejection, so pick those up here.
  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleRejection);
  }

  handleRejection = (event) => {
    if (this.state.error || !isChunkError(event.reason)) return;
    console.error('[Ambio] Chunk load failed:', event.reason);
    this.setState({ error: event.reason });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stale = isChunkError(error);
    return (
      <div className="error-boundary" role="alert">
        <div className="error-boundary__card">
          <span className="error-boundary__eyebrow">
            {stale ? 'New version available' : 'Something went wrong'}
          </span>
          <h1 className="error-boundary__title">
            {stale ? 'Ambio moved on without this tab.' : 'This screen stopped loading.'}
          </h1>
          <p className="error-boundary__body">
            {stale
              ? 'A newer build went live while this tab was open. A reload picks it up — nothing of yours is lost.'
              : 'Something broke while drawing this page. A reload usually clears it.'}
          </p>
          <button
            type="button"
            className="error-boundary__action"
            onClick={() => window.location.reload()}
          >
            <ArrowClockwise size={16} weight="bold" />
            <span>Reload Ambio</span>
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
