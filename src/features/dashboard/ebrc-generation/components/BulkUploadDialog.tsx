"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  useBulkTemplateDownload,
  useBulkUpload,
  type BulkUploadResult,
} from "@/features/dashboard/ebrc-generation/hooks";

const STEPS = [
  { step: 1, label: "Upload" },
  { step: 2, label: "Done" },
];

/**
 * "Bulk eBRC Generation" — upload a filled-in template to map many IRMs at
 * once, matching the merchant-facing dialog directly.
 *
 * Three calls behind it, all from pg-dashboard's own BulkUploadModal:
 * `fetch_irm_bulk_template` returns the pre-filled workbook as base64;
 * `bulk_upload_excel_presigned_url` returns an S3 PUT the file goes straight
 * to; `bulk_upload_excel` then parses it and answers with either the IRMs it
 * read or the errors it found. Step 2 reports whichever came back — it never
 * claims a success the parser did not.
 */
export function BulkUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);

  const { downloadTemplate, isDownloading } = useBulkTemplateDownload();
  const { uploadWorkbook } = useBulkUpload();

  const fileName = file?.name ?? null;
  // Step 2 is reached only once the parser has answered.
  const currentStep = result ? 2 : 1;

  const close = () => {
    onOpenChange(false);
    setFile(null);
    setResult(null);
    setIsUploading(false);
  };

  const handleUpload = () => {
    if (!file) return;
    setIsUploading(true);
    uploadWorkbook(file, (uploadResult) => {
      setIsUploading(false);
      if (!uploadResult) return;
      setResult(uploadResult);
      const errors = uploadResult.errorDetails ?? [];
      if (errors.length === 0) {
        toast.success("Workbook uploaded", {
          description: `${uploadResult.recordResCount ?? uploadResult.irms?.length ?? 0} IRM(s) read from the file.`,
        });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : close())}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Bulk eBRC Generation</DialogTitle>
        <DialogDescription>
          Download the pre-filled template, complete the required data, and upload to generate eBRCs
          in bulk.
        </DialogDescription>

        <div className="mt-4 flex items-center gap-2">
          {STEPS.map((s, i) => (
            // Only the step that carries the connector grows. Giving every
            // step `flex-1` splits the row into equal halves, so the connector
            // stops at the midpoint and the last step sits left-aligned in its
            // own half instead of flush against the right edge.
            <div
              key={s.step}
              className={cn("flex items-center gap-2", i < STEPS.length - 1 && "flex-1")}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  s.step === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                )}
              >
                {s.step}
              </span>
              <span
                className={cn(
                  "text-[12.5px] font-medium",
                  s.step === currentStep ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
              {i === 0 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        <label
          htmlFor="bulk-ebrc-file"
          className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border px-4 py-10 text-center hover:bg-muted/30"
        >
          <Icon name="file-text" className="h-6 w-6 text-muted-foreground" />
          {fileName ? (
            <p className="text-[13px] font-medium text-foreground">{fileName}</p>
          ) : (
            <p className="text-[13px] text-foreground">
              <span className="font-medium text-primary">Choose a file</span> or drag it here
            </p>
          )}
          <p className="text-[11.5px] text-muted-foreground">Excel file (.xlsx) — up to 10 MB</p>
          {/* Bare `<input type="file">`, visually hidden and driven by the
              label above it — flux has no file-picker component, and this is
              the same exemption InvoiceDropzone and ImportSkuFileModal take. */}
          <input
            id="bulk-ebrc-file"
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
        </label>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <p className="flex-1 text-[12.5px] text-foreground">
            Your IRMs are pre-filled in the template.
          </p>
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto min-h-0 gap-1 p-0 text-[12.5px]"
            leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
            disabled={isDownloading}
            onClick={downloadTemplate}
          >
            Download pre-filled template
          </Button>
        </div>

        {/* Whatever the parser actually reported — the row count it read, or
            the errors it found. Never a synthesised summary. */}
        {result && (
          <div className="mt-4 space-y-2 rounded-lg border border-border p-3">
            {(result.errorDetails?.length ?? 0) > 0 ? (
              <>
                <p className="text-[12.5px] font-semibold text-destructive">
                  Couldn&apos;t process {result.errorDetails?.length} row(s)
                </p>
                <ul className="max-h-40 space-y-1 overflow-y-auto">
                  {result.errorDetails?.map((detail) => (
                    <li key={detail} className="text-[12px] text-muted-foreground">
                      {detail}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="text-[12.5px] font-semibold text-foreground">
                  {result.recordResCount ?? result.irms?.length ?? 0} IRM(s) read from the file
                </p>
                {result.dgftAckId && (
                  <p className="text-[12px] text-muted-foreground">
                    DGFT Ack. ID:{" "}
                    <span className="font-mono text-foreground">{result.dgftAckId}</span>
                  </p>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close} disabled={isUploading}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button
              type="button"
              variant="primary"
              disabled={!fileName || isUploading}
              isLoading={isUploading}
              onClick={handleUpload}
            >
              Upload
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
