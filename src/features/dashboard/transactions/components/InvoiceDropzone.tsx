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
} from "@/features/dashboard/transactions/constants";

export type InvoiceUploadState =
  | { status: "idle" }
  | { status: "extracting"; file: File }
  | { status: "success"; name: string; size: number }
  | { status: "invalid"; message: string }
  | { status: "upload-error"; file: File; message: string };

// How long the "Extracting" state stays visible after upload completes, while
// invoice details are (simulated to be) parsed out of the file.
const EXTRACTING_DURATION_MS = 10_000;

interface InvoiceDropzoneProps {
  id: string;
  value: InvoiceUploadState;
  onChange: (next: InvoiceUploadState) => void;
  invalid?: boolean;
  errorId?: string;
  onCreateInvoice?: () => void;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const InvoiceDropzone = forwardRef<HTMLDivElement, InvoiceDropzoneProps>(
  ({ id, value, onChange, invalid, errorId, onCreateInvoice }, ref) => {
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

      const succeeded = Math.random() > 0.15;
      if (succeeded) {
        onChange({ status: "success", name: file.name, size: file.size });
      } else {
        onChange({
          status: "upload-error",
          file,
          message: "Upload failed due to a network error.",
        });
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

    const showCreateInvoiceLink = value.status !== "success";

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
        ) : value.status === "extracting" ? (
          <div
            ref={ref}
            tabIndex={-1}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3"
          >
            <Icon name="loader" className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground">Extracting</p>
              <p className="truncate text-[11px] text-muted-foreground">{value.file.name}</p>
            </div>
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
