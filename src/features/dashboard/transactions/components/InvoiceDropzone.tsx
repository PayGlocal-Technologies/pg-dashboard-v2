"use client";

import { forwardRef, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency, formatFileSize } from "@/lib/utils/format";
import {
  INVOICE_ACCEPTED_EXTENSIONS,
  INVOICE_ACCEPTED_MIME_TYPES,
  INVOICE_MAX_SIZE_BYTES,
} from "@/features/dashboard/transactions/constants";

export interface InvoiceComparisonRow {
  field: string;
  expected: string;
  found: string;
}

export type InvoiceUploadState =
  | { status: "idle" }
  | { status: "extracting"; file: File }
  | { status: "success"; name: string; size: number }
  | {
      status: "mismatch";
      name: string;
      size: number;
      missing: InvoiceComparisonRow[];
      mismatched: InvoiceComparisonRow[];
    }
  | { status: "invalid"; message: string }
  | { status: "upload-error"; file: File; message: string };

// How long the "Extracting" state stays visible after upload completes, while
// invoice details are (simulated to be) parsed out of the file.
const EXTRACTING_DURATION_MS = 10_000;

// The transaction-side values an extracted invoice is checked against.
export interface InvoiceExpectedDetails {
  amount: number;
  currency: string;
  senderName: string;
}

const MISMATCH_CURRENCY_POOL = ["USD", "EUR", "GBP", "INR", "AUD", "CAD"];
const MISMATCH_NAME_POOL = ["Aman Sharma", "Priya Verma", "John Doe", "Wei Zhang"];

function pickOtherThan(pool: string[], value: string): string {
  const alternatives = pool.filter((item) => item !== value);
  return alternatives[Math.floor(Math.random() * alternatives.length)] ?? pool[0];
}

// Simulates OCR/data-extraction results and checks them against the
// transaction — there's no real extraction backend yet (see runUpload), so
// this stands in for it: some fields are randomly "not found" on the invoice
// (presence checks), and others are randomly extracted with a different value
// than the transaction has on file (consistency checks).
function buildValidationIssues(expected: InvoiceExpectedDetails): {
  missing: InvoiceComparisonRow[];
  mismatched: InvoiceComparisonRow[];
} {
  const missing: InvoiceComparisonRow[] = [];
  const mismatched: InvoiceComparisonRow[] = [];

  if (Math.random() < 0.3) {
    missing.push({ field: "Sender address", expected: "Required", found: "—" });
  }
  if (Math.random() < 0.3) {
    missing.push({ field: "Goods or service description", expected: "Required", found: "—" });
  }

  if (Math.random() < 0.3) {
    const drift = (Math.random() < 0.5 ? -1 : 1) * (0.01 + Math.random() * 0.08);
    const foundAmount = Math.round(expected.amount * (1 + drift) * 100) / 100;
    mismatched.push({
      field: "Amount",
      expected: formatCurrency(expected.amount, expected.currency, "en-US"),
      found: formatCurrency(foundAmount, expected.currency, "en-US"),
    });
  }
  if (Math.random() < 0.3) {
    mismatched.push({
      field: "Currency",
      expected: expected.currency,
      found: pickOtherThan(MISMATCH_CURRENCY_POOL, expected.currency),
    });
  }
  if (Math.random() < 0.3) {
    mismatched.push({
      field: "Sender name",
      expected: expected.senderName,
      found: pickOtherThan(MISMATCH_NAME_POOL, expected.senderName),
    });
  }

  return { missing, mismatched };
}

interface InvoiceDropzoneProps {
  id: string;
  value: InvoiceUploadState;
  onChange: (next: InvoiceUploadState) => void;
  invalid?: boolean;
  errorId?: string;
  expected: InvoiceExpectedDetails;
  onCreateInvoice?: () => void;
  onEditDetails?: () => void;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A fixed-size, read-only field/expected/found comparison — not a paginated
// data grid, so <DataTable> (built for sortable/paginated tables and always
// rendering a "Showing X of Y" footer) doesn't fit. Follows the same
// div-based row pattern as DetailRow elsewhere in this feature instead of a
// bare <table>.
function ValidationGroup({
  label,
  rows,
}: {
  label: string;
  rows: InvoiceComparisonRow[];
}) {
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
  onEditDetails,
  onReupload,
  dropzoneRef,
}: {
  name: string;
  size: number;
  missing: InvoiceComparisonRow[];
  mismatched: InvoiceComparisonRow[];
  onEditDetails?: () => void;
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
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            leftIcon={<Icon name="pencil" className="h-3.5 w-3.5" />}
            onClick={onEditDetails}
          >
            Edit details
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="flex-1"
            leftIcon={<Icon name="upload" className="h-3.5 w-3.5" />}
            onClick={onReupload}
          >
            Re-upload invoice
          </Button>
        </div>
      </div>
    </div>
  );
}

export const InvoiceDropzone = forwardRef<HTMLDivElement, InvoiceDropzoneProps>(
  ({ id, value, onChange, invalid, errorId, expected, onCreateInvoice, onEditDetails }, ref) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const uploadTokenRef = useRef(0);

    const openFileDialog = () => inputRef.current?.click();

    // The actual upload runs in the background for the whole duration of the
    // "Extracting" state below — there's no separate uploading/progress step,
    // so the user only ever sees this one processing state before submission.
    const runUpload = async (file: File) => {
      const token = ++uploadTokenRef.current;
      onChange({ status: "extracting", file });

      await wait(EXTRACTING_DURATION_MS);
      if (uploadTokenRef.current !== token) return;

      const uploadSucceeded = Math.random() > 0.15;
      if (!uploadSucceeded) {
        onChange({
          status: "upload-error",
          file,
          message: "Upload failed due to a network error.",
        });
        return;
      }

      const { missing, mismatched } = buildValidationIssues(expected);
      if (missing.length > 0 || mismatched.length > 0) {
        onChange({ status: "mismatch", name: file.name, size: file.size, missing, mismatched });
      } else {
        onChange({ status: "success", name: file.name, size: file.size });
      }
    };

    const handleFile = (file: File) => {
      const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
      const typeOk =
        INVOICE_ACCEPTED_MIME_TYPES.includes(file.type as (typeof INVOICE_ACCEPTED_MIME_TYPES)[number]) ||
        INVOICE_ACCEPTED_EXTENSIONS.includes(extension as (typeof INVOICE_ACCEPTED_EXTENSIONS)[number]);

      if (!typeOk) {
        onChange({
          status: "invalid",
          message: "Only PDF invoices are supported. Please upload a .pdf file.",
        });
        return;
      }
      if (file.size > INVOICE_MAX_SIZE_BYTES) {
        onChange({
          status: "invalid",
          message: `File is too large. Maximum size is ${formatFileSize(INVOICE_MAX_SIZE_BYTES)}.`,
        });
        return;
      }

      void runUpload(file);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) handleFile(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    };

    const handleRemove = () => {
      uploadTokenRef.current++;
      onChange({ status: "idle" });
    };

    const handleRetryUpload = (file: File) => {
      void runUpload(file);
    };

    const handleTryAgain = () => {
      onChange({ status: "idle" });
    };

    const handleReupload = () => {
      uploadTokenRef.current++;
      onChange({ status: "idle" });
      openFileDialog();
    };

    const showCreateInvoiceLink = value.status !== "success" && value.status !== "mismatch";

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

        {value.status === "success" ? (
          <div
            ref={ref}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon name="file-text" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{value.name}</p>
              <p className="text-[11px] text-muted-foreground">{formatFileSize(value.size)}</p>
            </div>
            <IconButton
              variant="ghost"
              size="sm"
              aria-label={`Remove ${value.name}`}
              onClick={handleRemove}
            >
              <Icon name="trash-2" className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        ) : value.status === "mismatch" ? (
          <MismatchPanel
            dropzoneRef={ref}
            name={value.name}
            size={value.size}
            missing={value.missing}
            mismatched={value.mismatched}
            onEditDetails={onEditDetails}
            onReupload={handleReupload}
          />
        ) : value.status === "extracting" ? (
          <div
            ref={ref}
            tabIndex={-1}
            className="flex flex-col gap-1.5 rounded-lg border border-border bg-card px-3.5 py-3"
          >
            <div className="flex min-w-0 items-center gap-2">
              <Icon name="loader" className="h-4 w-4 shrink-0 animate-spin text-primary" />
              <p className="min-w-0 truncate text-[13px]">
                <span className="font-medium text-foreground">Extracting</span>{" "}
                <span className="text-muted-foreground">{value.file.name}</span>
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Reviewing invoice details. This usually takes a few seconds. Please keep this
              window open.
            </p>
          </div>
        ) : value.status === "invalid" ? (
          <div
            ref={ref}
            tabIndex={-1}
            role="group"
            aria-describedby={errorId}
            className="flex flex-col items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-5 text-center"
          >
            <Icon name="alert-circle" className="h-5 w-5 text-destructive" />
            <p className="text-[13px] font-medium text-destructive">{value.message}</p>
            <Button type="button" variant="outline" size="sm" onClick={handleTryAgain}>
              Try again
            </Button>
          </div>
        ) : value.status === "upload-error" ? (
          <div
            ref={ref}
            tabIndex={-1}
            role="group"
            aria-describedby={errorId}
            className="flex flex-col items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-5 text-center"
          >
            <Icon name="alert-circle" className="h-5 w-5 text-destructive" />
            <p className="text-[13px] font-medium text-destructive">{value.message}</p>
            <p className="text-[11px] text-muted-foreground truncate max-w-full">{value.file.name}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRetryUpload(value.file)}
            >
              Retry
            </Button>
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
