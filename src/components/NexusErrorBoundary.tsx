import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, FileText } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackText?: string;
  onRecover?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class NexusErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[NexusErrorBoundary] Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="nexus-error-boundary rounded-lg border border-red-500/30 bg-red-500/5 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-red-500 mb-4">
            <AlertCircle size={24} />
            <h3 className="font-bold text-sm uppercase tracking-wider">Component Crash Detected</h3>
          </div>
          
          <p className="text-xs text-red-400/80 mb-6 leading-relaxed">
            The rendering engine encountered a fatal error. Your data is safe, but this visual component cannot be displayed.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-600"
            >
              <RefreshCw size={14} /> Try Reloading
            </button>
            
            {this.props.onRecover && (
              <button
                onClick={this.props.onRecover}
                className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-white/10"
              >
                <FileText size={14} /> Recover to Text
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
