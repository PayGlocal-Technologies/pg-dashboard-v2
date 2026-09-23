"use client";

import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
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

        <Card className="w-full max-w-md rounded-2xl p-8 text-center shadow-lg">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <Icon name="check-circle" className="h-6 w-6" />
          </span>

          <h2 className="mt-4 text-lg font-semibold text-foreground">
            Your request has been received
          </h2>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            Check the eBRC Status screen in 4 hours to download your eBRC.
          </p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
            It will also be sent to your registered email address once generation is completed.
          </p>

          <Button type="button" variant="primary" className="mt-6 w-full" onClick={onClose}>
            Done
          </Button>
        </Card>
      </div>
    </ViewPortal>
  );
}
