"use client";

import { useRouter } from "next/navigation";
import { AppImage } from "@/components/common/AppImage";
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
          {/* Illustration */}
          <AppImage
            src="/assets/something-went-wrong.svg"
            alt=""
            width={140}
            height={140}
            unoptimized
            style={{ width: 140, height: 140 }}
            className="mx-auto mb-4"
          />

          {/* Heading */}
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            We hit an unexpected error. The issue has been reported and our team has been notified.
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
