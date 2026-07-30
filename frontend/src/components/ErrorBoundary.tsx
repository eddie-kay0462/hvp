import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Catches render-time errors so a thrown component shows a readable message
 * instead of a blank white page. Without this, any throw in any route — or a
 * lazy() chunk that fails to load after a deploy — unmounts the whole tree
 * silently, leaving nothing on screen and nothing to report.
 *
 * Must be a class component: there is no hook equivalent for componentDidCatch.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the full detail in the console for whoever is debugging
    console.error('[ErrorBoundary]', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    // A failed dynamic import usually means the deployed chunks moved under a
    // tab that was open across a deploy — reloading genuinely fixes it, so say so.
    const isChunkError =
      /dynamically imported module|Importing a module script failed|Loading chunk/i.test(
        error.message
      );

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-2xl space-y-4">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground">
            {isChunkError
              ? 'This page failed to load, most likely because the app was updated while this tab was open. Reloading should fix it.'
              : 'This page hit an unexpected error and could not be displayed.'}
          </p>

          <div className="rounded-lg border bg-muted/40 p-4 overflow-x-auto">
            <p className="font-mono text-sm break-words">{error.message}</p>
            {componentStack && (
              <pre className="mt-3 text-xs text-muted-foreground whitespace-pre-wrap">
                {componentStack.trim()}
              </pre>
            )}
          </div>

          <Button onClick={this.handleReload}>Reload the page</Button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
