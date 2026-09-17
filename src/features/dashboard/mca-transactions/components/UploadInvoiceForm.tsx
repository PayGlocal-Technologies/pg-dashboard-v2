"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  PurposeCodeCombobox,
  type PurposeCodeComboboxHandle,
} from "@/components/common/PurposeCodeCombobox";
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
import { usePacbMidScope } from "@/lib/hooks/usePacbMidScope";
import type { McaTransaction } from "@/features/dashboard/mca-transactions/types";

/**
 * The same two shortcuts the Transactions table's row-level "…" menu used to
 * offer (Create Invoice / Link Invoice — see McaTransactionTable's
 * onCreateInvoice/onLinkInvoice), now offered from inside the upload section
 * itself instead: the row's own menu is gone (see columns.tsx), so this is
 * their only remaining entry point. Both navigate away from the drawer
 * entirely — there is no inline "create" or "link" flow to switch this form
 * into, only a full page for each.
 *
 * Placed after the dropzone, not above the form: dragging/browsing a file is
 * the primary path, these two are the fallback for a merchant who doesn't
 * have one to drag yet — the same spot (and the same `variant="link"`,
 * secondary-to-the-dropzone weight) the old single "Don't have an invoice
 * yet? Create new invoice" stub occupied, just with both real destinations
 * instead of the one that was never wired up.
 *
 * Only shown for the inline (drawer) variant: the standalone modal is a
 * narrower, single-purpose surface (see its own "This transaction can't
 * proceed…" alert above), and offering two ways OUT of it as well as one
 * more form field defeats the point of it being the focused one.
 */
function InvoiceShortcutLinks({ row }: { row: McaTransaction }) {
  const router = useRouter();
  const { selectMid } = usePacbMidScope();

  return (
    <div className="mt-3 flex flex-wrap gap-4">
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto min-h-0 gap-1 px-0 py-0 text-[12px]"
        leftIcon={<Icon name="file-text" className="h-3.5 w-3.5" />}
        // Scopes the editor to this transaction's own merchant before
        // opening it, same as the removed row menu did — without it, a
        // merchant with several PACB MIDs and none selected would raise the
        // invoice under their first MID while linking it to a transaction on
        // another.
        onClick={() => {
          if (row.merchantId) selectMid(row.merchantId);
          router.push(`/create-invoice?gid=${row.gid}`);
        }}
      >
        Create a new invoice
      </Button>
      <Button
        type="button"
        variant="link"
        size="sm"
        className="h-auto min-h-0 gap-1 px-0 py-0 text-[12px]"
        leftIcon={<Icon name="paperclip" className="h-3.5 w-3.5" />}
        onClick={() => router.push(`/mca-invoices?linkTo=${row.gid}`)}
      >
        Link an invoice
      </Button>
    </div>
  );
}

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
            front: the inline variant sits in its own SettlementActionCard,
            directly above Settlement Timeline's own "Upload invoice"/
            "Invoice review" step (see TransactionDetailsPage.tsx), which
            already says as much, so repeating it here read as redundant in
            that context. */}
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
            // mt-5 only in the modal: there it separates this field from the
            // "This transaction can't proceed…" alert just above it. Inline,
            // there is nothing above this field but the surrounding card's
            // own top padding — stacking a second top margin on top of that
            // padding was the extra gap above "Purpose code" this card
            // wasn't supposed to have.
            <Field className={cn("mb-5", isModal && "mt-5")} invalid={field.state.meta.errors.length > 0}>
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
          />
          <FieldError id="invoice-error">{invoiceError}</FieldError>
        </Field>

        {/* Secondary to the dropzone above, not an alternative to reach for
            first — same slot the dropzone's own "Don't have an invoice yet?"
            link used to occupy (see InvoiceDropzone's showCreateInvoiceLink,
            now gated off since nothing calls onCreateInvoice any more), just
            with both real destinations instead of the one stubbed-out one. */}
        {!isModal && <InvoiceShortcutLinks row={row} />}
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
