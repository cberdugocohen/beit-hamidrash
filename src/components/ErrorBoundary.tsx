"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">משהו השתבש</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-md">
            אירעה שגיאה בלתי צפויה. נסה לרענן את הדף.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 bg-torah-600 hover:bg-torah-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <RotateCw className="w-4 h-4" /> רענן את הדף
          </button>
          {process.env.NODE_ENV === "development" && this.state.error && (
            <pre className="mt-6 text-xs text-red-400 bg-red-50 p-4 rounded-xl max-w-lg overflow-auto text-left" dir="ltr">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
