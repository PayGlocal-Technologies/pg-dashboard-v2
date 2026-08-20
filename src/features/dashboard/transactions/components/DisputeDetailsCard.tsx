import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { DetailRow, SectionLabel } from "@/features/dashboard/transactions/components/TransactionDetailPrimitives";
import { TransactionPaymentMethod } from "@/features/dashboard/transactions/components/TransactionPaymentMethod";
import type { DisputeDetail } from "@/features/dashboard/transactions/deriveTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

interface DisputeDetailsCardProps {
  dispute: DisputeDetail;
  transaction: PaTransaction;
  currency: string;
}

/** Right-column card for a disputed transaction, Dispute ID, disputed
 * amount, reason, raised-on/respond-by dates, payment method and the
 * card-network reason code, see TransactionDetailFeature. */
export function DisputeDetailsCard({ dispute, transaction, currency }: DisputeDetailsCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>Dispute Details</SectionLabel>
      <Card className="gap-0 p-5">
        <div className="flex flex-col gap-5">
          <DetailRow label="Dispute ID" value={dispute.disputeId} />
          <DetailRow label="Disputed Amount" value={`${formatCurrency(dispute.amount, currency)} ${currency}`} />
          <DetailRow label="Reason" value={dispute.reason} />
          <DetailRow label="Raised On" value={dispute.raisedOn} />
          <DetailRow label="Response Due By" value={dispute.respondBy} />
          <DetailRow label="Payment Method" value={<TransactionPaymentMethod row={transaction} />} />
          <DetailRow label="Reason Code" value={dispute.reasonCode} />
        </div>
      </Card>
    </div>
  );
}
