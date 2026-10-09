import { formatCurrency } from "@/lib/utils";
import { formatTimestamp } from "@/lib/utils/format";
import { CopyableCell } from "@/components/common/CopyableCell";
import {
  DetailRow,
  DetailSection,
} from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import { TransactionPaymentMethod } from "@/features/dashboard/pa-transactions/components/TransactionPaymentMethod";
import { truncateId } from "@/features/dashboard/pa-transactions/components/TransactionId";
import { CLOSED_EXTERNAL_STATUSES } from "@/features/dashboard/dispute-management/constants";
import { paymentRow, respondBy } from "@/features/dashboard/dispute-management/helpers";
import type { DisputeCase } from "@/features/dashboard/dispute-management/types";

const DUE_TONE = {
  danger: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  muted: "text-foreground",
} as const;

/**
 * The dispute's own facts. "Respond by" turns into "Closed on" once the case
 * is closed, and shows no date while the bank is reviewing, as
 * pg-dashboard's getDueOrClosedColumn does; an open deadline is coloured by
 * how close it is (red at two days or less, amber at five).
 */
export function DisputeDetailsCard({ dispute, now }: { dispute: DisputeCase; now: number }) {
  const isClosed = CLOSED_EXTERNAL_STATUSES.includes(dispute.status);
  const due = respondBy(dispute.dueDate, now);

  return (
    <DetailSection title="Dispute Details">
      <DetailRow
        label="Dispute ID"
        value={
          <span className="group">
            <CopyableCell
              value={truncateId(dispute.cbId)}
              copyValue={dispute.cbId}
              label="Dispute ID"
              className="font-medium text-foreground"
            />
          </span>
        }
      />
      {dispute.caseId && <DetailRow label="Case ID" value={dispute.caseId} />}
      <DetailRow
        label="Disputed Amount"
        value={`${formatCurrency(dispute.amount, dispute.currency)} ${dispute.currency}`}
      />
      <DetailRow label="Raised On" value={formatTimestamp(dispute.raisedOn, "-")} />
      {isClosed ? (
        <DetailRow label="Closed On" value={formatTimestamp(dispute.closedOn, "-")} />
      ) : (
        <DetailRow
          label="Respond By"
          value={
            dispute.status === "BANK_REVIEW" ? (
              "-"
            ) : (
              <span className={DUE_TONE[due.tone]}>{formatTimestamp(dispute.dueDate, "-")}</span>
            )
          }
        />
      )}
      <DetailRow
        label="Payment Method"
        value={
          <TransactionPaymentMethod
            row={paymentRow(
              dispute.payment.method,
              dispute.payment.brand,
              dispute.payment.maskedCardNo
            )}
          />
        }
      />
    </DetailSection>
  );
}
