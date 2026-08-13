"use client";

import { useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";

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
  onSubmit: (input: RefundSubmission) => void;
}

/**
 * Unlike a typical PSP refund flow, issuing a refund here does not change the
 * original transaction's own status, it creates a brand new "Refund"
 * transaction for the entered amount and links the two together (see
 * useIssuedRefunds + Linked Transactions). The copy below calls that out
 * explicitly since it's the one place merchants would otherwise expect
 * Stripe-style in-place status behavior.
 */
export function IssueRefundDialog({
  open,
  onOpenChange,
  currency,
  refundableAmount,
  onSubmit,
}: IssueRefundDialogProps) {
  const [amountInput, setAmountInput] = useState(() => String(refundableAmount));
  const [reason, setReason] = useState(REFUND_REASONS[0]!.value);
  const [details, setDetails] = useState("");
  const amountInputRef = useRef<HTMLInputElement>(null);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Resync the draft every time the dialog opens, not via an effect, see
      // CLAUDE.md's hooks purity rules.
      setAmountInput(String(refundableAmount));
      setReason(REFUND_REASONS[0]!.value);
      setDetails("");
    }
    onOpenChange(next);
  }

  const parsedAmount = Math.min(Math.max(parseFloat(amountInput) || 0, 0), refundableAmount);

  function handleSubmit() {
    if (parsedAmount <= 0) return;
    onSubmit({ amount: parsedAmount, reason, details });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-sm p-0"
        onOpenAutoFocus={(e) => {
          // Radix focuses the first focusable descendant by default, which
          // would otherwise be the info icon button, opening its tooltip the
          // instant the dialog appears. Redirect focus to the amount input.
          e.preventDefault();
          amountInputRef.current?.focus();
        }}
      >
        {/* DialogContent's own default classes don't make it a flex
         * container, so a `gap-*` className on it has no effect, layout is
         * fully owned by this inner wrapper instead, which also lets the
         * header row sit inline with the library's absolutely-positioned
         * (top-3 right-3) close button rather than below the default pt-10
         * reserved for it. */}
        <div className="flex flex-col gap-5 p-6">
          <div className="flex items-center gap-1.5 pr-10">
            <DialogTitle className="pr-0">Refund payment</DialogTitle>
            <TooltipProvider delayDuration={200}>
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
                  Refunds can take 5 to 10 days to appear on the customer&apos;s statement. This creates a new, linked
                  &quot;Refund&quot; transaction for the amount below, the original transaction&apos;s status
                  won&apos;t change.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Field className="gap-2">
            <FieldLabel htmlFor="refund-amount">Refund amount</FieldLabel>
            <div className="flex items-center gap-2">
              <Input
                ref={amountInputRef}
                id="refund-amount"
                type="number"
                inputMode="decimal"
                min={0}
                max={refundableAmount}
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">{currency}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Up to {formatCurrency(refundableAmount, currency)} refundable.
            </p>
          </Field>

          <Field className="gap-2">
            <FieldLabel htmlFor="refund-reason">Reason</FieldLabel>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="refund-reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field className="gap-2">
            <FieldLabel htmlFor="refund-details">Additional details (optional)</FieldLabel>
            <Textarea
              id="refund-details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add more details about this refund"
              rows={3}
              className="resize-none text-sm"
            />
          </Field>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleSubmit} disabled={parsedAmount <= 0}>
              Refund {formatCurrency(parsedAmount, currency)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
