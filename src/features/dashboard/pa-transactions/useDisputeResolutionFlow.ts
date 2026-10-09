import { useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import type { DisputeRespondMode } from "@/features/dashboard/pa-transactions/components/DisputeRespondForm";
import type { SubmittedDocument } from "@/features/dashboard/pa-transactions/components/DisputeStatusNoticeCard";
import { formatNow } from "@/features/dashboard/pa-transactions/formatNow";
import { withDisputeStatus } from "@/features/dashboard/pa-transactions/withDisputeStatus";
import { useDisputeResolutions } from "@/stores/useDisputeResolutions";
import type { DisputeConfirmKind } from "@/features/dashboard/pa-transactions/components/DisputeConfirmDialog";
import { stageOf, WITHDRAWAL_FEE } from "@/features/dashboard/pa-transactions/status/disputeStages";
import type { DisputeEvent } from "@/features/dashboard/pa-transactions/financial/types";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";

interface UseDisputeResolutionFlowArgs {
  transaction: PaTransaction;
  disputeId: string;
  amount: number;
  currency: string;
  /** The dispute being acted on: its stage decides the flow (see
   *  status/disputeStages.ts). */
  dispute?: DisputeEvent;
  /** Called right after a full accept is confirmed (toast already shown,
   * transaction already updated) — e.g. navigate back to a list. Omit to
   * stay on the current page. */
  onAccepted?: () => void;
  /** Called whenever the evidence form opens (contest, or the contested
   *  part of a partial accept). The Dispute Management drawer uses it to
   *  expand into the full page, where the form has room. */
  onOpenForm?: () => void;
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
  dispute,
  onAccepted,
  onOpenForm,
}: UseDisputeResolutionFlowArgs) {
  const stage = dispute ? stageOf(dispute) : "CHARGEBACK";
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);
  const resolveDispute = useDisputeResolutions((s) => s.resolveDispute);

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [disputeScreen, setDisputeScreen] = useState<"detail" | "respond">("detail");
  const [respondMode, setRespondMode] = useState<DisputeRespondMode>("contest");
  const [submittedDocuments, setSubmittedDocuments] = useState<SubmittedDocument[]>([]);
  // The escalation confirmations (contest at pre-arbitration / arbitration,
  // withdraw at arbitration).
  const [confirmKind, setConfirmKind] = useState<DisputeConfirmKind | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function askToConfirm(kind: DisputeConfirmKind) {
    setConfirmKind(kind);
    setConfirmOpen(true);
  }

  function backToDetail() {
    setDisputeScreen("detail");
  }

  function handleAcceptDispute() {
    setAcceptDialogOpen(true);
  }

  /** Contest: straight to the evidence form in the first round; through a
   *  confirmation at pre-arbitration (evidence by the deadline) and at
   *  arbitration (final stage, fee if lost). */
  function handleContestDispute() {
    if (stage === "PRE_ARBITRATION") return askToConfirm("contest-prearb");
    if (stage === "ARBITRATION") return askToConfirm("contest-arb");
    openContestForm();
  }

  function openContestForm() {
    setRespondMode("contest");
    setDisputeScreen("respond");
    onOpenForm?.();
  }

  /** Arbitration only. */
  function handleWithdrawDispute() {
    askToConfirm("withdraw");
  }

  function handleConfirmed() {
    if (confirmKind === "contest-prearb") return openContestForm();
    if (confirmKind === "contest-arb") return contestAtArbitration();
    if (confirmKind === "withdraw") return withdrawAtArbitration();
  }

  /** Arbitration: no new documents. The case goes back to PayGlocal to
   *  prepare the representation from the evidence already submitted, then
   *  to the bank for a final decision. */
  function contestAtArbitration() {
    resolveDispute(transaction.gid ?? "", "UNDER_REVIEW");
    setStoredTransaction(withDisputeStatus(transaction, disputeId, "UNDER_REVIEW"));
    toast.success("Proceeding to arbitration", {
      description: "We're preparing your case for the bank's final decision.",
    });
  }

  /** Arbitration: closes the case for the customer, with the withdrawal fee
   *  when one applies. */
  function withdrawAtArbitration() {
    const fee = dispute?.withdrawalFeeApplies
      ? { kind: "WITHDRAWAL" as const, ...WITHDRAWAL_FEE }
      : undefined;
    resolveDispute(transaction.gid ?? "", "ACCEPTED");
    setStoredTransaction(
      withDisputeStatus(transaction, disputeId, "ACCEPTED", undefined, formatNow(new Date()), {
        withdrawn: true,
        appliedFee: fee,
      })
    );
    toast.success("Dispute withdrawn", {
      description: `${formatCurrency(amount, currency)} ${currency} will be returned to the customer.`,
    });
  }

  function handleAcceptPartially() {
    setRespondMode("partial");
    setDisputeScreen("respond");
    onOpenForm?.();
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

  /** `contestAmount` is set on a partial accept: the rest of the disputed
   *  amount is accepted and returned to the customer. */
  function handleRespondSubmit(documents: SubmittedDocument[], contestAmount?: number) {
    const acceptedAmount =
      respondMode === "partial" && contestAmount !== undefined && contestAmount < amount
        ? Math.round((amount - contestAmount) * 100) / 100
        : undefined;
    resolveDispute(transaction.gid ?? "", "UNDER_REVIEW");
    setStoredTransaction(
      withDisputeStatus(
        transaction,
        disputeId,
        "UNDER_REVIEW",
        documents.map((d) => d.name),
        undefined,
        acceptedAmount !== undefined ? { acceptedAmount } : {}
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
    handleWithdrawDispute,
    confirmKind,
    confirmOpen,
    setConfirmOpen,
    handleConfirmed,
  };
}
