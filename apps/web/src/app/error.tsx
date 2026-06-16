"use client";

import { useEffect } from "react";

// Global error boundary. Catches render/runtime errors in the App Router and
// shows a recoverable fallback instead of a blank screen.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface to the console (and Sentry, when configured, via instrumentation).
    console.error("[ui] render error", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card max-w-md text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h1 className="text-lg font-bold mb-2">Something went wrong</h1>
        <p className="text-muted text-sm mb-4">
          An unexpected error occurred. You can retry, or head back to the dashboard.
        </p>
        {error.digest && <p className="text-[11px] text-slate-600 mb-4">Ref: {error.digest}</p>}
        <div className="flex gap-2 justify-center">
          <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
          <a className="btn btn-ghost" href="/dashboard">Dashboard</a>
        </div>
      </div>
    </div>
  );
}
