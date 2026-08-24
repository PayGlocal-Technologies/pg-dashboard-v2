import { formatNow } from "@/features/dashboard/transactions/formatNow";
import type { DisputeEventStatus } from "@/features/dashboard/transactions/financial/types";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

/** Updates one specific dispute (by id) on the transaction in place, used
 * when a merchant accepts a dispute in full or submits evidence. Never
 * touches the dispute's own amount, only its lifecycle status/resolvedOn/
 * documents, see DisputeDetailFeature's accept/contest handlers. */
export function withDisputeStatus(
  transaction: PaTransaction,
  disputeId: string,
  status: DisputeEventStatus,
  documents?: string[],
  resolvedOn?: string
): PaTransaction {
  const disputes = transaction.disputes ?? [];
  const index = disputes.findIndex((d) => d.id === disputeId);
  if (index === -1) return transaction;
  const target = disputes[index]!;
  const updated = {
    ...target,
    status,
    resolvedOn:
      status === "WON" || status === "LOST" ? (resolvedOn ?? target.resolvedOn) : target.resolvedOn,
    documents: documents ?? target.documents,
    // The real moment evidence was submitted, so the timeline's own
    // "Evidence submitted" entry doesn't fall back to the dispute's
    // raisedOn date, see generateTimelineEvents.
    evidenceSubmittedOn: documents ? formatNow(new Date()) : target.evidenceSubmittedOn,
    // A fresh submission (first-time, or re-uploading after
    // INSUFFICIENT_DOCUMENTS) always restarts PayGlocal's own review from
    // the beginning, never resumes at whatever phase the dispute was in
    // before, see DisputeEvent.reviewPhase.
    reviewPhase: status === "UNDER_REVIEW" ? undefined : target.reviewPhase,
  };
  const nextDisputes = [...disputes];
  nextDisputes[index] = updated;
  return { ...transaction, disputes: nextDisputes };
}
