import { useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { DisputeRespondMode } from "@/features/dashboard/pa-transactions/components/DisputeRespondForm";
import type { SubmittedDocument } from "@/features/dashboard/pa-transactions/components/DisputeStatusNoticeCard";
import { formatNow } from "@/features/dashboard/pa-transactions/formatNow";
import { withDisputeStatus } from "@/features/dashboard/pa-transactions/withDisputeStatus";
import { useDisputeResolutions } from "@/stores/useDisputeResolutions";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

interface UseDisputeResolutionFlowArgs {
  transaction: PaTransaction;
  disputeId: string;
  amount: number;
  currency: string;
  /** Called right after a full accept is confirmed (toast already shown,
   * transaction already updated) — e.g. navigate back to a list. Omit to
   * stay on the current page. */
  onAccepted?: () => void;
}

/** The Accept/Contest workflow itself — the part that actually mutates the
 * dispute (see useDisputeResolutions/withDisputeStatus), shared so it can
 * never behave differently depending on which page (the dispute's own, or
 * the parent transaction's) the merchant started it from. Both
 * DisputeDetailFeature and TransactionDetailFeature swap their entire page
 * body for DisputeRespondForm while `disputeScreen === "respond"`, and both
 * render the same DisputeAcceptChoice dialog — neither ever navigates to
 * the OTHER page just to run this flow. */
export function useDisputeResolutionFlow({
  transaction,
  disputeId,
  amount,
  currency,
  onAccepted,
}: UseDisputeResolutionFlowArgs) {
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);
  const resolveDispute = useDisputeResolutions((s) => s.resolveDispute);

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [disputeScreen, setDisputeScreen] = useState<"detail" | "respond">("detail");
  const [respondMode, setRespondMode] = useState<DisputeRespondMode>("contest");
  const [submittedDocuments, setSubmittedDocuments] = useState<SubmittedDocument[]>([]);

  function backToDetail() {
    setDisputeScreen("detail");
  }

  function handleAcceptDispute() {
    setAcceptDialogOpen(true);
  }

  function handleContestDispute() {
    setRespondMode("contest");
    setDisputeScreen("respond");
  }

  function handleAcceptPartially() {
    setRespondMode("partial");
    setDisputeScreen("respond");
  }

  function handleConfirmAcceptFull() {
    resolveDispute(transaction.gid ?? "", "ACCEPTED");
    setStoredTransaction(
      withDisputeStatus(transaction, disputeId, "ACCEPTED", undefined, formatNow(new Date()))
    );
    toast.success("Dispute accepted", {
      description: `${formatCurrency(amount, currency)} ${currency} has been refunded to the cardholder.`,
    });
    onAccepted?.();
  }

  function handleRespondSubmit(documents: SubmittedDocument[]) {
    resolveDispute(transaction.gid ?? "", "UNDER_REVIEW");
    setStoredTransaction(
      withDisputeStatus(
        transaction,
        disputeId,
        "UNDER_REVIEW",
        documents.map((d) => d.name)
      )
    );
    setSubmittedDocuments(documents);
    toast.success("Documents uploaded", {
      description: "Your dispute is now under review.",
    });
    setDisputeScreen("detail");
  }

  return {
    acceptDialogOpen,
    setAcceptDialogOpen,
    disputeScreen,
    respondMode,
    submittedDocuments,
    backToDetail,
    handleAcceptDispute,
    handleContestDispute,
    handleAcceptPartially,
    handleConfirmAcceptFull,
    handleRespondSubmit,
  };
}
