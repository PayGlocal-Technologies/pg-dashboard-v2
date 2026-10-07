"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import {
  useInvoicePaymentProof,
  useUpdateInvoiceStatus,
} from "@/features/dashboard/invoice-links/hooks";

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".png"];

/**
 * Two modes behind one dialog, exactly as pg-dashboard's
 * UpdateInvoiceStatusDrawer has it:
 *
 *  - `isOfflinePaid` → read-only. Lists the proof documents already attached,
 *    each opening in a new tab.
 *  - otherwise → upload. Attach up to five documents, which marks the invoice
 *    paid offline. Irreversible, hence the warning.
 *
 * A dialog rather than upstream's half-screen drawer: the whole job is one
 * warning, one file picker and one button, which left most of a drawer empty.
 * gcc-ui-temp's StatusModal, the console's version of this flow, is a modal
 * for the same reason, and MCA Invoices' MarkAsPaidDialog is this dialog's
 * layout. Both sources take files through a click-or-drag area, so this does
 * too.
 *
 * The validation limits (≤10MB, .pdf/.jpg/.png, max 5) and the whitespace
 * stripping on filenames are upstream's, kept as-is: the filename is the key
 * the presigned-URL map comes back under, so changing how it is normalised
 * would break the mapping between a file and its upload target. Upstream's
 * antd `beforeUpload` shows the error but still lets the bad file into the
 * list; here a rejected file is kept out.
 */
export function UpdateInvoiceStatusDialog({
  open,
  onOpenChange,
  mid,
  invoiceId,
  isOfflinePaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mid: string;
  invoiceId: string;
  isOfflinePaid: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: proofData, isPending: isProofPending } = useInvoicePaymentProof(
    mid,
    invoiceId,
    open && isOfflinePaid
  );
  const { run: updateStatus } = useUpdateInvoiceStatus(mid, invoiceId);

  const existingDocs = Object.entries(proofData?.data ?? {}).map(([name, url]) => ({ name, url }));
  const atLimit = files.length >= MAX_FILES;
  const locked = atLimit || isSubmitting;

  const handleSelect = (selected: FileList | null) => {
    if (!selected?.length) return;
    setError(null);

    const next: File[] = [];
    for (const file of Array.from(selected)) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      if (file.size > MAX_BYTES) {
        setError("File size must be less than 10MB.");
        return;
      }
      if (!ALLOWED_EXTENSIONS.includes(extension)) {
        setError("Only PDF, JPG, and PNG files are allowed.");
        return;
      }
      // Upstream strips whitespace from the name before sending the manifest.
      next.push(new File([file], file.name.replace(/\s+/g, ""), { type: file.type }));
    }

    setFiles([...files, ...next].slice(0, MAX_FILES));
  };

  const handleSubmit = async () => {
    // Enabled with nothing attached, so the reason is said rather than left
    // to a greyed-out button (upstream disables it silently).
    if (files.length === 0) {
      setError("Attach at least one proof document.");
      return;
    }
    setIsSubmitting(true);
    try {
      await updateStatus(files);
      toast.success("Invoice status updated successfully");
      setFiles([]);
      onOpenChange(false);
    } catch (e) {
      // Closed on failure too, as gcc-ui-temp's StatusModal does: by now the
      // backend has either refused the request or the hook has removed the
      // files that never landed, so there is nothing left here to retry.
      toast.error((e as Error)?.message || "Failed to update invoice status");
      setFiles([]);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-xl flex-col gap-0 overflow-hidden p-0"
        // Radix focuses the first focusable element on open, which is the drop
        // area, so it opened wearing its focus ring as if already selected.
        // Keyboard users still get the ring as soon as they tab to it.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>{isOfflinePaid ? "View Documents Proofs" : "Update invoice status"}</DialogTitle>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {isOfflinePaid ? "Proof documents attached to " : "Mark "}
            <span className="font-medium text-foreground">Invoice ID {invoiceId}</span>
            {isOfflinePaid ? "." : " as paid outside PayGlocal by attaching proof of payment."}
          </p>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
          {isOfflinePaid ? (
            isProofPending ? (
              <Shimmer className="h-24 w-full rounded-lg" />
            ) : existingDocs.length > 0 ? (
              <div className="space-y-2">
                {existingDocs.map((doc) => (
                  <Button
                    key={doc.name}
                    type="button"
                    variant="ghost"
                    disabled={!doc.url}
                    leftIcon={<Icon name="paperclip" className="h-3.5 w-3.5" />}
                    onClick={() => window.open(doc.url, "_blank", "noopener,noreferrer")}
                    className="w-full justify-start rounded-lg bg-muted/50 px-3 py-2 text-left"
                  >
                    {doc.name}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No proof documents found
              </p>
            )
          ) : (
            <>
              <Alert variant="warning">
                <AlertDescription>
                  By submitting the document here, you confirm that this invoice has been manually
                  marked as PAID. This action is final and cannot be reversed.
                </AlertDescription>
              </Alert>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">
                  Upload Proof Documents <span className="text-destructive">*</span>
                </p>
                {/* The only bare <input> here: no flux-ui component wraps a file
                    picker, and it is visually hidden — the area below is the
                    control. */}
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.png"
                  className="sr-only"
                  aria-hidden
                  tabIndex={-1}
                  onChange={(e) => {
                    handleSelect(e.target.files);
                    // Cleared so re-picking the same file fires onChange again.
                    e.target.value = "";
                  }}
                />
                {/* Click-or-drag area, the same pattern as TicketAttachmentField. */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-disabled={locked}
                  onClick={() => !locked && inputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (locked) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      inputRef.current?.click();
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    if (!locked) handleSelect(e.dataTransfer.files);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
                    error ? "border-destructive" : "border-border",
                    locked
                      ? "cursor-not-allowed opacity-60"
                      : isDragOver
                        ? "cursor-pointer border-primary bg-primary/5"
                        : "cursor-pointer hover:bg-muted/50"
                  )}
                >
                  <Icon name="upload" className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[13px] text-muted-foreground">
                    {atLimit ? (
                      `File limit reached (${MAX_FILES})`
                    ) : (
                      <>
                        <span className="font-medium text-foreground">Click or drag files</span>{" "}
                        to upload
                      </>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, JPG or PNG. Up to {MAX_FILES} files, 10MB each.
                  </span>
                </div>
                {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
              </div>

              {files.length > 0 ? (
                <ul className="space-y-1.5">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2.5 rounded-lg bg-muted/50 px-3 py-1.5"
                    >
                      <Icon name="file-text" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">
                        {file.name}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {formatFileSize(file.size)}
                      </span>
                      <IconButton
                        aria-label={`Remove ${file.name}`}
                        variant="ghost"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => setFiles(files.filter((_, i) => i !== index))}
                      >
                        <Icon name="x" className="h-3.5 w-3.5" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            {isOfflinePaid ? "Close" : "Cancel"}
          </Button>
          {isOfflinePaid ? null : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              disabled={!invoiceId}
              onClick={() => void handleSubmit()}
            >
              {isSubmitting ? "Updating…" : "Update Status"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
