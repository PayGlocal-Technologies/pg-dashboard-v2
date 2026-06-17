"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon/Icon";
import { Button } from "@/components/ui";
import { useErrorReporting } from "@/hooks/useErrorReporting";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useErrorReporting(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm text-center page-enter">
          {/* Icon */}
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-amber-100 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/40">
            <Icon name="alert-triangle" size={24} className="text-amber-500" />
          </div>

          {/* Heading */}
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We hit an unexpected error. The issue has been reported and our team has been
            notified.
          </p>

          {/* Error digest */}
          {error.digest && (
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5">
              <span className="text-xs text-muted-foreground">Error ID:</span>
              <code className="font-mono text-xs text-muted-foreground">{error.digest}</code>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => router.back()}>
              Go back
            </Button>
            <Button className="flex-1" onClick={reset}>
              Try again
            </Button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground/50">PayGlocal Dashboard</p>
      </div>
    </div>
  );
}
