import { formatCurrency } from "@/lib/utils";

interface TransactionAmountProps {
  amount: number;
  currency: string;
}

// No +/- sign, the Status column already carries the success/failed/refunded
// distinction, and every column in this table uses the same weight/color
// (font-medium text-foreground) so nothing reads as more or less important
// than anything else.
export function TransactionAmount({ amount, currency }: TransactionAmountProps) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap justify-start">
      <span className="font-medium tabular-nums text-[12px] text-foreground">{formatCurrency(amount, currency)}</span>
      <span className="text-[10px] text-muted-foreground font-medium">{currency}</span>
    </div>
  );
}
