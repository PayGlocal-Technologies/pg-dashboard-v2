"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  useInvoicePaymentProof,
  useUpdateInvoiceStatus,
} from "@/features/dashboard/invoice-links/hooks";

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".png"];

/**
 * Two modes behind one drawer, exactly as pg-dashboard's
 * UpdateInvoiceStatusDrawer has it:
 *
 *  - `isOfflinePaid` → read-only. Lists the proof documents already attached,
 *    each opening in a new tab.
 *  - otherwise → upload. Attach up to five documents, which marks the invoice
 *    paid offline. Irreversible, hence the warning.
 *
 * The validation limits (≤10MB, .pdf/.jpg/.png, max 5) and the whitespace
 * stripping on filenames are upstream's, kept as-is: the filename is the key
 * the presigned-URL map comes back under, so changing how it is normalised
 * would break the mapping between a file and its upload target.
 */
export function UpdateInvoiceStatusDrawer({
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
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: proofData, isPending: isProofPending } = useInvoicePaymentProof(
    mid,
    invoiceId,
    open && isOfflinePaid
  );
  const { run: updateStatus } = useUpdateInvoiceStatus();

  const existingDocs = Object.entries(proofData?.data ?? {}).map(([name, url]) => ({ name, url }));

  const handleSelect = (selected: FileList | null) => {
    if (!selected) return;
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

    const combined = [...files, ...next].slice(0, MAX_FILES);
    setFiles(combined);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await updateStatus({ mid, invoiceId, files });
      toast.success("Invoice status updated successfully");
      setFiles([]);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to update invoice status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="w-full sm:max-w-[50%]">
        <DrawerHeader>
          <DrawerTitle>
            {isOfflinePaid
              ? "View Documents Proofs"
              : `Change invoice status for Invoice ID - ${invoiceId}`}
          </DrawerTitle>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-auto px-4 pb-4">
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
                <p className="mb-2 text-sm font-medium text-foreground">Upload Proof Documents</p>
                {/* A file picker is the one control flux has no component for;
                    the input is visually hidden behind a Button so the surface
                    is still a flux control. */}
                <input
                  id="invoice-proof-upload"
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.png"
                  className="sr-only"
                  onChange={(e) => handleSelect(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={files.length >= MAX_FILES}
                  leftIcon={<Icon name="upload" className="h-3.5 w-3.5" />}
                  onClick={() => document.getElementById("invoice-proof-upload")?.click()}
                >
                  Choose files
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  PDF, JPG or PNG. Up to {MAX_FILES} files, 10MB each.
                </p>
              </div>

              {error ? <p className="text-xs text-destructive">{error}</p> : null}

              {files.length > 0 ? (
                <ul className="space-y-1.5">
                  {files.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-sm text-foreground">
                        <Icon name="paperclip" className="h-3.5 w-3.5" />
                        {file.name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${file.name}`}
                        onClick={() => setFiles(files.filter((_, i) => i !== index))}
                      >
                        <Icon name="x" className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <Button
                type="button"
                variant="primary"
                className="w-full"
                disabled={!invoiceId || isSubmitting || files.length === 0}
                onClick={() => void handleSubmit()}
              >
                {isSubmitting ? "Updating…" : "Update Status"}
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
