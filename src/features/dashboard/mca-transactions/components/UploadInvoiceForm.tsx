"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useStore } from "@tanstack/react-form";
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
} from "@/features/dashboard/mca-transactions/components/PurposeCodeCombobox";
import { usePurposeCodes } from "@/features/dashboard/mca-transactions/hooks";
import { merchantProfilePurposeCodeApi } from "@/features/dashboard/mca-transactions/services";
import { usePut } from "@/lib/api/hooks";
import { InvoiceDropzone } from "@/features/dashboard/mca-transactions/components/InvoiceDropzone";
import { useInvoiceUpload } from "@/features/dashboard/mca-transactions/useInvoiceUpload";
import {
  hasInvoiceIssues,
  hasRemitterNameMismatch,
  isCbaNameFlagged,
  toInvoiceComparison,
} from "@/features/dashboard/mca-transactions/invoiceMatching";
import type { McaTransaction } from "@/features/dashboard/mca-transactions/types";

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

export function UploadInvoiceForm({
  row,
  variant = "modal",
  onCancel,
  onSuccess,
}: UploadInvoiceFormProps) {
  const isModal = variant === "modal";
  const [saveError, setSaveError] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const purposeCodeRef = useRef<PurposeCodeComboboxHandle>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Which codes this merchant may choose from, and which one they last used,
  // both come from the API — see usePurposeCodes.
  const {
    options: purposeCodeOptions,
    defaultPurposeCode,
    isLoading: isLoadingPurposeCodes,
  } = usePurposeCodes(row.merchantId);

  // Persists the merchant's choice back onto their profile, so the next
  // invoice opens preselected with it. Same PUT pg-dashboard fires alongside
  // its upload; the URL carries the code, so it is built per submit.
  const { mutateAsync: savePurposeCode } = usePut<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: [["merchant-profile", row.merchantId]],
  });

  // The upload chain itself: file -> S3 -> extraction poll -> comparison,
  // and then the real attach on submit.
  const upload = useInvoiceUpload({ merchantId: row.merchantId, gid: row.gid });

  const comparison = upload.matching ? toInvoiceComparison(upload.matching) : null;
  const hasIssues = !!comparison && hasInvoiceIssues(comparison);
  // Extraction failing is not the merchant's problem to solve. Verification is
  // an assist — it flags likely mismatches before compliance sees them — so
  // when it errors or times out the invoice still uploads and goes to manual
  // review, exactly as one with flagged discrepancies does. The only state
  // that blocks submission is having no file, or a scan still running.
  const verificationFailed = upload.phase === "error" && !!upload.file;
  // The transaction's remitter name is a correspondent bank's, not the sender's.
  // A re-upload is the better fix and the dropzone panel leads with it, but this
  // no longer blocks submission: the merchant can send the invoice through to
  // manual review instead of being stuck when they have nothing better to
  // upload.
  const hasCbaRemitterName = upload.phase === "ready" && isCbaNameFlagged(upload.matching);
  const isInvoiceReady = upload.phase === "ready" || verificationFailed;
  // Nothing to opt into when the comparison never produced a name to compare.
  // Still suppressed while the transaction's own name is the unusable one:
  // whether a CBA-named transaction may take the invoice's name onto its FIRC
  // is a compliance call, not one to make by leaving the checkbox on screen.
  const showRemitterNameOptIn = !hasCbaRemitterName && hasRemitterNameMismatch(upload.matching);
  const isSubmitUnverified = hasCbaRemitterName || hasIssues || verificationFailed;

  // Why this submission goes to manual review. The CBA name outranks the field
  // comparison, the same precedence the dropzone panel gives it.
  let unverifiedNotice =
    "Invoice will be flagged for manual review and might cause delay in settlement.";
  if (hasCbaRemitterName) {
    unverifiedNotice =
      "The remitter name on this transaction doesn't look like the sender's. Submitting will send this invoice to manual review, which might delay settlement.";
  } else if (verificationFailed) {
    unverifiedNotice =
      "We couldn't check this invoice against the transaction. It will go to manual review, which might delay settlement.";
  }

  const form = useForm({
    defaultValues: {
      // Empty until the profile call resolves; the effect below fills it in.
      // A merchant who picks a code before then keeps their choice, since
      // that effect only writes into a still-untouched field.
      purposeCode: "",
      generateFircWithInvoiceRemitterName: false,
    },
    onSubmit: async ({ value }) => {
      setSaveError(null);
      try {
        await upload.submit({
          purposeCode: value.purposeCode,
          // Only meaningful when the name actually differed; the checkbox is
          // hidden otherwise, but the value can survive a re-upload.
          useInvoiceRemitterName:
            showRemitterNameOptIn && value.generateFircWithInvoiceRemitterName,
        });

        if (value.purposeCode && value.purposeCode !== defaultPurposeCode) {
          // Best-effort: a failure here only means the next invoice opens
          // without this code preselected, so it must not fail the upload.
          await savePurposeCode({
            dynamicUrl: merchantProfilePurposeCodeApi(row.merchantId, value.purposeCode),
          }).catch(() => undefined);
        }
        onSuccess?.();
      } catch (err) {
        setSaveError(
          err instanceof Error ? err.message : "Something went wrong. Please try again."
        );
      }
    },
  });

  // Preselects the merchant's existing purpose code once it arrives. Guarded
  // on the field being untouched and still empty so it can never overwrite a
  // selection the merchant has already made.
  const purposeCodeField = useStore(form.store, (s) => s.values.purposeCode);
  useEffect(() => {
    if (!defaultPurposeCode || purposeCodeField) return;
    form.setFieldValue("purposeCode", defaultPurposeCode);
  }, [defaultPurposeCode, purposeCodeField, form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isInvoiceReady) {
      // The invoice is no longer a form field (the upload hook owns it), so
      // its "required" check lives here rather than in a field validator.
      // Only a missing file or an in-flight scan gets here now — a flagged
      // result, CBA name included, is submittable.
      setInvoiceError("Upload an invoice to continue.");
      dropzoneRef.current?.focus();
      return;
    }
    setInvoiceError(null);
    await form.handleSubmit();

    if ((form.getFieldMeta("purposeCode")?.errors ?? []).length > 0) {
      purposeCodeRef.current?.focus();
    }
  };

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

        {/* Only the standalone modal states the settlement-blocking rule up
            front: inside the settlement timeline, the step this form is
            nested under (see TransactionDetailsPage's uploadSlot) already
            says "Invoice review"/"Upload invoice", so repeating why the
            invoice is required here read as redundant in that context. */}
        {isModal && (
          <DialogDescription asChild>
            <Alert variant="neutral">
              <AlertDescription>
                This transaction can&apos;t proceed to settlement until an invoice is provided.
              </AlertDescription>
            </Alert>
          </DialogDescription>
        )}

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
                options={purposeCodeOptions}
                isLoading={isLoadingPurposeCodes}
              />
              <FieldError id="purposeCode-error">{field.state.meta.errors[0]}</FieldError>
            </Field>
          )}
        </form.Field>

        <Field invalid={!!invoiceError}>
          <FieldLabel htmlFor="invoice">
            Invoice <span className="text-destructive">*</span>
          </FieldLabel>
          <FieldDescription>
            Invoice must match the amount, currency, and sender name. It should also include the
            remitter address and item details.
          </FieldDescription>
          <InvoiceDropzone
            ref={dropzoneRef}
            id="invoice"
            phase={upload.phase}
            file={upload.file}
            matching={upload.matching}
            error={upload.error}
            onSelectFile={(file) => {
              setInvoiceError(null);
              void upload.startScan(file);
            }}
            onReset={upload.reset}
            invalid={!!invoiceError}
            errorId="invoice-error"
            onCreateInvoice={() => {
              // TODO: hand off to the /invoices/create flow and populate this
              // field with the created invoice once that flow exists here.
            }}
          />
          <FieldError id="invoice-error">{invoiceError}</FieldError>
        </Field>
      </div>

      <div className={cn(isModal ? "shrink-0 border-t border-border bg-card px-6 py-4" : "mt-5")}>
        <form.Subscribe
          selector={(s) => ({
            purposeCode: s.values.purposeCode,
            isSubmitting: s.isSubmitting,
          })}
        >
          {({ purposeCode, isSubmitting }) => (
            <>
              {showRemitterNameOptIn && (
                <form.Field name="generateFircWithInvoiceRemitterName">
                  {(field) => (
                    <label className="mb-3 flex items-center gap-2 text-[12px] text-foreground">
                      <Checkbox
                        checked={field.state.value}
                        onCheckedChange={(checked) => field.handleChange(checked === true)}
                      />
                      Generate FIRC using the &ldquo;Remitter Name&rdquo; mentioned in the invoice
                    </label>
                  )}
                </form.Field>
              )}
              <div className={cn("flex gap-2", isModal ? "flex-col-reverse sm:flex-row" : "")}>
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onCancel}
                    className={cn(isModal && "flex-1")}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={!purposeCode || !isInvoiceReady}
                  isLoading={isSubmitting}
                  className={cn(isModal ? "flex-1" : "w-full")}
                >
                  {isSubmitting ? "Submitting…" : isSubmitUnverified ? "Submit anyway" : "Submit"}
                </Button>
              </div>
              {isSubmitUnverified && (
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  {unverifiedNotice}
                </p>
              )}
            </>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
