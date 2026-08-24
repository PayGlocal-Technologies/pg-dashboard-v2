import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import {
  DetailRow,
  SectionLabel,
} from "@/features/dashboard/transactions/components/TransactionDetailPrimitives";
import { TransactionPaymentMethod } from "@/features/dashboard/transactions/components/TransactionPaymentMethod";
import { formatDisplayDateTime } from "@/features/dashboard/transactions/paColumns";
import type { DisputeDetail } from "@/features/dashboard/transactions/deriveTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

interface DisputeDetailsCardProps {
  dispute: DisputeDetail;
  transaction: PaTransaction;
  currency: string;
}

/** Right-column card for a disputed transaction: Dispute ID, disputed
 * amount, raised-on/respond-by dates and payment method, see
 * TransactionDetailFeature. Reason/Reason Code are now surfaced prominently
 * in the main DisputeActionCard instead of only living here, so this panel
 * no longer repeats them. */
export function DisputeDetailsCard({ dispute, transaction, currency }: DisputeDetailsCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>Dispute Details</SectionLabel>
      <Card className="gap-0 p-5">
        <div className="flex flex-col gap-5">
          <DetailRow label="Dispute ID" value={dispute.disputeId} />
          <DetailRow
            label="Disputed Amount"
            value={`${formatCurrency(dispute.amount, currency)} ${currency}`}
          />
          <DetailRow
            label="Raised On"
            value={formatDisplayDateTime(dispute.raisedOn) ?? dispute.raisedOn}
          />
          <DetailRow
            label="Response Due By"
            value={formatDisplayDateTime(dispute.respondBy) ?? dispute.respondBy}
          />
          <DetailRow
            label="Payment Method"
            value={<TransactionPaymentMethod row={transaction} />}
          />
        </div>
      </Card>
    </div>
  );
}
