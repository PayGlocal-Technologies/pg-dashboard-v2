"use client";

import { useEffect } from "react";
import "@/app/globals.css";

function extractComponentNames(stack: string | undefined): string[] {
  if (!stack) return [];
  return stack
    .split("\n")
    .map((line) => {
      const match = line.match(/\s+at\s+([^(]+)/);
      return match ? match[1].trim() : null;
    })
    .filter((name): name is string => name !== null);
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const pagePath = typeof window !== "undefined" ? window.location.pathname : "";
    fetch("/gcc/v3/error/gcc-ui", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        errorMessage: error.message,
        stackTrace: extractComponentNames(error.stack),
        pagePath,
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-sm">
            <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
              {/* Icon — inline SVG since the icon registry isn't available outside the root layout */}
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-amber-100 bg-amber-50">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-amber-500"
                  aria-hidden="true"
                >
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                </svg>
              </div>

              <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A critical error occurred. The issue has been reported and our team has been
                notified.
              </p>

              {error.digest && (
                <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">Error ID:</span>
                  <code className="font-mono text-xs text-muted-foreground">{error.digest}</code>
                </div>
              )}

              <button
                onClick={reset}
                className="mt-6 w-full rounded-lg border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
              >
                Try again
              </button>
            </div>

            <p className="mt-5 text-center text-xs text-muted-foreground/50">PayGlocal Dashboard</p>
          </div>
        </div>
      </body>
    </html>
  );
}
