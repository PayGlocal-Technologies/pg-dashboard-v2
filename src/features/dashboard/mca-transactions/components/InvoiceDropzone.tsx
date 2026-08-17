"use client";

import { forwardRef, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import {
  INVOICE_ACCEPTED_EXTENSIONS,
  INVOICE_ACCEPTED_MIME_TYPES,
  INVOICE_MAX_SIZE_BYTES,
} from "@/features/dashboard/mca-transactions/constants";
import {
  hasInvoiceIssues,
  toInvoiceComparison,
  type InvoiceComparisonRow,
} from "@/features/dashboard/mca-transactions/invoiceMatching";
import type { InvoiceScanPhase } from "@/features/dashboard/mca-transactions/useInvoiceUpload";
import type { InvoiceMatchingPayload } from "@/features/dashboard/mca-transactions/types";

// Presentational only. The upload itself, the extraction poll and the
// comparison against the transaction all live in useInvoiceUpload; this
// renders whichever phase that reports and hands file selections back up.
// The one thing it decides for itself is whether a chosen file is even
// eligible (type and size), since rejecting those needs no server round trip.

interface InvoiceDropzoneProps {
  id: string;
  /** Where the upload/extraction chain currently is. */
  phase: InvoiceScanPhase;
  /** The file being scanned or already scanned, for its name and size. */
  file: File | null;
  /** Extraction's comparison against the transaction, once it resolves. */
  matching: InvoiceMatchingPayload | null;
  /** Failure message from the upload or the extraction poll. */
  error: string | null;
  onSelectFile: (file: File) => void;
  onReset: () => void;
  invalid?: boolean;
  errorId?: string;
  onCreateInvoice?: () => void;
}

function ValidationGroup({ label, rows }: { label: string; rows: InvoiceComparisonRow[] }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 dark:text-amber-500">
        <Icon name="alert-triangle" className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-3 bg-muted/60 text-[11px] font-semibold text-muted-foreground">
          <span className="px-3 py-2">Field</span>
          <span className="px-3 py-2">Transaction Details</span>
          <span className="px-3 py-2">Invoice Details</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.field}
            className="grid grid-cols-3 border-t border-border text-[12.5px] text-foreground"
          >
            <span className="px-3 py-2.5">{row.field}</span>
            <span className="px-3 py-2.5">{row.expected}</span>
            <span className="px-3 py-2.5">{row.found}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MismatchPanel({
  name,
  size,
  missing,
  mismatched,
  onReupload,
  dropzoneRef,
}: {
  name: string;
  size: number;
  missing: InvoiceComparisonRow[];
  mismatched: InvoiceComparisonRow[];
  onReupload: () => void;
  dropzoneRef: React.Ref<HTMLDivElement>;
}) {
  const totalIssues = missing.length + mismatched.length;

  return (
    <div ref={dropzoneRef} tabIndex={-1} className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon name="file-text" className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{name}</p>
          <p className="text-[11px] text-muted-foreground">{formatFileSize(size)}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-[12px] font-medium text-amber-700 dark:text-amber-500">
          {totalIssues} issue{totalIssues === 1 ? "" : "s"}
          <Icon name="alert-circle" className="h-3.5 w-3.5" />
        </span>
      </div>

      <p className="text-[12px] text-muted-foreground">
        {totalIssues} issue{totalIssues === 1 ? "" : "s"} found. Fix details or upload a corrected
        invoice.
      </p>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        {missing.length > 0 && <ValidationGroup label="Missing" rows={missing} />}
        {mismatched.length > 0 && <ValidationGroup label="Mismatch" rows={mismatched} />}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          leftIcon={<Icon name="upload" className="h-3.5 w-3.5" />}
          onClick={onReupload}
        >
          Re-upload invoice
        </Button>
      </div>
    </div>
  );
}

export const InvoiceDropzone = forwardRef<HTMLDivElement, InvoiceDropzoneProps>(
  (
    { id, phase, file, matching, error, onSelectFile, onReset, invalid, errorId, onCreateInvoice },
    ref
  ) => {
    const [isDragOver, setIsDragOver] = useState(false);
    // A file rejected on type or size never reaches the upload chain, so this
    // state is local rather than part of the hook's phase.
    const [rejection, setRejection] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const openFileDialog = () => inputRef.current?.click();

    const comparison = matching ? toInvoiceComparison(matching) : null;
    const showsIssues = phase === "ready" && !!comparison && hasInvoiceIssues(comparison);
    const showsAccepted = phase === "ready" && !showsIssues;

    const handleFile = (candidate: File) => {
      const extension = `.${candidate.name.split(".").pop()?.toLowerCase() ?? ""}`;
      const typeOk =
        INVOICE_ACCEPTED_MIME_TYPES.includes(
          candidate.type as (typeof INVOICE_ACCEPTED_MIME_TYPES)[number]
        ) ||
        INVOICE_ACCEPTED_EXTENSIONS.includes(
          extension as (typeof INVOICE_ACCEPTED_EXTENSIONS)[number]
        );

      if (!typeOk) {
        setRejection("Only PDF invoices are supported. Please upload a .pdf file.");
        return;
      }
      if (candidate.size > INVOICE_MAX_SIZE_BYTES) {
        setRejection(
          `File is too large. Maximum size is ${formatFileSize(INVOICE_MAX_SIZE_BYTES)}.`
        );
        return;
      }

      setRejection(null);
      onSelectFile(candidate);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      e.target.value = "";
      if (selected) handleFile(selected);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const dropped = e.dataTransfer.files?.[0];
      if (dropped) handleFile(dropped);
    };

    const showCreateInvoiceLink = phase !== "ready";

    const handleRemove = () => {
      setRejection(null);
      onReset();
    };

    const handleReupload = () => {
      setRejection(null);
      onReset();
      openFileDialog();
    };

    return (
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={[...INVOICE_ACCEPTED_MIME_TYPES, ...INVOICE_ACCEPTED_EXTENSIONS].join(",")}
          onChange={handleInputChange}
          className="sr-only"
          aria-hidden
          tabIndex={-1}
        />

        {showsAccepted && file ? (
          <div
            ref={ref}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon name="file-text" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{file.name}</p>
              <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label={`Remove ${file.name}`}
              onClick={handleRemove}
            >
              <Icon name="trash-2" className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        ) : showsIssues && file && comparison ? (
          <MismatchPanel
            dropzoneRef={ref}
            name={file.name}
            size={file.size}
            missing={comparison.missing}
            mismatched={comparison.mismatched}
            onReupload={handleReupload}
          />
        ) : phase === "scanning" ? (
          <div
            ref={ref}
            tabIndex={-1}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3.5 py-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Icon name="loader" className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <p className="min-w-0 truncate text-[13px]">
                <span className="font-medium text-foreground">Extracting</span>{" "}
                <span className="text-muted-foreground">{file?.name}</span>
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Reviewing invoice details. This usually takes a few seconds. Please keep this window
              open.
            </p>
          </div>
        ) : rejection ? (
          <div
            ref={ref}
            tabIndex={-1}
            role="group"
            aria-describedby={errorId}
            className="flex flex-col items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-5 text-center"
          >
            <Icon name="alert-circle" className="h-5 w-5 text-destructive" />
            <p className="text-[13px] font-medium text-destructive">{rejection}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => setRejection(null)}>
              Try again
            </Button>
          </div>
        ) : phase === "error" ? (
          /* Amber, not destructive red: the file is still attached and still
             submittable, so this is a warning about verification, not a
             failure the merchant has to clear before continuing. */
          <div
            ref={ref}
            tabIndex={-1}
            role="group"
            aria-describedby={errorId}
            className="flex flex-col items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/5 px-4 py-5 text-center"
          >
            <Icon name="alert-circle" className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            <p className="text-[13px] font-medium text-amber-700 dark:text-amber-500">
              {error ?? "Couldn't verify the invoice."}
            </p>
            {file && (
              <div className="flex max-w-full items-center gap-1.5">
                <Icon name="file-text" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="truncate text-[12px] text-foreground">{file.name}</p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              You can still submit it — it will go to manual review.
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => (file ? onSelectFile(file) : openFileDialog())}
              >
                Retry check
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleReupload}>
                Choose another file
              </Button>
            </div>
          </div>
        ) : (
          <div
            ref={ref}
            role="button"
            tabIndex={0}
            aria-describedby={invalid ? errorId : undefined}
            onClick={openFileDialog}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFileDialog();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
              isDragOver
                ? "border-primary bg-primary/5"
                : invalid
                  ? "border-destructive/60 bg-destructive/5"
                  : "border-border bg-muted/30 hover:bg-muted/50"
            )}
          >
            <Icon
              name="upload"
              className={cn("h-5 w-5", invalid ? "text-destructive" : "text-muted-foreground")}
            />
            <p className="text-[13px] font-medium text-foreground">
              Drag and drop your PDF invoice, or{" "}
              <span className="text-primary underline underline-offset-2">click to browse</span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              PDF only, up to {formatFileSize(INVOICE_MAX_SIZE_BYTES)}
            </p>
          </div>
        )}

        {showCreateInvoiceLink && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="self-start px-0 py-0 text-[12px]"
            onClick={onCreateInvoice}
          >
            Don&apos;t have an invoice yet? Create new invoice
          </Button>
        )}
      </div>
    );
  }
);
InvoiceDropzone.displayName = "InvoiceDropzone";
