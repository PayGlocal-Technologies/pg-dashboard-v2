import { describe, expect, it } from "vitest";
import { withDisputeStatus } from "@/features/dashboard/transactions/withDisputeStatus";
import type { DisputeEvent } from "@/features/dashboard/transactions/financial/types";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

const DISPUTE_1: DisputeEvent = {
  id: "d1",
  transactionId: "gl_o-test1",
  amount: 1000,
  currency: "INR",
  reason: "Fraudulent",
  reasonCode: "10.4",
  description: "desc",
  status: "NEEDS_RESPONSE",
  raisedOn: "02/08/2026, 09:00:00",
};

const DISPUTE_2: DisputeEvent = {
  id: "d2",
  transactionId: "gl_o-test1",
  amount: 500,
  currency: "INR",
  reason: "Duplicate processing",
  reasonCode: "12.6",
  description: "desc2",
  status: "NEEDS_RESPONSE",
  raisedOn: "03/08/2026, 09:00:00",
};

const TXN: PaTransaction = {
  gid: "gl_o-test1",
  externalStatus: "SUCCESS",
  txnCurrency: "INR",
  totalAmount: "10000.00",
  formattedCreationDateTime: "01/08/2026, 09:00:00",
  disputes: [DISPUTE_1, DISPUTE_2],
};

describe("withDisputeStatus", () => {
  it("updates only the dispute matching disputeId, leaving sibling disputes untouched", () => {
    const updated = withDisputeStatus(TXN, "d1", "CLEARED", undefined, "10/08/2026, 09:00:00");
    expect(updated.disputes![0]!.status).toBe("CLEARED");
    expect(updated.disputes![0]!.resolvedOn).toBe("10/08/2026, 09:00:00");
    expect(updated.disputes![1]!.status).toBe("NEEDS_RESPONSE");
  });

  it("updates the second dispute by id, not always disputes[0]", () => {
    const updated = withDisputeStatus(TXN, "d2", "CHARGED_BACK", undefined, "12/08/2026, 09:00:00");
    expect(updated.disputes![0]!.status).toBe("NEEDS_RESPONSE");
    expect(updated.disputes![1]!.status).toBe("CHARGED_BACK");
    expect(updated.disputes![1]!.resolvedOn).toBe("12/08/2026, 09:00:00");
  });

  it("does not set resolvedOn when moving to UNDER_REVIEW, only for resolved statuses", () => {
    const updated = withDisputeStatus(TXN, "d1", "UNDER_REVIEW", ["evidence.pdf"]);
    expect(updated.disputes![0]!.status).toBe("UNDER_REVIEW");
    expect(updated.disputes![0]!.resolvedOn).toBeUndefined();
    expect(updated.disputes![0]!.documents).toEqual(["evidence.pdf"]);
  });

  it("stamps evidenceSubmittedOn only when documents are provided", () => {
    const updated = withDisputeStatus(TXN, "d1", "UNDER_REVIEW", ["evidence.pdf"]);
    expect(updated.disputes![0]!.evidenceSubmittedOn).toBeDefined();

    const unchanged = withDisputeStatus(TXN, "d2", "CLEARED", undefined, "10/08/2026, 09:00:00");
    expect(unchanged.disputes![1]!.evidenceSubmittedOn).toBeUndefined();
  });

  it("returns the transaction unchanged when the disputeId does not match any dispute", () => {
    const result = withDisputeStatus(TXN, "does-not-exist", "CLEARED");
    expect(result).toBe(TXN);
  });

  it("does not mutate the original transaction or its disputes array", () => {
    const original = JSON.parse(JSON.stringify(TXN)) as PaTransaction;
    withDisputeStatus(TXN, "d1", "CLEARED", undefined, "10/08/2026, 09:00:00");
    expect(TXN).toEqual(original);
  });

  it("restarts PayGlocal's own review on a fresh submission, clearing any prior reviewPhase", () => {
    const alreadyAtBankReview: PaTransaction = {
      ...TXN,
      disputes: [{ ...DISPUTE_1, status: "MORE_EVIDENCE_NEEDED", reviewPhase: "BANK_REVIEW" }],
    };
    const updated = withDisputeStatus(alreadyAtBankReview, "d1", "UNDER_REVIEW", [
      "more-evidence.pdf",
    ]);
    expect(updated.disputes![0]!.status).toBe("UNDER_REVIEW");
    expect(updated.disputes![0]!.reviewPhase).toBeUndefined();
  });

  it("leaves reviewPhase untouched when the new status isn't UNDER_REVIEW", () => {
    const atBankReview: PaTransaction = {
      ...TXN,
      disputes: [{ ...DISPUTE_1, status: "UNDER_REVIEW", reviewPhase: "BANK_REVIEW" }],
    };
    const updated = withDisputeStatus(
      atBankReview,
      "d1",
      "CHARGED_BACK",
      undefined,
      "10/08/2026, 09:00:00"
    );
    expect(updated.disputes![0]!.reviewPhase).toBe("BANK_REVIEW");
  });
});
