import { formatCurrency } from "@/lib/utils";
import { CopyableCell } from "@/components/common/CopyableCell";
import {
  DetailRow,
  DetailSection,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import { TransactionPaymentMethod } from "@/features/dashboard/pa-transactions/components/TransactionPaymentMethod";
import { truncateId } from "@/features/dashboard/pa-transactions/components/TransactionId";
import { formatDisplayDateTime } from "@/features/dashboard/pa-transactions/paColumns";
import type { DisputeDetail } from "@/features/dashboard/pa-transactions/deriveTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

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
    <DetailSection title="Dispute Details">
      <DetailRow
        label="Dispute ID"
        value={
          <span className="group">
            <CopyableCell
              value={truncateId(dispute.disputeId)}
              copyValue={dispute.disputeId}
              label="Dispute ID"
              monospace
              className="font-medium text-foreground"
            />
          </span>
        }
      />
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
      <DetailRow label="Payment Method" value={<TransactionPaymentMethod row={transaction} />} />
    </DetailSection>
  );
}
