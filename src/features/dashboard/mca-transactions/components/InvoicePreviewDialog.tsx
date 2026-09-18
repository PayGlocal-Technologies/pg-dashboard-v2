"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatFileSize } from "@/lib/utils/format";

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  fileSize: number;
}

// TODO: render the actual document once an invoice-preview URL is available.
// The uploaded file is only ever reachable through a short-lived presigned
// URL (see useDocumentDownload), and no preview endpoint exists yet, so this
// shows the file's identity rather than its contents.
export function InvoicePreviewDialog({
  open,
  onOpenChange,
  fileName,
  fileSize,
}: InvoicePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle>{fileName}</DialogTitle>
        <DialogDescription>{formatFileSize(fileSize)}</DialogDescription>
        <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-10 text-center">
          <Icon name="file-text" className="h-6 w-6 text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground">
            Preview isn&apos;t available yet. Download the invoice to view it.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
