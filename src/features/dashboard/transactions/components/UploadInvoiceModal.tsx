"use client";

import { useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Alert,
  AlertDescription,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Drawer,
  DrawerContent,
  Field,
  FieldError,
  FieldLabel,
  useBreakpoint,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import {
  PurposeCodeCombobox,
  type PurposeCodeComboboxHandle,
} from "@/features/dashboard/transactions/components/PurposeCodeCombobox";
import {
  InvoiceDropzone,
  type InvoiceUploadState,
} from "@/features/dashboard/transactions/components/InvoiceDropzone";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

interface UploadInvoiceModalProps {
  row: McaTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: (row: McaTransaction) => void;
}

// TODO: replace with a real usePost call against the invoice-upload endpoint
// once it exists — see CLAUDE.md, do not guess API contracts.
async function simulateSaveInvoice(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  if (Math.random() < 0.1) {
    throw new Error("Couldn't save the invoice. Please try again.");
  }
}

export function UploadInvoiceModal({ row, open, onOpenChange, onUploaded }: UploadInvoiceModalProps) {
  const { isMobile } = useBreakpoint();

  const body = row ? (
    <UploadInvoiceFormBody row={row} onOpenChange={onOpenChange} onUploaded={onUploaded} />
  ) : null;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} side="bottom">
        <DrawerContent className="flex max-h-[88vh] flex-col rounded-t-2xl p-0">{body}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,44rem)] w-[min(100%-1.5rem,30rem)] max-w-none flex-col",
          "gap-0 overflow-hidden rounded-2xl p-0"
        )}
      >
        {body}
      </DialogContent>
    </Dialog>
  );
}

function UploadInvoiceFormBody({
  row,
  onOpenChange,
  onUploaded,
}: {
  row: McaTransaction;
  onOpenChange: (open: boolean) => void;
  onUploaded?: (row: McaTransaction) => void;
}) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const purposeCodeRef = useRef<PurposeCodeComboboxHandle>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const form = useForm({
    defaultValues: {
      purposeCode: "",
      invoice: { status: "idle" } as InvoiceUploadState,
    },
    onSubmit: async ({ value }) => {
      setSaveError(null);
      try {
        await simulateSaveInvoice();
        onUploaded?.(row);
        onOpenChange(false);
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
      void value;
    },
  });

  const counterpartyName = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName ?? "—";
  const amount = parseFloat(row.amount ?? "0");
  const currency = row.currency ?? "USD";

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

  return (
    <>
      <div className="shrink-0 border-b border-border px-6 pt-5 pb-4">
        <DialogTitle>Upload invoice</DialogTitle>
        <p className="mt-1 truncate text-[12px] leading-snug text-muted-foreground">
          {row.gid} · {counterpartyName} · {formatCurrency(amount, currency, "en-US")} {currency}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {saveError && (
            <Alert variant="error">
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          )}

          <DialogDescription asChild>
            <Alert variant="warning" className="mb-0">
              <AlertDescription>
                This transaction can&apos;t proceed to settlement until a purpose code and invoice
                are provided.
              </AlertDescription>
            </Alert>
          </DialogDescription>

          <form.Field
            name="purposeCode"
            validators={{
              onBlur: ({ value }) => (!value ? "Select a purpose code to continue." : undefined),
              onSubmit: ({ value }) => (!value ? "Select a purpose code to continue." : undefined),
            }}
          >
            {(field) => (
              <Field invalid={field.state.meta.errors.length > 0}>
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
                value.status !== "success" ? "Upload an invoice to continue." : undefined,
            }}
          >
            {(field) => (
              <Field invalid={field.state.meta.errors.length > 0}>
                <FieldLabel htmlFor="invoice">
                  Invoice <span className="text-destructive">*</span>
                </FieldLabel>
                <InvoiceDropzone
                  ref={dropzoneRef}
                  id="invoice"
                  value={field.state.value}
                  onChange={field.handleChange}
                  invalid={field.state.meta.errors.length > 0}
                  errorId="invoice-error"
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

        <div className="shrink-0 border-t border-border bg-card px-6 py-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <form.Subscribe
              selector={(s) => ({
                purposeCode: s.values.purposeCode,
                invoiceStatus: s.values.invoice.status,
                isSubmitting: s.isSubmitting,
              })}
            >
              {({ purposeCode, invoiceStatus, isSubmitting }) => (
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!purposeCode || invoiceStatus !== "success"}
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? "Saving…" : "Save and continue"}
                </Button>
              )}
            </form.Subscribe>
          </div>
        </div>
      </form>
    </>
  );
}
