"use client";

import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Checkbox,
  DatePicker,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils/format";
import { usePost } from "@/lib/api/hooks";
import { useMcaCurrencies } from "@/features/dashboard/create-invoice/hooks";
import { addClientInvoiceApi } from "@/features/dashboard/mca-invoices/services";
import {
  INVOICE_DATA_KEYS,
  UPLOADED_INVOICE_MAX_SIZE_BYTES,
} from "@/features/dashboard/mca-invoices/constants";
import {
  useInvoiceScanUpload,
  type ClientOption,
} from "@/features/dashboard/mca-invoices/useInvoiceScanUpload";
import type {
  AddClientInvoicePayload,
  ScannedInvoiceExtract,
} from "@/features/dashboard/mca-invoices/types";
import type { BaseResponse } from "@/types/common";

/**
 * "Upload Invoice" on Invoice Management, ported from pg-dashboard's
 * UploadInvoiceDrawer.
 *
 * The other way to get an invoice into the list. Create Invoice builds one in
 * the editor; this takes a PDF the merchant already has, extracts it server
 * side, and asks them to confirm what was read before the record is created.
 * Production leads with why that matters — an invoice on file is what the
 * settlement check validates a payment against — so the first step keeps those
 * two bullets rather than opening on a bare file picker.
 *
 * Two steps, exactly as production sequences them:
 *   1. Pick a PDF, upload it, wait for extraction (see useInvoiceScanUpload).
 *   2. Confirm client, currency, amount, dates and invoice number, tick the
 *      consent box, and POST add-client-invoice.
 *
 * The consent tick is load bearing and travels in the body as
 * `userCreateConsent`, the same way the link flows carry `userLinkConsent`.
 */

const CONSENT_TEXT = {
  short:
    "By proceeding with this action, you confirm and acknowledge that all information submitted for invoice generation is accurate and complete.",
  more: "PayGlocal Technologies Private Limited acts only as a technology platform and does not review, validate or verify the accuracy, completeness, or legality of any information that you submit, nor does it ensure compliance with any tax or regulatory requirements. All invoices generated through this platform are created solely based on the information you provide and are intended exclusively for your internal records and communication with your customers.",
};

/** What happens to an uploaded invoice once it is on file — production's own
 *  STEPS_TO_CREATE, verbatim. */
const WHAT_HAPPENS_NEXT = [
  {
    title: "Invoice validation on payment",
    description: "When funds are received, the invoice is validated against the payment.",
    points: [
      "Remitter name",
      "Invoice amount (within ±1% tolerance)",
      "Invoice currency",
      "Alignment of line items with your business activity",
    ],
  },
  {
    title: "Automatic transaction linking",
    description:
      "If all validation checks pass, the invoice is automatically linked to the transaction.",
    points: [],
  },
];

export function UploadInvoiceDialog({
  mid,
  open,
  onOpenChange,
  onUploaded,
}: {
  /** The account the invoice is raised under. The list can span MIDs, so the
   *  caller resolves this before opening (see MidScopedAction). */
  mid: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired once the invoice exists, so the list and its counts can refresh. */
  onUploaded: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-h-[48rem] w-[95vw] max-w-xl flex-col overflow-hidden p-0">
        <DialogTitle className="shrink-0 border-b border-border px-5 py-4 text-[16px] font-semibold">
          Upload invoice
        </DialogTitle>
        {/* Remounted per opening, so a dialog closed midway through an upload
            never reopens holding the previous file, its extraction or a
            half-filled confirm form. */}
        {open && (
          <UploadInvoiceBody
            key={mid}
            mid={mid}
            onOpenChange={onOpenChange}
            onUploaded={onUploaded}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function UploadInvoiceBody({
  mid,
  onOpenChange,
  onUploaded,
}: {
  mid: string;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}) {
  const upload = useInvoiceScanUpload(mid);
  // The chosen file before it is sent. Production separates picking from
  // uploading — the merchant sees what they picked and presses Upload — so
  // this is local state, not the hook's `file` (which is what IS uploading).
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [rejection, setRejection] = useState<string | null>(null);

  const isScanning = upload.phase === "scanning";
  const isReady = upload.phase === "ready" && !!upload.extract;

  const handlePick = (candidate: File) => {
    const extension = `.${candidate.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (candidate.type !== "application/pdf" && extension !== ".pdf") {
      setRejection("Only PDF invoices are supported. Please upload a .pdf file.");
      return;
    }
    if (candidate.size > UPLOADED_INVOICE_MAX_SIZE_BYTES) {
      setRejection(
        `File is too large. Maximum size is ${formatFileSize(UPLOADED_INVOICE_MAX_SIZE_BYTES)}.`
      );
      return;
    }
    setRejection(null);
    setPendingFile(candidate);
  };

  const handleUploadDifferent = () => {
    upload.reset();
    setPendingFile(null);
    setRejection(null);
  };

  if (isReady) {
    return (
      <ConfirmInvoiceStep
        mid={mid}
        invoiceId={upload.invoiceId}
        extract={upload.extract as ScannedInvoiceExtract}
        clientOptions={upload.clientOptions}
        onUploadDifferent={handleUploadDifferent}
        onCreated={() => {
          onUploaded();
          onOpenChange(false);
        }}
      />
    );
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <p className="text-[13px] text-muted-foreground">
          Upload and extract invoice data automatically.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          {WHAT_HAPPENS_NEXT.map((step) => (
            <div key={step.title} className="flex items-start gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-[13px] font-medium text-foreground">{step.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                {step.points.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1 pl-3">
                    {step.points.map((point) => (
                      <li key={point} className="text-[12px] text-muted-foreground">
                        • {point}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <InvoiceFileField
            file={pendingFile}
            disabled={isScanning}
            onPick={handlePick}
            onClear={handleUploadDifferent}
          />
          {rejection && <p className="mt-2 text-[12px] text-destructive">{rejection}</p>}
          {upload.error && (
            <Alert variant="error" className="mt-3">
              <AlertDescription>{upload.error}</AlertDescription>
            </Alert>
          )}
          {isScanning && (
            <p className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Icon name="refresh" className="h-3.5 w-3.5 animate-spin" />
              Reading your invoice. This usually takes a few seconds.
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
        <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!pendingFile || isScanning}
          isLoading={isScanning}
          onClick={() => {
            if (pendingFile) void upload.startUpload(pendingFile);
          }}
        >
          {isScanning ? "Extracting data…" : "Upload invoice"}
        </Button>
      </div>
    </>
  );
}

/** Drop target / file row for the single PDF this flow takes. */
function InvoiceFileField({
  file,
  disabled,
  onPick,
  onClear,
}: {
  file: File | null;
  disabled: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const openFileDialog = () => inputRef.current?.click();

  if (file) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon name="file-text" className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-foreground">{file.name}</p>
          <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onClear}>
          Remove
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* The only bare element here: a hidden file input has no flux
          equivalent, and it is never shown — the styled drop target below is
          what the merchant interacts with. */}
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          e.target.value = "";
          if (selected) onPick(selected);
        }}
      />
      <div
        role="button"
        tabIndex={0}
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
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) onPick(dropped);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
          isDragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50"
        )}
      >
        <Icon name="upload" className="h-5 w-5 text-muted-foreground" />
        <p className="text-[13px] font-medium text-foreground">
          Drag and drop your PDF invoice, or{" "}
          <span className="text-primary underline underline-offset-2">click to browse</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          PDF only, up to {formatFileSize(UPLOADED_INVOICE_MAX_SIZE_BYTES)}
        </p>
      </div>
    </>
  );
}

/**
 * Normalises an extracted date to the `YYYY-MM-DD` the picker and the API both
 * speak. Extraction returns whatever the document used, so the three formats
 * pg-dashboard parses are accepted and anything else is left blank for the
 * merchant to fill in rather than guessed at.
 */
function toDateValue(raw?: string | null): string {
  if (!raw) return "";
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const slashed = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!slashed) return "";

  const [, first, second, year] = slashed;
  // DD/MM/YYYY unless the first pair cannot be a day, in which case it is
  // MM/DD/YYYY. Ambiguous dates resolve day-first, matching pg-dashboard's
  // format order.
  const isDayFirst = Number(first) > 12 || Number(second) <= 12;
  const day = isDayFirst ? first : second;
  const month = isDayFirst ? second : first;
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return "";
  return `${year}-${month}-${day}`;
}

function ConfirmInvoiceStep({
  mid,
  invoiceId,
  extract,
  clientOptions,
  onUploadDifferent,
  onCreated,
}: {
  mid: string;
  invoiceId: string;
  extract: ScannedInvoiceExtract;
  clientOptions: ClientOption[];
  onUploadDifferent: () => void;
  onCreated: () => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const { currencies } = useMcaCurrencies();

  // Creating the invoice adds a row and moves the counts above the table, so
  // both have to refetch — INVOICE_DATA_KEYS is the pair.
  const { mutate: createInvoice, isPending } = usePost<BaseResponse<null>, AddClientInvoicePayload>(
    addClientInvoiceApi(mid, invoiceId),
    { invalidateQueries: INVOICE_DATA_KEYS }
  );

  const form = useForm({
    // Seeded from extraction, which is why this step is only ever mounted once
    // the payload has landed: defaultValues are read on the first render.
    defaultValues: {
      clientId: clientOptions.length === 1 ? clientOptions[0].value : "",
      currency: extract.currency ?? "",
      totalAmount: extract.totalAmount != null ? String(extract.totalAmount) : "",
      invoiceDate: toDateValue(extract.invoiceDate),
      dueDate: toDateValue(extract.dueDate),
      invoiceNumber: extract.invoiceNumber ?? "",
      userCreateConsent: false,
    },
    onSubmit: ({ value }) => {
      createInvoice(
        {
          clientId: value.clientId,
          clientName: clientOptions.find((c) => c.value === value.clientId)?.label ?? "",
          currency: value.currency,
          totalAmount: value.totalAmount,
          invoiceDate: value.invoiceDate,
          dueDate: value.dueDate,
          invoiceNumber: value.invoiceNumber,
          userCreateConsent: value.userCreateConsent,
        },
        {
          onSuccess: () => {
            toast.success("Invoice created", {
              description: `${value.invoiceNumber} is now in your invoice list.`,
            });
            onCreated();
          },
          onError: (error) =>
            toast.error("Couldn't create the invoice", { description: error.message }),
        }
      );
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <p className="text-[13px] font-semibold text-foreground">Confirm invoice details</p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Check what we read off your invoice, and correct anything that is wrong.
        </p>

        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-muted/20 p-4">
          <form.Field
            name="clientId"
            validators={{
              onSubmit: ({ value }) => (value ? undefined : "Please select a client"),
            }}
          >
            {(field) => {
              const picked = clientOptions.find((c) => c.value === field.state.value);
              return (
                <Field>
                  <FieldLabel htmlFor="upload-invoice-client">
                    Client <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(next) => field.handleChange(next)}
                  >
                    <SelectTrigger
                      id="upload-invoice-client"
                      className="w-full"
                      aria-invalid={field.state.meta.errors.length > 0}
                    >
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Production flags this case too: the name came off the
                      document and is not on file yet, so confirming creates it. */}
                  {picked?.isNew && (
                    <Badge variant="success" className="mt-1 w-fit">
                      New client — the name will be saved when you confirm
                    </Badge>
                  )}
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              );
            }}
          </form.Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="currency"
              validators={{
                onSubmit: ({ value }) => (value ? undefined : "Please select a currency"),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="upload-invoice-currency">
                    Currency <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={(next) => field.handleChange(next)}
                  >
                    <SelectTrigger
                      id="upload-invoice-currency"
                      className="w-full"
                      aria-invalid={field.state.meta.errors.length > 0}
                    >
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((currency) => (
                        <SelectItem key={currency.currencyCode} value={currency.currencyCode}>
                          {currency.currencyCode} {currency.currencySymbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>

            <form.Field
              name="totalAmount"
              validators={{
                onSubmit: ({ value }) => {
                  if (!value.trim()) return "Please enter the total amount";
                  return Number(value) > 0 ? undefined : "Enter an amount greater than zero";
                },
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor="upload-invoice-amount">
                    Amount <span className="text-destructive">*</span>
                  </FieldLabel>
                  <Input
                    id="upload-invoice-amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={field.state.value}
                    aria-invalid={field.state.meta.errors.length > 0}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field
              name="invoiceDate"
              validators={{
                onSubmit: ({ value }) => (value ? undefined : "Please select the invoice date"),
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel>
                    Invoice date <span className="text-destructive">*</span>
                  </FieldLabel>
                  <DatePicker
                    value={field.state.value}
                    onChange={(next) => {
                      field.handleChange(next);
                      // Production clears the due date whenever the invoice
                      // date moves, since the one bounds the other.
                      form.setFieldValue("dueDate", "");
                    }}
                    placeholder="Select date"
                  />
                  <FieldError>{field.state.meta.errors[0]}</FieldError>
                </Field>
              )}
            </form.Field>

            <form.Subscribe selector={(state) => state.values.invoiceDate}>
              {(invoiceDate) => (
                <form.Field
                  name="dueDate"
                  validators={{
                    onSubmit: ({ value }) => {
                      if (!value) return "Please select the due date";
                      if (invoiceDate && value < invoiceDate)
                        return "Due date cannot be before the invoice date";
                      return undefined;
                    },
                  }}
                >
                  {(field) => (
                    <Field>
                      <FieldLabel>
                        Due date <span className="text-destructive">*</span>
                      </FieldLabel>
                      <DatePicker
                        value={field.state.value}
                        onChange={(next) => field.handleChange(next)}
                        min={invoiceDate || undefined}
                        placeholder="Select date"
                      />
                      <FieldError>{field.state.meta.errors[0]}</FieldError>
                    </Field>
                  )}
                </form.Field>
              )}
            </form.Subscribe>
          </div>

          <form.Field
            name="invoiceNumber"
            validators={{
              onSubmit: ({ value }) =>
                value.trim() ? undefined : "Please enter the invoice number",
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor="upload-invoice-number">
                  Invoice number <span className="text-destructive">*</span>
                </FieldLabel>
                <Input
                  id="upload-invoice-number"
                  placeholder="e.g. INV-1042"
                  value={field.state.value}
                  aria-invalid={field.state.meta.errors.length > 0}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                <FieldError>{field.state.meta.errors[0]}</FieldError>
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field
          name="userCreateConsent"
          validators={{
            onSubmit: ({ value }) => (value ? undefined : "Please accept to proceed"),
          }}
        >
          {(field) => (
            <Field className="mt-4">
              <label className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={field.state.value}
                  onCheckedChange={(next) => field.handleChange(next === true)}
                  className="mt-0.5"
                />
                <span className="text-[12.5px] text-muted-foreground">
                  {CONSENT_TEXT.short}
                  {showMore && <> {CONSENT_TEXT.more}</>}{" "}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 align-baseline text-[12.5px]"
                    onClick={(e) => {
                      // The label wraps this, so a bare click would also toggle
                      // the box.
                      e.preventDefault();
                      setShowMore((v) => !v);
                    }}
                  >
                    {showMore ? "Show less" : "Show more"}
                  </Button>
                </span>
              </label>
              <FieldError>{field.state.meta.errors[0]}</FieldError>
            </Field>
          )}
        </form.Field>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isPending}
          onClick={onUploadDifferent}
        >
          Upload different file
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isPending}
          isLoading={isPending}
        >
          {isPending ? "Creating…" : "Confirm"}
        </Button>
      </div>
    </form>
  );
}
