import { formatCurrency } from "@/lib/utils";
import type { TransactionStatusBucket } from "@/features/dashboard/pa-transactions/columns";

const SIGN_BY_BUCKET: Record<TransactionStatusBucket, string> = {
  success: "+",
  failed: "−",
  refunded: "",
  pending: "",
};

interface TransactionAmountProps {
  amount: number;
  currency: string;
  bucket: TransactionStatusBucket;
}

// Amount is always plain dark grey regardless of status, the sign prefix
// above already carries the success/failed/refunded distinction, no need
// for green/red/orange as well.
export function TransactionAmount({ amount, currency, bucket }: TransactionAmountProps) {
  return (
    <div className="flex items-baseline gap-1.5 whitespace-nowrap justify-end">
      <span className="font-semibold tabular-nums text-[13px] text-foreground">
        {SIGN_BY_BUCKET[bucket]}
        {formatCurrency(amount, currency)}
      </span>
      <span className="text-[11px] text-muted-foreground font-medium">{currency}</span>
    </div>
  );
}
