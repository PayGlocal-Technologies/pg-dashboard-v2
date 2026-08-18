"use client";

import { useRef, useState } from "react";
import {
  Button,
  Callout,
  CalloutIcon,
  CalloutText,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import { SKU_TYPE_LABEL } from "@/features/dashboard/sku-management/constants";
import {
  useSkuFileImport,
  useSkuTemplate,
  type SkuImportStep,
} from "@/features/dashboard/sku-management/hooks";
import type { ExtractedSkuRow } from "@/features/dashboard/sku-management/types";

/**
 * An extracted row plus the position it held in the sheet. Nothing is persisted
 * at review time, so a parsed row has no id to key the table by — and two rows
 * of a sheet can legitimately be identical, which rules out keying on the
 * fields. The sheet's own order is the one thing that distinguishes them.
 */
type PreviewRow = ExtractedSkuRow & { rowKey: string };

// Which file types the sheet upload accepts. The backend presigns for xlsx and
// tells us so in the initiate response's metaData, but the picker has to be
// narrowed before that call happens, so these are named here too.
const IMPORT_ACCEPTED_EXTENSIONS = [".xlsx", ".xls", ".csv"] as const;
const IMPORT_ACCEPTED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
] as const;

/** The three legs the merchant walks, in order. */
const IMPORT_STEPS: { value: SkuImportStep; label: string }[] = [
  { value: "upload", label: "Upload" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

/**
 * Step rail across the top of the modal. There is no flux stepper, so this is
 * the smallest honest one: a numbered dot per step, the reached ones filled, a
 * hairline between them. Not interactive — the step is derived from what has
 * resolved (see useSkuFileImport), so a merchant cannot jump to a step whose
 * data does not exist yet.
 */
function StepRail({ current }: { current: SkuImportStep }) {
  const currentIndex = IMPORT_STEPS.findIndex((step) => step.value === current);

  return (
    <ol className="flex items-center gap-2" aria-label="Import progress">
      {IMPORT_STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        return (
          <li key={step.value} className="flex flex-1 items-center gap-2 last:flex-none">
            <span
              aria-current={index === currentIndex ? "step" : undefined}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              {index + 1}
            </span>
            <span
              className={cn(
                "text-[12.5px] whitespace-nowrap",
                reached ? "font-medium text-foreground" : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
            {index < IMPORT_STEPS.length - 1 ? (
              <span
                aria-hidden
                className={cn("h-px flex-1", index < currentIndex ? "bg-primary" : "bg-border")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The review table's columns. Deliberately the same seven fields pg-dashboard
 * previews, in the same order, and read straight off the wire shape: this is
 * "here is what we parsed out of your sheet", so mapping it into SkuProduct
 * first would hide a parse that came back wrong.
 */
function buildPreviewColumns(): Column<PreviewRow>[] {
  const cell = (value: string | null) => (
    <span className="text-[13px] whitespace-nowrap text-muted-foreground">{value || "—"}</span>
  );

  return [
    {
      key: "name",
      header: "Name",
      minWidth: 180,
      render: (row) => (
        <span className="text-[13px] font-medium whitespace-nowrap text-foreground">
          {row.name || "—"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      minWidth: 100,
      // The sheet's GOOD/SERVICE is shown with the label the rest of the page
      // uses, so the review step and the table it feeds don't name the same
      // thing differently.
      render: (row) =>
        cell(
          row.type === "GOOD"
            ? SKU_TYPE_LABEL.GOODS
            : row.type === "SERVICE"
              ? SKU_TYPE_LABEL.SERVICES
              : null
        ),
    },
    { key: "hsnSac", header: "HSN / SAC", minWidth: 120, render: (row) => cell(row.hsnSac) },
    {
      key: "unitPrice",
      header: "Selling price",
      minWidth: 120,
      render: (row) => cell(row.unitPrice),
    },
    { key: "costPrice", header: "Cost price", minWidth: 110, render: (row) => cell(row.costPrice) },
    { key: "currency", header: "Currency", minWidth: 100, render: (row) => cell(row.currency) },
    {
      key: "description",
      header: "Description",
      minWidth: 200,
      render: (row) => cell(row.description),
    },
  ];
}

interface ImportSkuFileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which merchant to import into. Only passed when a multi-MID merchant picked
   *  one from the header; otherwise the hook resolves the page's own MID. */
  mid?: string;
}

/**
 * Bulk import from a spreadsheet — the flow behind the page header's Import
 * button, ported from pg-dashboard's ImportFromFileModal.
 *
 * Three steps, one endpoint each after the template: the file goes straight to
 * S3 on a presigned PUT, the backend parses it, the merchant sees what was
 * parsed before anything is written, and the commit reports what went in and
 * what was skipped and why. Nothing reaches the catalogue until Import is
 * pressed on the review step.
 */
export function ImportSkuFileModal({ open, onOpenChange, mid }: ImportSkuFileModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [rejection, setRejection] = useState<string | null>(null);

  const { downloadTemplate, isLoading: isTemplateLoading } = useSkuTemplate();
  const {
    step,
    file,
    isProcessing,
    rows,
    importedCount,
    skipped,
    isImporting,
    selectFile,
    commit,
    reset,
  } = useSkuFileImport(undefined, mid);

  const previewRows: PreviewRow[] = rows.map((row, index) => ({
    ...row,
    rowKey: `sheet-row-${index}`,
  }));

  const close = () => {
    setRejection(null);
    setDragging(false);
    reset();
    onOpenChange(false);
  };

  // File type is checked here rather than server-side: it needs no round trip,
  // and a file we already know is wrong should never consume an upload slot. Size
  // is deliberately not checked here — the ceiling arrives in the initiate
  // response's metaData.maxSize, which is after this point, so S3 enforces it.
  const onPick = (picked: File | undefined) => {
    if (!picked) return;
    setRejection(null);

    const extension = picked.name.slice(picked.name.lastIndexOf(".")).toLowerCase();
    const typeOk =
      (IMPORT_ACCEPTED_MIME_TYPES as readonly string[]).includes(picked.type) ||
      (IMPORT_ACCEPTED_EXTENSIONS as readonly string[]).includes(extension);

    if (!typeOk) {
      setRejection("Choose an .xlsx, .xls or .csv file.");
      return;
    }

    selectFile(picked);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="w-[min(100%-1.5rem,56rem)] max-w-none gap-0 rounded-2xl p-6">
        <DialogTitle className="text-[17px] font-semibold text-foreground">
          Import items from a file
        </DialogTitle>
        <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
          Fill in the template and upload it. You&apos;ll see every row we read before anything is
          added to your catalog.
        </DialogDescription>

        <div className="mt-5">
          <StepRail current={step} />
        </div>

        {/* ── Step 1: upload ──────────────────────────────────────────────── */}
        {step === "upload" ? (
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] text-muted-foreground">
                Not sure about the columns? Start from our template.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isLoading={isTemplateLoading}
                leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
                onClick={downloadTemplate}
              >
                Download template
              </Button>
            </div>

            {/* A label rather than a div with a click handler: the file input
                sits inside it, so a click and a keyboard activation both reach
                the picker without re-implementing either. */}
            <label
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                onPick(event.dataTransfer.files?.[0]);
              }}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
                dragging ? "border-primary bg-primary/5" : "border-border bg-muted/30",
                isProcessing && "pointer-events-none opacity-70"
              )}
            >
              {/* Bare <input type="file"> is deliberate: flux-ui has no file
                  input, and this is the only element that can open the OS file
                  picker. Same exemption InvoiceDropzone takes. It is visually
                  hidden and driven by the label wrapping it, so the styled
                  dropzone above is what the merchant actually interacts with. */}
              <input
                ref={inputRef}
                type="file"
                accept={IMPORT_ACCEPTED_EXTENSIONS.join(",")}
                className="sr-only"
                onChange={(event) => onPick(event.target.files?.[0])}
              />
              {isProcessing ? (
                <>
                  <Icon name="refresh" className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">
                    Reading {file?.name}
                  </span>
                  <span className="text-[12px] text-muted-foreground">
                    {file ? formatFileSize(file.size) : null}
                  </span>
                </>
              ) : (
                <>
                  <Icon name="upload" className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">
                    Drop your file here, or click to choose
                  </span>
                  <span className="text-[12px] text-muted-foreground">.xlsx, .xls or .csv</span>
                </>
              )}
            </label>

            {rejection ? (
              <Callout variant="error">
                <CalloutIcon>
                  <Icon name="alert-triangle" className="h-4 w-4" />
                </CalloutIcon>
                <CalloutText>{rejection}</CalloutText>
              </Callout>
            ) : null}
          </div>
        ) : null}

        {/* ── Step 2: review what was parsed ──────────────────────────────── */}
        {step === "review" ? (
          <div className="mt-6 space-y-3">
            <Callout variant="warning">
              <CalloutIcon>
                <Icon name="alert-triangle" className="h-4 w-4" />
              </CalloutIcon>
              <CalloutText>
                Rows missing required fields (Type, Currency, or Selling price) will be skipped.
              </CalloutText>
            </Callout>

            <div className="max-h-[22rem] overflow-auto">
              <DataTable
                columns={buildPreviewColumns()}
                data={previewRows}
                rowKey={(row) => row.rowKey}
                density="compact"
                tableLayout="content"
                emptyTitle="Nothing to import"
                emptyDescription="We couldn't read any rows from that file"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] text-muted-foreground">
                {rows.length} {rows.length === 1 ? "row" : "rows"} read from {file?.name}
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={reset}>
                  Choose another file
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isImporting}
                  onClick={commit}
                >
                  Import {rows.length} {rows.length === 1 ? "item" : "items"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Step 3: what actually went in ───────────────────────────────── */}
        {step === "done" ? (
          <div className="mt-6 space-y-4">
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <span
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full",
                  importedCount > 0
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-500"
                )}
              >
                <Icon name={importedCount > 0 ? "check" : "alert-triangle"} className="h-5 w-5" />
              </span>
              <span className="text-[17px] font-semibold text-foreground">
                {importedCount} {importedCount === 1 ? "item" : "items"} imported
              </span>
              <span className="text-[13px] text-muted-foreground">
                {importedCount === 0
                  ? "Nothing was added. Fix the rows below and upload the file again."
                  : "They're in your catalog and ready to pull into invoices."}
              </span>
            </div>

            {/* The skipped list is the whole point of this step: a count alone
                leaves the merchant with no idea which line to go and fix. */}
            {skipped.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="border-b border-border bg-muted/60 px-3 py-2 text-[12px] font-semibold text-muted-foreground">
                  {skipped.length} {skipped.length === 1 ? "row" : "rows"} skipped
                </div>
                <ul className="max-h-52 divide-y divide-border overflow-auto">
                  {skipped.map((item) => (
                    <li
                      key={`${item.row}-${item.reason}`}
                      className="flex gap-3 px-3 py-2 text-[12.5px]"
                    >
                      <span className="shrink-0 font-medium tabular-nums text-foreground">
                        Row {item.row}
                      </span>
                      <span className="text-muted-foreground">{item.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Import another file
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={close}>
                Done
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
