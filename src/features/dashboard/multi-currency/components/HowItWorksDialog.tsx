"use client";

import { Dialog, DialogContent, DialogTitle, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ACCOUNT_HELPER_TEXT } from "@/features/dashboard/multi-currency/accountGuides";

/**
 * "How it works?" as a modal — the same per-currency copy `HowItWorksPanel`
 * renders inline, behind an overlay instead of reflowing the page beside it.
 * Renders nothing for a currency with no entry, same as the panel.
 */
export function HowItWorksDialog({
  open,
  onOpenChange,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
}) {
  const helper = ACCOUNT_HELPER_TEXT[currency];
  if (!helper) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100%,26rem)] p-6 [&>button:last-child]:top-6">
        <DialogTitle className="text-base font-semibold text-foreground">How it works</DialogTitle>

        <Separator className="my-4" />

        {/* Icon + heading + paragraph, twice, separated by a divider — the
            same shape HowItWorksPanel uses for this copy. */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon name="file-text" size={16} />
            </span>
            <p className="text-sm font-semibold text-foreground">{helper.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{helper.description}</p>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Icon name="clock" size={16} />
            </span>
            <p className="text-sm font-semibold text-foreground">{helper.timelineTitle}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{helper.timeline}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
