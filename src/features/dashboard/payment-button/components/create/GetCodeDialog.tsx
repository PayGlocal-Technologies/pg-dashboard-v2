"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { EmbedCodeBlock } from "@/features/dashboard/payment-button/components/create/EmbedCodeBlock";
import type { EmbedLine } from "@/features/dashboard/payment-button/helpers";

/** "Get the code": the embed snippet for the button being edited. */
export function GetCodeDialog({
  open,
  onOpenChange,
  lines,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: EmbedLine[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl [&_*]:shadow-none">
        <DialogTitle>Get the code</DialogTitle>
        <DialogDescription>
          Embed a button on your website that takes customers to this payment link.
        </DialogDescription>

        <div className="mt-4">
          <EmbedCodeBlock caption="Copy code to your site" lines={lines} />
        </div>

        <p className="mt-4 flex items-center gap-2 text-[13px] text-muted-foreground">
          <Icon name="code" className="h-3.5 w-3.5" />
          Embed this button on your website.
        </p>
      </DialogContent>
    </Dialog>
  );
}
