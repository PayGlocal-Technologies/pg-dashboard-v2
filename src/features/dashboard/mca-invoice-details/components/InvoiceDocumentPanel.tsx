"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogTitle,
  Shimmer,
  useBreakpoint,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { usePost } from "@/lib/api/hooks";
import { downloadInvoiceApi } from "@/features/dashboard/create-invoice/services";
import type { BaseResponse } from "@/types/common";

// react-pdf reaches for window and spins up a pdf.js worker, neither of which
// exists during SSR, so the viewer is client-only.
const PdfViewer = dynamic(() => import("@/components/common/PdfViewer").then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => <Shimmer className="h-[70vh] min-h-[32rem] w-full rounded-lg" />,
});

/**
 * The generated invoice document.
 *
 * `view-invoice` returns a short-lived presigned URL, which is fetched on mount
 * so the document is on screen without a click, matching production's
 * UploadedPdf.
 *
 * From lg up it renders inline through react-pdf, the same library
 * pg-dashboard uses, so pagination and text selection behave identically in
 * both apps. Below lg an inline viewer is unusable on a phone, so it collapses
 * to a card that opens the same URL in a new tab.
 *
 * The inline viewer fits the page to this column's width, which is narrow, so
 * Expand opens the same document in a full-screen dialog where it is actually
 * readable. That dialog renders another PdfViewer without an onExpand, which is
 * what stops it offering to expand again.
 */
export function InvoiceDocumentPanel({
  merchantId,
  invoiceId,
  invoiceNumber,
}: {
  merchantId: string;
  invoiceId: string;
  invoiceNumber: string;
}) {
  const { isMobile } = useBreakpoint();
  const [expanded, setExpanded] = useState(false);

  const {
    data,
    mutate: fetchUrl,
    isPending,
  } = usePost<BaseResponse<{ url: string }>, undefined>(downloadInvoiceApi(merchantId, invoiceId), {
    invalidateQueries: false,
  });

  useEffect(() => {
    if (merchantId && invoiceId) fetchUrl(undefined);
  }, [merchantId, invoiceId, fetchUrl]);

  const pdfUrl = data?.data?.url;

  const openInNewTab = () => {
    if (pdfUrl) window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  if (!isMobile) {
    return (
      <>
        <Card className="overflow-hidden">
          <CardContent className="p-3">
            <PdfViewer
              url={pdfUrl}
              title={`Invoice ${invoiceNumber}`}
              onExpand={() => setExpanded(true)}
            />
          </CardContent>
        </Card>

        <Dialog open={expanded} onOpenChange={setExpanded}>
          <DialogContent className="flex h-[92vh] w-[95vw] max-w-6xl flex-col overflow-hidden p-0">
            <DialogTitle className="shrink-0 border-b border-border px-5 py-4 text-[16px] font-semibold">
              Invoice {invoiceNumber}
            </DialogTitle>
            <div className="min-h-0 flex-1 overflow-hidden p-4">
              <PdfViewer
                url={pdfUrl}
                title={`Invoice ${invoiceNumber}`}
                heightClassName="h-[calc(92vh-9rem)]"
              />
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-primary">
            <Icon name="file-text" className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-semibold text-foreground">Invoice PDF</p>
            <p className="text-[12px] text-muted-foreground">
              {pdfUrl ? "Tap to open or download" : "Preparing document…"}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Open invoice PDF"
            disabled={!pdfUrl || isPending}
            onClick={openInNewTab}
            className="h-9 w-9 shrink-0 p-0"
          >
            <Icon name="download" className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
