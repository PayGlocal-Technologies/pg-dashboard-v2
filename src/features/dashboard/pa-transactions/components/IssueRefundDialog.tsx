"use client";

import { useStore } from "@tanstack/react-form";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";
import { useAppForm } from "@/components/form/AppForm";
import { check, required, rules } from "@/components/form/rules";

const REFUND_REASONS = [
  { value: "requested_by_customer", label: "Requested by customer" },
  { value: "duplicate", label: "Duplicate payment" },
  { value: "fraudulent", label: "Fraudulent" },
  { value: "other", label: "Other" },
];

export interface RefundSubmission {
  amount: number;
  reason: string;
  details: string;
}

interface IssueRefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  refundableAmount: number;
  /**
   * Returns a reason string when the caller rejects the refund (e.g. it would
   * over-refund against earlier refunds), which is shown under the amount and
   * keeps the dialog open. Returns nothing when the refund went through.
   */
  onSubmit: (input: RefundSubmission) => string | void;
}

/**
 * Issuing a refund here records a child RefundEvent against the original
 * transaction (see useRefundEvents), it never creates a second
 * merchant-facing transaction, the same TXN ID's own status updates to
 * Partially refunded/Refunded once this is submitted (see
 * deriveTransactionStatus/getDisplayStatus).
 */
export function IssueRefundDialog({
  open,
  onOpenChange,
  currency,
  refundableAmount,
  onSubmit,
}: IssueRefundDialogProps) {
  const clamp = (raw: string) => Math.min(Math.max(parseFloat(raw) || 0, 0), refundableAmount);

  const form = useAppForm({
    defaultValues: {
      amount: String(refundableAmount),
      reason: REFUND_REASONS[0]!.value,
      details: "",
    },
    onSubmit: ({ value, formApi }) => {
      const rejection = onSubmit({
        amount: clamp(value.amount),
        reason: value.reason,
        details: value.details,
      });
      if (rejection) {
        // The caller's reason (e.g. an over-refund) shows under the amount and
        // the dialog stays open; editing the amount clears it.
        formApi.setFieldMeta("amount", (meta) => ({
          ...meta,
          errorMap: { ...meta.errorMap, onSubmit: rejection },
        }));
        document.getElementById("refund-amount")?.focus();
        return;
      }
      onOpenChange(false);
    },
  });
  const amountInput = useStore(form.store, (state) => state.values.amount);
  const parsedAmount = clamp(amountInput);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Resync the draft every time the dialog opens, not via an effect, see
      // CLAUDE.md's hooks purity rules.
      form.reset({
        amount: String(refundableAmount),
        reason: REFUND_REASONS[0]!.value,
        details: "",
      });
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-sm flex-col gap-0 overflow-hidden p-0"
        onOpenAutoFocus={(e) => {
          // Radix focuses the first focusable descendant by default, which
          // would otherwise be the info icon button, opening its tooltip the
          // instant the dialog appears. Redirect focus to the amount input.
          e.preventDefault();
          document.getElementById("refund-amount")?.focus();
        }}
      >
        {/* Header / scrolling body / fixed footer, so Cancel and Refund stay
         * on screen however tall the body runs. The header row sits inline
         * with the library's absolutely-positioned (top-3 right-3) close
         * button rather than below the default pt-10 reserved for it. */}
        <div className="flex shrink-0 items-center gap-1.5 border-b border-border px-6 py-4 pr-14">
          <DialogTitle className="pr-0">Refund payment</DialogTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                aria-label="About refunds"
                className="h-5 w-5 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
              >
                <Icon name="info" size={13} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-60 text-xs">
              Refunds can take 5 to 10 days to appear on the customer&apos;s statement. This
              transaction&apos;s status will update to reflect the refund, no new transaction is
              created for it.
            </TooltipContent>
          </Tooltip>
        </div>

        <form.AppForm>
          <form.Form className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
              {/* Refund stays enabled; the amount validates as it changes once
                  edited, and on Refund (the app-wide rule). */}
              <form.AppField
                name="amount"
                validators={{
                  onChange: rules(
                    required("Refund amount"),
                    check((raw: string) => clamp(raw) <= 0 && "Enter an amount greater than zero")
                  ),
                }}
              >
                {(field) => (
                  <field.CustomField<string>
                    id="refund-amount"
                    label="Refund amount"
                    className="gap-2"
                    description={`Up to ${formatCurrency(refundableAmount, currency)} refundable.`}
                  >
                    {({ id, value, invalid, onChange, onBlur }) => (
                      <div className="flex items-center gap-2">
                        <Input
                          id={id}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={refundableAmount}
                          value={value}
                          aria-invalid={invalid || undefined}
                          onChange={(e) => onChange(e.target.value)}
                          onBlur={onBlur}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground">{currency}</span>
                      </div>
                    )}
                  </field.CustomField>
                )}
              </form.AppField>

              <form.AppField name="reason">
                {(field) => (
                  <field.SelectField
                    id="refund-reason"
                    label="Reason"
                    options={REFUND_REASONS}
                    className="gap-2"
                    triggerClassName=""
                  />
                )}
              </form.AppField>

              {/* No "(optional)" suffix: required fields carry the *, so an
                  unmarked field already reads as optional. */}
              <form.AppField name="details">
                {(field) => (
                  <field.TextareaField
                    id="refund-details"
                    label="Additional details"
                    placeholder="Add more details about this refund"
                    rows={3}
                    className="gap-2"
                    inputClassName="resize-none text-sm"
                  />
                )}
              </form.AppField>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <form.SubmitButton>Refund {formatCurrency(parsedAmount, currency)}</form.SubmitButton>
            </div>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
