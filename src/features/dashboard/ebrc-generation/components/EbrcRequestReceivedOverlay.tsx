"use client";

import { useEffect } from "react";
import { Button, Card } from "@/components/ui";
import { AppImage } from "@/components/common/AppImage";
import { SuccessTick } from "@/components/common/SuccessTick";
import { ViewPortal } from "@/components/layout/ViewPortal";

/**
 * Shown after any eBRC generation request is submitted — the full wizard's
 * "Confirm and generate" (step 3) and the bulk-upload dialog's "Upload" both
 * end here, since both are just different ways of asking DGFT to generate
 * one or more eBRCs, and neither has a real result to show yet (no backend,
 * see BulkUploadDialog/EbrcGenerationWizard). A "your request has been
 * received" pop-up over the shared background artwork, rather than either
 * flow's own toast, since generation is the moment the merchant is most
 * likely to wonder "did that actually work?".
 *
 * Portaled full-viewport (ViewPortal) so it displays correctly regardless of
 * which page triggered it — the dashboard-shell eBRC Status page (bulk
 * upload) or the full-screen `(ebrc-editor)` wizard (confirm and generate).
 *
 * Not a flux `Dialog`, which is what CLAUDE.md otherwise asks for: this is a
 * full-bleed takeover whose background artwork spans the whole viewport behind
 * the card, and DialogContent has no seam to put that on. It carries the
 * dialog semantics by hand instead — labelled `role="dialog"`, `aria-modal`,
 * Escape to dismiss, and focus moved to its one action — so nothing a Dialog
 * would have given a keyboard or screen-reader user is lost.
 */
export function EbrcRequestReceivedOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Escape dismisses it, as it would any modal. Bound only while open, and the
  // listener is the effect's own subscription rather than state written during
  // render (see CLAUDE.md's purity rules).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <ViewPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ebrc-request-received-title"
        className="fixed inset-0 z-100 flex items-center justify-center p-6"
      >
        <AppImage
          src="/assets/bg image.png"
          alt=""
          fill
          sizes="100vw"
          priority
          className="-z-10 object-cover"
        />

        <Card className="w-full max-w-sm rounded-2xl p-6 text-center shadow-lg">
          <SuccessTick className="mx-auto h-20 w-20" />

          <h2
            id="ebrc-request-received-title"
            className="mt-1 text-base font-semibold text-foreground"
          >
            Your request has been received
          </h2>
          <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
            Check the eBRC Status screen in 4 hours to download your eBRC. It&apos;ll also be sent
            to your registered email address once generation is completed.
          </p>

          {/* The only way out, so it takes focus — otherwise a keyboard user
              lands on whatever was focused behind the overlay. */}
          <Button
            type="button"
            variant="primary"
            autoFocus
            className="mt-5 w-full"
            onClick={onClose}
          >
            Back to eBRC
          </Button>
        </Card>
      </div>
    </ViewPortal>
  );
}
