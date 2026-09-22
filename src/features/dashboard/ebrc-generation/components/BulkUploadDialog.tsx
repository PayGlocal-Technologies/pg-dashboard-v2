"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

const STEPS = [
  { step: 1, label: "Upload" },
  { step: 2, label: "Done" },
];

/**
 * "Bulk eBRC Generation" — upload a filled-in template to map many IRMs at
 * once, matching the merchant-facing dialog directly. No backend exists to
 * parse or validate a real upload, so choosing a file only stores it locally
 * for preview; submitting is an honest stub, same pattern as
 * DgftConnectGate's login and EbrcGenerationFeature's own "Confirm and
 * generate" — it never fabricates a per-row success/failure result, since
 * there is no real parser behind it to produce one.
 */
export function BulkUploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);

  const close = () => {
    onOpenChange(false);
    setFileName(null);
  };

  const handleUpload = () => {
    // TODO(integration): POST the workbook to the bulk eBRC endpoint once it
    // exists — payload shape and per-row result format must come from a real
    // spec, not a guess.
    toast.message("Bulk eBRC generation isn't connected to the backend yet", {
      description: "Uploaded files aren't parsed or submitted to DGFT in this preview.",
    });
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : close())}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Bulk eBRC Generation</DialogTitle>
        <DialogDescription>
          Download the pre-filled template, complete the required data, and upload to generate
          eBRCs in bulk.
        </DialogDescription>

        <div className="mt-4 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.step} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                  s.step === 1
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground"
                )}
              >
                {s.step}
              </span>
              <span
                className={cn(
                  "text-[12.5px] font-medium",
                  s.step === 1 ? "text-foreground" : "text-muted-foreground"
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
          <input
            id="bulk-ebrc-file"
            type="file"
            accept=".xlsx"
            className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
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
            onClick={() =>
              toast.message("Template download isn't connected to the backend yet", {
                description: "This will export your open IRMs pre-filled into the upload template.",
              })
            }
          >
            Download pre-filled template
          </Button>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="button" variant="primary" disabled={!fileName} onClick={handleUpload}>
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
