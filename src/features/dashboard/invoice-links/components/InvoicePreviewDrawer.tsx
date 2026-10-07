"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Shimmer,
} from "@/components/ui";
import { PdfViewer } from "@/components/common/PdfViewer";

/**
 * Read-only preview of the rendered invoice PDF.
 *
 * pg-dashboard's InvoicePreviewDrawer drops the presigned URL into a raw
 * `<iframe>`. Here it goes through PdfViewer, the same react-pdf surface the
 * rest of the app uses for financial documents, so the viewer chrome, the
 * loading state and the worker setup are shared rather than re-invented.
 */
export function InvoicePreviewDrawer({
  open,
  onOpenChange,
  url,
  invoiceId,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  invoiceId: string | null;
  isLoading?: boolean;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* The WIDTH is overridden, not just max-width: flux's right drawer is
          `sm:w-96`, so a max-w alone left this at 384px and the PDF tiny. */}
      <DrawerContent className="w-full sm:w-[70vw] lg:w-[700px]">
        <DrawerHeader>
          <DrawerTitle>{invoiceId ? `Invoice ${invoiceId}` : "Invoice preview"}</DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
          {isLoading || !url ? (
            <Shimmer className="h-[32rem] w-full rounded-lg" />
          ) : (
            <PdfViewer url={url} title={invoiceId ? `Invoice ${invoiceId}` : "Invoice"} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
