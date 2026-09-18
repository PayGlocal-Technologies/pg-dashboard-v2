"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ZohoConnectBadge } from "@/features/dashboard/zoho-integration/components/ZohoConnectBadge";
import type { ZohoConnectResult } from "@/features/dashboard/zoho-integration/types";

/**
 * The outcome of the OAuth round trip. Opened by the callback resolving, or
 * straight from a `?error=` in the URL when Zoho refused before we ever got a
 * code, hence the retry affordance on the failure side.
 */
export function ZohoResultDialog({
  result,
  onClose,
  onRetry,
}: {
  result: ZohoConnectResult | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  return (
    <Dialog open={!!result} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-[28rem]">
        {result === "success" ? (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <ZohoConnectBadge centerIcon="check-circle" />
              <DialogTitle className="mt-1 text-base font-bold tracking-tight">
                Connection successful
              </DialogTitle>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/40 p-3.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                <Icon name="check" className="h-3.5 w-3.5 text-white" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">
                  New invoices appear in 10 mins
                </p>
                <p className="text-xs text-muted-foreground">
                  Invoices and payments will stay in sync automatically.
                </p>
              </div>
            </div>

            <Button variant="primary" size="sm" className="w-full" onClick={onClose}>
              Done
            </Button>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40">
                <Icon name="alert-circle" className="h-6 w-6 text-red-600" aria-hidden />
              </span>
              <DialogTitle className="mt-1 text-base font-bold tracking-tight">
                Connection failed
              </DialogTitle>
              <p className="max-w-[24rem] text-[13px] leading-relaxed text-muted-foreground">
                We couldn&apos;t connect your PayGlocal dashboard to Zoho. Nothing changed and your
                data is safe. Please try again.
              </p>
            </div>

            <div className="flex gap-2.5">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" className="flex-1" onClick={onRetry}>
                Retry connection
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
