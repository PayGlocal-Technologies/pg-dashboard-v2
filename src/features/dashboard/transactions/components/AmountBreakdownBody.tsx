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
      <span className={cn("text-sm", emphasis ? "font-semibold text-foreground" : "text-muted-foreground")}>
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
}

/** Shared by TransactionDetailsDrawer and TransactionDetailFeature, same
 * label/value rhythm as Settlement Details' own Amount Breakdown card. */
export function AmountBreakdownBody({ amountReceived, fee, netAmount, currency }: AmountBreakdownBodyProps) {
  return (
    <div className="flex flex-col gap-3">
      <BreakupRow label="Amount Received" value={formatCurrency(amountReceived, currency)} />
      <BreakupRow label="Fee" value={formatCurrency(fee, currency)} negative />
      <div className="border-t border-border pt-3">
        <BreakupRow label="Net Amount" value={formatCurrency(netAmount, currency)} emphasis />
      </div>
    </div>
  );
}
