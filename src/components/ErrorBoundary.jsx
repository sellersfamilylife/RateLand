import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error, errorInfo, showDetails } = this.state;

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg">
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="mb-6 text-sm text-gray-500">
            An unexpected error occurred. Please reload the page to try again.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="rounded bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Reload Page
          </button>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
              className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
            >
              {showDetails ? 'Hide error details ▲' : 'Show error details ▼'}
            </button>

            {showDetails && (
              <pre className="mt-3 max-h-48 overflow-auto rounded bg-gray-100 p-3 text-left text-xs text-red-700">
                {error?.message}
                {errorInfo?.componentStack}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }
}
