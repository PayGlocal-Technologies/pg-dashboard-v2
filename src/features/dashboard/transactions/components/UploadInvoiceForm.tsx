"use client";

import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  DialogDescription,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  PurposeCodeCombobox,
  type PurposeCodeComboboxHandle,
} from "@/features/dashboard/transactions/components/PurposeCodeCombobox";
import {
  InvoiceDropzone,
  type InvoiceUploadState,
} from "@/features/dashboard/transactions/components/InvoiceDropzone";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

interface UploadInvoiceFormProps {
  row: McaTransaction;
  /**
   * "modal" (default) renders its own scrollable body + bordered footer, for
   * use inside a Dialog/Drawer shell. "inline" drops that chrome so the form
   * can sit as a plain section inside a larger scrollable parent (e.g. the
   * Transaction Details drawer) — no Cancel button either, since there's
   * nothing to dismiss in that context.
   */
  variant?: "modal" | "inline";
  onCancel?: () => void;
  onSuccess?: () => void;
}

// TODO: replace with a real usePost call against the invoice-upload endpoint
// once it exists — see CLAUDE.md, do not guess API contracts.
async function simulateSaveInvoice(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  if (Math.random() < 0.1) {
    throw new Error("Couldn't save the invoice. Please try again.");
  }
}

// An invoice with validation issues can still be submitted ("Submit anyway")
// for manual review — only "idle"/"extracting"/error states block submission.
function isInvoiceReady(status: InvoiceUploadState["status"]): boolean {
  return status === "success" || status === "mismatch";
}

export function UploadInvoiceForm({ row, variant = "modal", onCancel, onSuccess }: UploadInvoiceFormProps) {
  const isModal = variant === "modal";
  const [saveError, setSaveError] = useState<string | null>(null);
  const purposeCodeRef = useRef<PurposeCodeComboboxHandle>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const form = useForm({
    defaultValues: {
      purposeCode: "",
      invoice: { status: "idle" } as InvoiceUploadState,
      generateFircWithInvoiceRemitterName: false,
    },
    onSubmit: async ({ value }) => {
      setSaveError(null);
      try {
        await simulateSaveInvoice();
        onSuccess?.();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
      void value;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await form.handleSubmit();

    const purposeCodeErrors = form.getFieldMeta("purposeCode")?.errors ?? [];
    const invoiceErrors = form.getFieldMeta("invoice")?.errors ?? [];
    if (purposeCodeErrors.length > 0) {
      purposeCodeRef.current?.focus();
    } else if (invoiceErrors.length > 0) {
      dropzoneRef.current?.focus();
    }
  };

  const requirementBanner = (
    <Alert variant="neutral">
      <AlertDescription>
        This transaction can&apos;t proceed to settlement until a purpose code and invoice are
        provided.
      </AlertDescription>
    </Alert>
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn(isModal && "flex min-h-0 flex-1 flex-col overflow-hidden")}
    >
      <div className={cn(isModal ? "flex-1 overflow-y-auto px-6 py-5" : "space-y-0")}>
        {saveError && (
          <Alert variant="error" className="mb-5">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}

        {isModal ? <DialogDescription asChild>{requirementBanner}</DialogDescription> : requirementBanner}

        <form.Field
          name="purposeCode"
          validators={{
            onBlur: ({ value }) => (!value ? "Select a purpose code to continue." : undefined),
            onSubmit: ({ value }) => (!value ? "Select a purpose code to continue." : undefined),
          }}
        >
          {(field) => (
            <Field className="mt-5 mb-5" invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor="purposeCode">
                Purpose code <span className="text-destructive">*</span>
              </FieldLabel>
              <PurposeCodeCombobox
                ref={purposeCodeRef}
                id="purposeCode"
                value={field.state.value}
                onChange={field.handleChange}
                onBlur={field.handleBlur}
                invalid={field.state.meta.errors.length > 0}
                errorId="purposeCode-error"
              />
              <FieldError id="purposeCode-error">{field.state.meta.errors[0]}</FieldError>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="invoice"
          validators={{
            onSubmit: ({ value }) =>
              !isInvoiceReady(value.status) ? "Upload an invoice to continue." : undefined,
          }}
        >
          {(field) => (
            <Field invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor="invoice">
                Invoice <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldDescription>
                Invoice must match the amount, currency, and sender name. It should also include
                the remitter address and item details. PDF only.
              </FieldDescription>
              <InvoiceDropzone
                ref={dropzoneRef}
                id="invoice"
                value={field.state.value}
                onChange={field.handleChange}
                invalid={field.state.meta.errors.length > 0}
                errorId="invoice-error"
                expected={{
                  amount: parseFloat(row.amount ?? "0"),
                  currency: row.currency ?? "USD",
                  senderName: row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName ?? "—",
                }}
                onCreateInvoice={() => {
                  // TODO: hand off to the /invoices/create flow and populate
                  // this field with the created invoice once that flow exists.
                }}
              />
              <FieldError id="invoice-error">{field.state.meta.errors[0]}</FieldError>
            </Field>
          )}
        </form.Field>
      </div>

      <div className={cn(isModal ? "shrink-0 border-t border-border bg-card px-6 py-4" : "mt-5")}>
        <form.Subscribe
          selector={(s) => ({
            purposeCode: s.values.purposeCode,
            invoiceStatus: s.values.invoice.status,
            isSubmitting: s.isSubmitting,
          })}
        >
          {({ purposeCode, invoiceStatus, isSubmitting }) => (
            <>
              {invoiceStatus === "mismatch" && (
                <form.Field name="generateFircWithInvoiceRemitterName">
                  {(field) => (
                    <label className="mb-3 flex items-start gap-2 text-[12px] text-foreground">
                      <Checkbox
                        checked={field.state.value}
                        onCheckedChange={(checked) => field.handleChange(checked === true)}
                        className="mt-0.5"
                      />
                      Generate FIRC using the &ldquo;Remitter Name&rdquo; mentioned in the invoice
                    </label>
                  )}
                </form.Field>
              )}
              <div className={cn("flex gap-2", isModal ? "flex-col-reverse sm:flex-row sm:justify-end" : "")}>
                {onCancel && (
                  <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!purposeCode || !isInvoiceReady(invoiceStatus)}
                  isLoading={isSubmitting}
                  className={cn(!isModal && "w-full")}
                >
                  {isSubmitting
                    ? isModal
                      ? "Saving…"
                      : "Submitting…"
                    : invoiceStatus === "mismatch"
                      ? "Submit anyway"
                      : isModal
                        ? "Save and continue"
                        : "Submit"}
                </Button>
              </div>
              {invoiceStatus === "mismatch" && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Invoice will be flagged for manual review and might cause delay in settlement.
                </p>
              )}
            </>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
