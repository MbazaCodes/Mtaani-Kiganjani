import React, { Component, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: React.ReactNode;
  lang?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    // Auto-reload on stale chunk errors (happens after deployment when user has old JS cached)
    const isChunkError =
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Importing a module script failed") ||
      error?.message?.includes("Loading chunk") ||
      error?.message?.includes("Loading CSS chunk");
    if (isChunkError && !sessionStorage.getItem("chunk_reload_attempted")) {
      sessionStorage.setItem("chunk_reload_attempted", "1");
      window.location.reload();
      return;
    }
  }

  render() {
    if (this.state.hasError) {
      const sw = this.props.lang === "sw";
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-red-500" />
            </div>
            <h1 className="text-xl font-black text-stone-900 mb-2">
              {sw ? "Hitilafu Imetokea" : "Something Went Wrong"}
            </h1>
            <p className="text-sm text-stone-500 mb-6">
              {sw
                ? "Samahani, tatizo la kiufundi limetokea. Tafadhali jaribu tena au rudi ukurasa wa nyumbani."
                : "Sorry, a technical error occurred. Please try again or return to the home page."}
            </p>
            {this.state.error && (
              <p className="text-xs text-stone-400 bg-stone-100 rounded-xl p-3 mb-6 font-mono break-words">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <RefreshCw size={14} />
                {sw ? "Jaribu Tena" : "Try Again"}
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-sm font-bold flex items-center gap-2"
              >
                <Home size={14} />
                {sw ? "Rudi Nyumbani" : "Go Home"}
              </button>
            </div>
            <p className="text-[10px] text-stone-300 mt-8">E-Mtaa · Mtaani Kiganjani</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
