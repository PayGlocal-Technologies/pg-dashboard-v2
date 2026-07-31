"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatFileSize } from "@/lib/utils/format";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileSize: number;
}

// No invoice-content retrieval endpoint exists yet for MCA transactions (see
// getMockUploadedInvoice in TransactionDetailsPage.tsx), so this shows the
// file's identity only, not its actual pages, until the backend exposes a
// way to fetch the stored document. Read-only: no download/replace actions.
export function InvoicePreviewDialog({
  open,
  onOpenChange,
  fileName,
  fileSize,
}: InvoicePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex w-[min(100%-1.5rem,30rem)] max-w-none flex-col gap-4 rounded-2xl p-6">
        <DialogTitle className="text-base font-semibold text-foreground">
          Invoice preview
        </DialogTitle>

        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 py-12">
          <Icon name="file-text" className="h-8 w-8 text-muted-foreground" />
          <div className="text-center">
            <p className="text-[13px] font-medium text-foreground">{fileName}</p>
            <p className="text-[12px] text-muted-foreground">{formatFileSize(fileSize)}</p>
          </div>
        </div>

        <p className="text-center text-[12px] text-muted-foreground">This preview is read-only.</p>
      </DialogContent>
    </Dialog>
  );
}
