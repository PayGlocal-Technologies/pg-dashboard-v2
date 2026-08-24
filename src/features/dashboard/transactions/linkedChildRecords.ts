import type { DisputeEvent, RefundEvent } from "@/features/dashboard/transactions/financial/types";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

// A refund/dispute is a child financial event of its parent transaction, it
// never gets its own merchant-facing transaction ID (see PaTransaction's own
// doc comment on refunds/disputes/linkedRecordType). These functions build
// PRESENTATION-ONLY pseudo-rows so a child event can still be shown as its
// own row wherever the existing UI already expects a PaTransaction shape
// (the Transactions table, LinkedTransactionsSection's DataTable), without
// persisting a second transaction anywhere or inventing a new UI component.
// Every pseudo-row keeps `gid` equal to the PARENT's own gid and carries
// `linkedRecordType`/`linkedRecordId` so navigation can route to the right
// child detail view instead of treating it as an ordinary transaction, see
// PaTransactionTable's onViewDetails and TransactionDetailFeature's
// goToDetail.

/** Maps a refund's own event status to an existing PA_STATUS_META key, so
 * a refund's badge reuses the exact same label/variant/color the rest of
 * the app already uses for these concepts, rather than a second status
 * vocabulary just for refunds. */
export function refundStatusToExternalStatus(status: RefundEvent["status"]): string {
  switch (status) {
    case "SUCCEEDED":
      return "REFUNDED";
    case "FAILED":
      return "REFUND_FAILED";
    case "PENDING":
    default:
      return "SENT_FOR_REFUND";
  }
}

export function buildRefundLinkedRow(refund: RefundEvent, parent: PaTransaction): PaTransaction {
  return {
    ...parent,
    gid: parent.gid,
    externalStatus: refundStatusToExternalStatus(refund.status),
    totalAmount: String(refund.amount),
    txnCurrency: refund.currency,
    formattedCreationDateTime: refund.createdAt,
    message: refund.details,
    // A refund has no dispute/settlement/further-refund history of its own,
    // clearing these avoids a refund pseudo-row accidentally inheriting the
    // PARENT's own derived status when reused through getDisplayStatus.
    refunds: undefined,
    disputes: undefined,
    settlements: undefined,
    linkedRecordType: "refund",
    linkedRecordId: refund.id,
  };
}

export function buildDisputeLinkedRow(dispute: DisputeEvent, parent: PaTransaction): PaTransaction {
  return {
    ...parent,
    gid: parent.gid,
    externalStatus: dispute.status,
    totalAmount: String(dispute.amount),
    txnCurrency: dispute.currency,
    formattedCreationDateTime: dispute.raisedOn,
    refunds: undefined,
    disputes: undefined,
    settlements: undefined,
    linkedRecordType: "dispute",
    linkedRecordId: dispute.id,
  };
}

/** Every refund/dispute child on `parent`, as display rows, refunds first
 * then disputes (matches the order used throughout the spec's own
 * examples), for the parent's own "Linked Transactions" section. Takes the
 * refund/dispute arrays explicitly (rather than reading parent.refunds/
 * parent.disputes directly) so a caller can pass the fully-resolved set,
 * e.g. deriveTransactionDetail's merged mock-seeded + session-issued
 * refunds, not just what's persisted on the raw row. */
export function buildLinkedChildRows(
  parent: PaTransaction,
  refunds: RefundEvent[],
  disputes: DisputeEvent[]
): PaTransaction[] {
  return [
    ...refunds.map((r) => buildRefundLinkedRow(r, parent)),
    ...disputes.map((d) => buildDisputeLinkedRow(d, parent)),
  ];
}

/** Every refund child across a whole list of transactions, flattened into
 * its own rows, e.g. for the Transactions table's "Refunded" segment (see
 * Section 9/24 of the parent-child model spec: selecting that filter must
 * show the actual refund records, each with its own amount/status, not
 * parent rows filtered by aggregate bucket). */
export function flattenRefundRows(transactions: PaTransaction[]): PaTransaction[] {
  return transactions.flatMap((txn) =>
    (txn.refunds ?? []).map((r) => buildRefundLinkedRow(r, txn))
  );
}

/** Same idea as flattenRefundRows, for the "Disputed" segment. */
export function flattenDisputeRows(transactions: PaTransaction[]): PaTransaction[] {
  return transactions.flatMap((txn) =>
    (txn.disputes ?? []).map((d) => buildDisputeLinkedRow(d, txn))
  );
}

/** A plain (non-pseudo) row representing the parent itself, shown in a
 * child's own Linked Transactions section so the merchant can navigate back
 * up to the original payment, see Section 10/13 of the parent-child model
 * spec. Deliberately strips linkedRecordType/linkedRecordId (this row IS
 * the parent, not a child pointing at it), so it always resolves back to
 * the parent's own detail page. */
export function buildParentLinkedRow(parent: PaTransaction): PaTransaction {
  return { ...parent, linkedRecordType: undefined, linkedRecordId: undefined };
}

/** A refund detail page's own Linked Transactions: the parent, plus any
 * sibling dispute(s) on that SAME parent (Section 17 of the parent-child
 * model spec), never sibling refunds, never unrelated transactions. The
 * relationship is always `dispute.transactionId === parent.gid`, enforced
 * simply by reading parent.disputes directly rather than searching anything
 * customer/email/payment-method-based. */
export function getRefundDetailLinkedRows(parent: PaTransaction): PaTransaction[] {
  return [
    buildParentLinkedRow(parent),
    ...(parent.disputes ?? []).map((d) => buildDisputeLinkedRow(d, parent)),
  ];
}

/** A dispute detail page's own Linked Transactions: the parent, plus any
 * sibling refund(s) on that SAME parent (Section 14/17 of the parent-child
 * model spec: "parent transaction + refund transaction should be present in
 * the linked transaction, only for such use cases"), never sibling
 * disputes, never unrelated transactions. */
export function getDisputeDetailLinkedRows(parent: PaTransaction): PaTransaction[] {
  return [
    buildParentLinkedRow(parent),
    ...(parent.refunds ?? []).map((r) => buildRefundLinkedRow(r, parent)),
  ];
}
