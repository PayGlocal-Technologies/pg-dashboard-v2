"use client";

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { EmbedCodeBlock } from "@/features/dashboard/payment-button/components/create/EmbedCodeBlock";
import {
  copyEmbedCode,
  embedLinesToText,
  type EmbedLine,
} from "@/features/dashboard/payment-button/helpers";

/**
 * The little drawn card at the top: a placeholder page with the button on it
 * and a success tick. Decorative, so hidden from assistive tech; the title
 * below says the same thing in words.
 */
function LiveIllustration() {
  return (
    <div
      aria-hidden
      className="flex justify-center rounded-xl bg-gradient-to-b from-primary/10 to-muted/40 px-6 py-6"
    >
      <div className="relative w-64 rounded-xl border border-border bg-card p-5 shadow-sm">
        <span className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-success text-white ring-4 ring-card">
          <Icon name="check" className="h-4 w-4" />
        </span>
        <div className="h-2 w-32 rounded-full bg-muted" />
        <div className="mt-2 h-2 w-20 rounded-full bg-muted" />
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground">
          <Icon name="check" className="h-3.5 w-3.5" />
          Pay Now
        </span>
      </div>
    </div>
  );
}

/**
 * Shown once create succeeds: the button is live, here is its snippet. Done
 * is the way out of the editor, back to the list the new button now sits in.
 */
export function ButtonLiveDialog({
  open,
  label,
  lines,
  onDone,
}: {
  open: boolean;
  /** The button's label, quoted in the description. */
  label: string;
  lines: EmbedLine[];
  onDone: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDone()}>
      <DialogContent className="sm:max-w-3xl [&_*]:shadow-none">
        <LiveIllustration />

        <div className="mt-2 text-center">
          <DialogTitle className="text-xl">Your payment button is live</DialogTitle>
          <DialogDescription className="mt-1">
            &ldquo;{label}&rdquo; is ready to accept payments. Add the snippet below to your website
            to start collecting them.
          </DialogDescription>
        </div>

        <div className="mt-4">
          <EmbedCodeBlock caption="HTML code" lines={lines} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            leftIcon={<Icon name="copy" className="h-3.5 w-3.5" />}
            onClick={() => void copyEmbedCode(embedLinesToText(lines))}
          >
            Copy code
          </Button>
          <Button type="button" variant="primary" onClick={onDone}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
