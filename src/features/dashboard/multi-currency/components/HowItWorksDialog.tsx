"use client";

import { Button, Dialog, DialogContent, DialogTitle, Separator } from "@/components/ui";
import { ACCOUNT_HELPER_TEXT } from "@/features/dashboard/multi-currency/accountGuides";

/**
 * "How it works?" — how a client actually pays into the selected account, and
 * how long the money takes to arrive.
 *
 * Ported from pg-dashboard's HowItWorksModal. The copy is per-currency because
 * the rail is: a US client uses ACH/Fedwire over 2-3 days, a UK client uses FPS
 * over 1-2. Renders nothing for a currency with no entry rather than showing a
 * generic paragraph that would be wrong for some rail.
 */
export function HowItWorksDialog({
  currency,
  open,
  onOpenChange,
}: {
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const helper = ACCOUNT_HELPER_TEXT[currency];
  if (!helper) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100%,36rem)] p-6 [&>button:last-child]:top-6">
        <DialogTitle className="text-base font-semibold text-foreground">
          {helper.title}
        </DialogTitle>

        <Separator className="my-4 border-dashed" />

        <p className="text-[13px] leading-relaxed text-muted-foreground">{helper.description}</p>

        <p className="mt-6 text-sm font-semibold text-foreground">{helper.timelineTitle}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{helper.timeline}</p>

        <div className="mt-6 flex justify-end">
          <Button variant="primary" onClick={() => onOpenChange(false)}>
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
