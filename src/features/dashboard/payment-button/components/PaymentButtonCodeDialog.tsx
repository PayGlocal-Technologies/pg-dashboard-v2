"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { CopyableCell } from "@/components/common/CopyableCell";
import { EmbedCodeBlock } from "@/features/dashboard/payment-button/components/create/EmbedCodeBlock";
import { buildLiveEmbedLines } from "@/features/dashboard/payment-button/helpers";
import type { PaymentButtonScript } from "@/features/dashboard/payment-button/types";

/**
 * Preview button code: a saved button's id and embed snippet, each copyable.
 * pg-dashboard's PaymentButtonDetails ("Payment Button is retrieved"), as a
 * modal, with the snippet drawn as the same code block create shows.
 */
export function PaymentButtonCodeDialog({
  script,
  onOpenChange,
}: {
  script: PaymentButtonScript | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={!!script} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl [&_*]:shadow-none"
        // Radix focuses the first focusable element on open, which is the
        // Button ID's copy button, and focus shows its tooltip. Keep focus on
        // the dialog itself instead; Tab still reaches every control.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle>Payment button code</DialogTitle>
        <DialogDescription>
          Use the Button ID to search for or manage this button. Paste the snippet into your
          website&apos;s HTML to accept payments from your customers.
        </DialogDescription>

        {script && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="group flex flex-col gap-1">
              <span className="text-[12px] text-muted-foreground">Button ID</span>
              <CopyableCell
                value={script.pbId ?? ""}
                label="Button ID"
                monospace
                className="text-[13px] font-medium text-foreground"
              />
            </div>
            <EmbedCodeBlock caption="HTML code" lines={buildLiveEmbedLines(script)} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
