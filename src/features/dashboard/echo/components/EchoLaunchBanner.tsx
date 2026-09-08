"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import useNewPermissions from "@/hooks/useNewPermissions";
import { cn } from "@/lib/utils";

/**
 * Echo launch announcement, ported from Nova's EchoLaunchBanner.
 *
 * Shown once per page load and then suppressed for the rest of the session —
 * no localStorage, matching Nova, so a refresh gives another chance to see it
 * but clicking through does not nag. Gated on the same
 * `getEchoActiveSession` permission as every other Echo entry point.
 *
 * The artwork is drawn in CSS rather than ported as Nova's banner PNG: brand
 * imagery in this app goes through the icon registry (see CLAUDE.md), and a
 * gradient with the Echo mark on it needs no asset at all.
 */
const SUPPRESS_KEY = "echoLaunchBannerSeen";

export function EchoLaunchBanner() {
  const checkPermissions = useNewPermissions();
  const hasEcho = checkPermissions(["getEchoActiveSession"]);
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasEcho) return;
    try {
      if (sessionStorage.getItem(SUPPRESS_KEY)) return;
    } catch {
      /* private mode — fall through and show it */
    }
    const timer = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(timer);
  }, [hasEcho]);

  const suppress = useCallback(() => {
    try {
      sessionStorage.setItem(SUPPRESS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, []);

  const onTryNow = useCallback(() => {
    suppress();
    router.push("/echo");
  }, [suppress, router]);

  if (!hasEcho) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) suppress();
      }}
    >
      <DialogContent className="w-[calc(100%-2rem)] max-w-[46rem] gap-0 overflow-hidden p-0">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.85fr)]">
          <div className="flex min-w-0 flex-col justify-between gap-5 px-6 pb-6 pt-7 md:border-r md:border-border/60">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-primary-foreground">
                Introducing Echo
              </span>
              <DialogTitle className="mt-3 text-left text-2xl font-extrabold leading-[1.15] tracking-tight text-foreground">
                Your payments just got smarter.
              </DialogTitle>
              <DialogDescription asChild>
                <p className="mt-2.5 text-left text-[13.5px] leading-relaxed text-muted-foreground">
                  Echo is your assistant inside the dashboard, for transactions, settlements,
                  disputes, accounts and payment links, without digging through menus.
                </p>
              </DialogDescription>
            </div>
            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-start">
              <Button type="button" variant="outline" size="md" onClick={suppress}>
                Not now
              </Button>
              <Button type="button" variant="primary" size="md" onClick={onTryNow}>
                Try it now
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "relative flex min-h-[11rem] items-center justify-center overflow-hidden border-t border-border/60",
              "bg-[linear-gradient(160deg,#dbeafe_0%,#bfdbfe_45%,#93c5fd_100%)]",
              "dark:bg-[linear-gradient(160deg,#0b1b33_0%,#132a4d_45%,#1b3a68_100%)]",
              "md:border-l-0 md:border-t-0"
            )}
            aria-hidden
          >
            <Icon name="echo-mark" className="text-[8rem] drop-shadow-sm" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
