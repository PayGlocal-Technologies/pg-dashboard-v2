import { cn, formatCurrency } from "@/lib/utils";

interface BreakupRowProps {
  label: string;
  value: string;
  negative?: boolean;
  emphasis?: boolean;
}

function BreakupRow({ label, value, negative, emphasis }: BreakupRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={cn(
          "text-sm",
          emphasis ? "font-semibold text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums text-sm",
          emphasis ? "font-semibold text-foreground" : "font-medium text-foreground/85"
        )}
      >
        {negative ? "-" : ""}
        {value}
      </span>
    </div>
  );
}

interface AmountBreakdownBodyProps {
  amountReceived: number;
  fee: number;
  netAmount: number;
  currency: string;
  /** Sum of SUCCEEDED refunds only (see getRefundedAmount), the same value
   * the header status/timeline are derived from, only rendered when > 0. */
  refundedAmount?: number;
  /** Sum of every dispute ever raised (see getDisputedAmount), shown as its
   * own dimension, never subtracted into netAmount, only rendered when > 0. */
  disputedAmount?: number;
}

/** Shared by TransactionDetailsDrawer and TransactionDetailFeature, same
 * label/value rhythm as Settlement Details' own Amount Breakdown card.
 * Refunded/Disputed rows only appear when relevant, netAmount already has
 * refundedAmount baked in (see getNetAmount), disputedAmount is informational
 * only, a dispute is never netted against the payment here. */
export function AmountBreakdownBody({
  amountReceived,
  fee,
  netAmount,
  currency,
  refundedAmount,
  disputedAmount,
}: AmountBreakdownBodyProps) {
  return (
    <div className="flex flex-col gap-3">
      <BreakupRow label="Amount Received" value={formatCurrency(amountReceived, currency)} />
      <BreakupRow label="Fee" value={formatCurrency(fee, currency)} negative />
      {!!refundedAmount && (
        <BreakupRow label="Refunded" value={formatCurrency(refundedAmount, currency)} negative />
      )}
      {!!disputedAmount && (
        <BreakupRow label="Disputed" value={formatCurrency(disputedAmount, currency)} />
      )}
      <div className="border-t border-border pt-3">
        <BreakupRow label="Net Amount" value={formatCurrency(netAmount, currency)} emphasis />
      </div>
    </div>
  );
}
