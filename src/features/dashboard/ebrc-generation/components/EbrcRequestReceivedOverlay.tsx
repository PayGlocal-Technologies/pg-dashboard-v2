"use client";

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
 */
export function EbrcRequestReceivedOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <ViewPortal>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
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

          <h2 className="mt-1 text-base font-semibold text-foreground">
            Your request has been received
          </h2>
          <p className="mt-2 text-[13px] leading-snug text-muted-foreground">
            Check the eBRC Status screen in 4 hours to download your eBRC. It&apos;ll also be sent
            to your registered email address once generation is completed.
          </p>

          <Button type="button" variant="primary" className="mt-5 w-full" onClick={onClose}>
            Back to eBRC
          </Button>
        </Card>
      </div>
    </ViewPortal>
  );
}
