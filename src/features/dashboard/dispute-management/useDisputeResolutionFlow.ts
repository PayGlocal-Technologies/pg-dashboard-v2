import { useState } from "react";
import { toast } from "sonner";
import { usePost, usePut } from "@/lib/api/hooks";
import {
  cbAcceptApi,
  cbContestApi,
  cbFulfillmentApi,
  cbSubmitEvidenceApi,
} from "@/features/dashboard/dispute-management/services";
import {
  actionAmount,
  apiErrorMessage,
  withdrawAmount,
} from "@/features/dashboard/dispute-management/helpers";
import type { DisputeConfirmKind } from "@/features/dashboard/dispute-management/components/detail/DisputeConfirmDialog";
import type { DisputeCase } from "@/features/dashboard/dispute-management/types";

/** The evidence form's purpose: the contested part of a partial accept, or contesting. */
export type DisputeRespondMode = "partial" | "contest";

export type FulfilmentData = {
  fulfillmentId: string;
  trackingCompany: string;
  trackingNumber: string;
};

/** What the shipment step was opened for, run once it is submitted. */
type PendingAction = "accept" | "contest" | "contest-arb";

/**
 * The response the evidence form sends before the evidence itself: contest,
 * or a partial accept with the amount returned to the customer. Null when the
 * case is already contested (Upload documents / Insufficient documents).
 */
type PendingResponse = { kind: "contest" } | { kind: "partial"; acceptedAmount: string };

/**
 * The dispute's Accept / Contest / Withdraw workflow against the API.
 *
 * - Shipment data first, when the case asks for it
 *   (`fulfillmentDataRequired`): POST `/v2/cb/{mid}/fulfillment/{cbId}`.
 *   pg-dashboard asks again every time the drawer opens, so this does too.
 * - Accept in full: PUT `/v2/cb/{mid}/{cbId}/accept` with `{ cbAmount }`.
 * - Contest and Accept partially (first round and pre-arbitration): the
 *   documents come first. The merchant confirms (and, for a partial accept,
 *   enters the amount returned to the customer), uploads the evidence, and
 *   only Submit calls the backend: PUT `.../contest` (or `.../accept` with the
 *   accepted amount), then POST `/v2/cb/{cbId}/doc/submit-evidence` with `{}`.
 *   pg-dashboard calls contest/accept before any upload; this order is v2's
 *   own, by decision.
 * - A case already contested (Upload documents / Insufficient documents)
 *   only submits the evidence.
 * - Continue contesting at arbitration: the contest PUT, no documents.
 * - Withdraw at arbitration: the accept PUT (CbWithdrawDrawer).
 *
 * Every write refreshes every query on success (the hooks' default, as
 * pg-dashboard's useGlFetch does), so the case, timeline and list follow.
 */
export function useDisputeResolutionFlow({
  dispute,
  onOpenForm,
}: {
  dispute: DisputeCase | null;
  /** Called whenever the evidence form opens; the drawer expands to the page for it. */
  onOpenForm?: () => void;
}) {
  const mid = dispute?.merchantId ?? "";
  const cbId = dispute?.cbId ?? "";
  const stage = dispute?.screenStage ?? "CHARGEBACK";

  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [disputeScreen, setDisputeScreen] = useState<"detail" | "respond">("detail");
  const [respondMode, setRespondMode] = useState<DisputeRespondMode>("contest");
  const [confirmKind, setConfirmKind] = useState<DisputeConfirmKind | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [pendingResponse, setPendingResponse] = useState<PendingResponse | null>(null);
  // The response already went through on an earlier Submit whose evidence
  // call then failed: a retry sends only the evidence.
  const [responseSent, setResponseSent] = useState(false);

  const accept = usePut<unknown, { cbAmount: string }>(cbAcceptApi(mid, cbId));
  const contest = usePut<unknown, { cbAmount: string }>(cbContestApi(mid, cbId));
  const fulfil = usePost<unknown, Partial<FulfilmentData>>(cbFulfillmentApi(mid, cbId), {
    invalidateQueries: false,
  });
  const submitEvidence = usePost<unknown, Record<string, never>>(cbSubmitEvidenceApi(cbId));

  function openForm(mode: DisputeRespondMode, response: PendingResponse | null) {
    setRespondMode(mode);
    setPendingResponse(response);
    setResponseSent(false);
    setDisputeScreen("respond");
    onOpenForm?.();
  }

  function askToConfirm(kind: DisputeConfirmKind) {
    setConfirmKind(kind);
    setConfirmOpen(true);
  }

  /** Runs `action`, behind the shipment step when the case needs it. */
  function withFulfilment(action: PendingAction, run: () => void) {
    if (dispute?.fulfillmentRequired) {
      setPendingAction(action);
      return;
    }
    run();
  }

  function handleAcceptDispute() {
    withFulfilment("accept", () => setAcceptDialogOpen(true));
  }

  /** Contest: through a confirmation at every stage; then the form, or (arbitration) the API. */
  function handleContestDispute() {
    if (stage === "ARBITRATION") {
      withFulfilment("contest-arb", () => askToConfirm("contest-arb"));
      return;
    }
    withFulfilment("contest", () => askToConfirm("contest"));
  }

  /** Upload documents / Insufficient documents: the case is already contested, straight to the form. */
  function handleUploadEvidence() {
    openForm("contest", null);
  }

  /** Arbitration only. */
  function handleWithdrawDispute() {
    askToConfirm("withdraw");
  }

  function handleConfirmed() {
    if (!dispute) return;
    if (confirmKind === "withdraw") {
      accept.mutate(
        { cbAmount: withdrawAmount(dispute) },
        {
          onSuccess: () => toast.success("Dispute withdrawn successfully"),
          onError: (e) => toast.error(apiErrorMessage(e, "Failed to withdraw dispute")),
        }
      );
      return;
    }
    if (confirmKind === "contest") {
      // Documents first: the contest itself is sent with the evidence.
      openForm("contest", { kind: "contest" });
      return;
    }
    // Arbitration takes no documents: contest now.
    contest.mutate(
      { cbAmount: actionAmount(dispute) },
      {
        onSuccess: () => toast.success("Dispute contested successfully"),
        onError: (e) => toast.error(apiErrorMessage(e, "Failed to contest dispute")),
      }
    );
  }

  function handleConfirmAcceptFull() {
    if (!dispute) return;
    accept.mutate(
      { cbAmount: actionAmount(dispute) },
      {
        onSuccess: () => toast.success("Dispute accepted successfully"),
        onError: (e) => toast.error(apiErrorMessage(e, "Failed to accept dispute")),
      }
    );
  }

  /**
   * The partial accept, from the accept dialog: `acceptedAmount` goes back to
   * the customer. Documents first; the accept is sent with the evidence.
   */
  function handleAcceptPartially(acceptedAmount: string) {
    setAcceptDialogOpen(false);
    openForm("partial", { kind: "partial", acceptedAmount });
  }

  function submitFulfilment(data: FulfilmentData) {
    // Untouched fields are left out, as an untouched antd field is.
    const body = Object.fromEntries(
      Object.entries(data).filter(([, value]) => value.trim() !== "")
    ) as Partial<FulfilmentData>;
    fulfil.mutate(body, {
      onSuccess: () => {
        toast.success("Dispute Fulfillment Data updated successfully");
        const next = pendingAction;
        setPendingAction(null);
        if (next === "accept") setAcceptDialogOpen(true);
        else if (next === "contest") askToConfirm("contest");
        else if (next === "contest-arb") askToConfirm("contest-arb");
      },
      onError: (e) => toast.error(apiErrorMessage(e, "Failed to update dispute fulfillment data")),
    });
  }

  /** Submit: the pending contest or partial accept (once), then the evidence. */
  async function handleSubmitEvidence() {
    if (!dispute) return;
    if (pendingResponse && !responseSent) {
      try {
        if (pendingResponse.kind === "contest") {
          await contest.mutateAsync({ cbAmount: actionAmount(dispute) });
          toast.success("Dispute contested successfully");
        } else {
          await accept.mutateAsync({ cbAmount: pendingResponse.acceptedAmount });
          toast.success("Dispute partially accepted successfully");
        }
        setResponseSent(true);
      } catch (e) {
        toast.error(
          apiErrorMessage(
            e,
            pendingResponse.kind === "contest" ? "Failed to contest dispute" : "Failed to accept dispute"
          )
        );
        return;
      }
    }
    try {
      await submitEvidence.mutateAsync({});
      toast.success("Evidence submitted successfully.");
      setPendingResponse(null);
      setResponseSent(false);
      setDisputeScreen("detail");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Failed to submit evidence"));
    }
  }

  return {
    acceptDialogOpen,
    setAcceptDialogOpen,
    disputeScreen,
    respondMode,
    // Leaving the form drops an unsent response; its uploads stay on the case.
    backToDetail: () => {
      setDisputeScreen("detail");
      setPendingResponse(null);
      setResponseSent(false);
    },
    handleAcceptDispute,
    handleContestDispute,
    handleUploadEvidence,
    handleAcceptPartially,
    handleConfirmAcceptFull,
    handleWithdrawDispute,
    /** The partial amount waiting to be accepted on Submit, if any. */
    pendingAcceptedAmount:
      pendingResponse?.kind === "partial" && !responseSent ? pendingResponse.acceptedAmount : null,
    handleSubmitEvidence: () => void handleSubmitEvidence(),
    confirmKind,
    confirmOpen,
    setConfirmOpen,
    handleConfirmed,
    fulfilmentOpen: pendingAction !== null,
    closeFulfilment: () => setPendingAction(null),
    submitFulfilment,
    isAccepting: accept.isPending,
    isContesting: contest.isPending,
    isFulfilling: fulfil.isPending,
    isSubmittingEvidence: submitEvidence.isPending || contest.isPending || accept.isPending,
  };
}

export type DisputeFlow = ReturnType<typeof useDisputeResolutionFlow>;
