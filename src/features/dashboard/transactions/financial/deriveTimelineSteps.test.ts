import { describe, expect, it } from "vitest";
import { deriveTimelineSteps } from "@/features/dashboard/transactions/financial/generateTimeline";
import { deriveTransactionDetail } from "@/features/dashboard/transactions/deriveTransactionDetail";
import { getDisplayStatus } from "@/features/dashboard/transactions/paColumns";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

const BASE: PaTransaction = {
  gid: "gl_o-test1",
  externalStatus: "SUCCESS",
  txnCurrency: "INR",
  totalAmount: "10000.00",
  formattedCreationDateTime: "01/08/2026, 12:00:00",
};

function labelsFor(txn: PaTransaction): string[] {
  const detail = deriveTransactionDetail(txn);
  return deriveTimelineSteps(detail.financials).map((s) => s.label);
}

describe("deriveTimelineSteps: header and timeline stay in sync (the reported bug)", () => {
  it("normal: Payment captured -> Settled", () => {
    const txn: PaTransaction = {
      ...BASE,
      settlements: [
        {
          id: "s1",
          transactionId: BASE.gid!,
          amount: 10000,
          currency: "INR",
          status: "SETTLED",
          settledOnDate: "02/08/2026, 12:00:00",
        },
      ],
    };
    expect(labelsFor(txn)).toEqual(["Payment captured", "Settled"]);
    expect(getDisplayStatus(txn).label).toBe("Success");
  });

  it("partial refund: the timeline does not stop at Settled, per the reported bug", () => {
    const txn: PaTransaction = {
      ...BASE,
      settlements: [
        {
          id: "s1",
          transactionId: BASE.gid!,
          amount: 10000,
          currency: "INR",
          status: "SETTLED",
          settledOnDate: "02/08/2026, 12:00:00",
        },
      ],
      refunds: [
        {
          id: "r1",
          transactionId: BASE.gid!,
          amount: 2500,
          currency: "INR",
          status: "SUCCEEDED",
          createdAt: "03/08/2026, 15:00:00",
        },
      ],
    };
    expect(labelsFor(txn)).toEqual(["Payment captured", "Settled", "Partially refunded"]);
    expect(getDisplayStatus(txn).label).toBe("Partially refunded");
  });

  it("full refund: the final timeline event communicates the transaction is now fully refunded", () => {
    const txn: PaTransaction = {
      ...BASE,
      settlements: [
        { id: "s1", transactionId: BASE.gid!, amount: 10000, currency: "INR", status: "SETTLED" },
      ],
      refunds: [
        {
          id: "r1",
          transactionId: BASE.gid!,
          amount: 2500,
          currency: "INR",
          status: "SUCCEEDED",
          createdAt: "03/08/2026, 09:00:00",
        },
        {
          id: "r2",
          transactionId: BASE.gid!,
          amount: 7500,
          currency: "INR",
          status: "SUCCEEDED",
          createdAt: "05/08/2026, 09:00:00",
        },
      ],
    };
    expect(labelsFor(txn)).toEqual([
      "Payment captured",
      "Settled",
      "Partially refunded",
      "Refunded",
    ]);
    expect(getDisplayStatus(txn).label).toBe("Refunded");
  });

  it("dispute: Payment captured -> Settled -> Dispute raised -> Awaiting response", () => {
    const txn: PaTransaction = {
      ...BASE,
      settlements: [
        { id: "s1", transactionId: BASE.gid!, amount: 10000, currency: "INR", status: "SETTLED" },
      ],
      disputes: [
        {
          id: "d1",
          transactionId: BASE.gid!,
          amount: 2000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "DISPUTED",
          raisedOn: "04/08/2026, 09:00:00",
          respondBy: "20/08/2026, 09:00:00",
        },
      ],
    };
    expect(labelsFor(txn)).toEqual([
      "Payment captured",
      "Settled",
      "Dispute raised",
      "Awaiting your response",
    ]);
    expect(getDisplayStatus(txn).label).toBe("Action required");
  });

  it("refund then dispute: both appear, chronologically, header combines both", () => {
    const txn: PaTransaction = {
      ...BASE,
      settlements: [
        { id: "s1", transactionId: BASE.gid!, amount: 10000, currency: "INR", status: "SETTLED" },
      ],
      refunds: [
        {
          id: "r1",
          transactionId: BASE.gid!,
          amount: 2500,
          currency: "INR",
          status: "SUCCEEDED",
          createdAt: "03/08/2026, 09:00:00",
        },
      ],
      disputes: [
        {
          id: "d1",
          transactionId: BASE.gid!,
          amount: 2000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "DISPUTED",
          raisedOn: "05/08/2026, 09:00:00",
        },
      ],
    };
    expect(labelsFor(txn)).toEqual([
      "Payment captured",
      "Settled",
      "Partially refunded",
      "Dispute raised",
      "Awaiting your response",
    ]);
    expect(getDisplayStatus(txn).label).toBe("Partially refunded · Action required");
  });

  it("dispute then refund: chronological order follows real timestamps, not push order", () => {
    const txn: PaTransaction = {
      ...BASE,
      settlements: [
        { id: "s1", transactionId: BASE.gid!, amount: 10000, currency: "INR", status: "SETTLED" },
      ],
      // Raised BEFORE the refund below, even though disputes are appended
      // after refunds internally in generateTimelineEvents.
      disputes: [
        {
          id: "d1",
          transactionId: BASE.gid!,
          amount: 2000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "DISPUTED",
          raisedOn: "03/08/2026, 09:00:00",
        },
      ],
      refunds: [
        {
          id: "r1",
          transactionId: BASE.gid!,
          amount: 2500,
          currency: "INR",
          status: "SUCCEEDED",
          createdAt: "05/08/2026, 09:00:00",
        },
      ],
    };
    const labels = labelsFor(txn);
    expect(labels.indexOf("Dispute raised")).toBeLessThan(labels.indexOf("Partially refunded"));
  });

  it("multiple refunds: every meaningful refund event appears, not just the final state", () => {
    const txn: PaTransaction = {
      ...BASE,
      settlements: [
        { id: "s1", transactionId: BASE.gid!, amount: 10000, currency: "INR", status: "SETTLED" },
      ],
      refunds: [
        {
          id: "r1",
          transactionId: BASE.gid!,
          amount: 2500,
          currency: "INR",
          status: "SUCCEEDED",
          createdAt: "03/08/2026, 09:00:00",
        },
        {
          id: "r2",
          transactionId: BASE.gid!,
          amount: 2500,
          currency: "INR",
          status: "SUCCEEDED",
          createdAt: "05/08/2026, 09:00:00",
        },
      ],
    };
    const steps = deriveTimelineSteps(deriveTransactionDetail(txn).financials);
    const refundSteps = steps.filter((s) => s.label === "Partially refunded");
    expect(refundSteps).toHaveLength(2);
    expect(refundSteps[0]!.isAdditionalRefund).toBe(false);
    expect(refundSteps[1]!.isAdditionalRefund).toBe(true);
    // ₹5,000 of ₹10,000 refunded overall, still partial, matching the header.
    expect(getDisplayStatus(txn).label).toBe("Partially refunded");
  });

  it("multiple disputes: each keeps its own timeline entry, never overwriting the other", () => {
    const txn: PaTransaction = {
      ...BASE,
      disputes: [
        {
          id: "d1",
          transactionId: BASE.gid!,
          amount: 1000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "WON",
          raisedOn: "02/08/2026, 09:00:00",
          resolvedOn: "10/08/2026, 09:00:00",
        },
        {
          id: "d2",
          transactionId: BASE.gid!,
          amount: 500,
          currency: "INR",
          reason: "Duplicate processing",
          reasonCode: "12.6",
          description: "desc2",
          status: "LOST",
          raisedOn: "12/08/2026, 09:00:00",
          resolvedOn: "20/08/2026, 09:00:00",
        },
      ],
    };
    const steps = deriveTimelineSteps(deriveTransactionDetail(txn).financials);
    const raisedSteps = steps.filter((s) => s.label === "Dispute raised");
    expect(raisedSteps).toHaveLength(2);
    expect(steps.map((s) => s.label)).toContain("Dispute won");
    expect(steps.map((s) => s.label)).toContain("Dispute lost");
  });

  it("settlement + refund + dispute: settlement stays historically accurate, refund is never overwritten by the later dispute", () => {
    const txn: PaTransaction = {
      ...BASE,
      settlements: [
        {
          id: "s1",
          transactionId: BASE.gid!,
          amount: 10000,
          currency: "INR",
          status: "SETTLED",
          utrNumber: "UTR1",
        },
      ],
      refunds: [
        {
          id: "r1",
          transactionId: BASE.gid!,
          amount: 2500,
          currency: "INR",
          status: "SUCCEEDED",
          createdAt: "03/08/2026, 09:00:00",
        },
      ],
      disputes: [
        {
          id: "d1",
          transactionId: BASE.gid!,
          amount: 2000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "DISPUTED",
          raisedOn: "05/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);
    const steps = deriveTimelineSteps(detail.financials);
    expect(steps.map((s) => s.label)).toEqual([
      "Payment captured",
      "Settled",
      "Partially refunded",
      "Dispute raised",
      "Awaiting your response",
    ]);
    // Settlement amount stays exactly what was settled, unmodified by the
    // later refund/dispute.
    expect(detail.financials.settledAmount).toBe(10000);
    expect(getDisplayStatus(txn).label).toBe("Partially refunded · Action required");
  });

  it("payment failed: does not show Settled for a transaction that never reached settlement", () => {
    const txn: PaTransaction = { ...BASE, externalStatus: "ISSUER_DECLINE" };
    expect(labelsFor(txn)).toEqual(["Payment failed"]);
  });

  it("settlement still pending: shows Settlement in progress instead of Settled", () => {
    const txn: PaTransaction = {
      ...BASE,
      settlements: [
        {
          id: "s1",
          transactionId: BASE.gid!,
          amount: 10000,
          currency: "INR",
          status: "PENDING",
          expectedOnDate: "05/08/2026, 09:00:00",
        },
      ],
    };
    expect(labelsFor(txn)).toEqual(["Payment captured", "Settlement in progress"]);
  });

  it("Dispute raised step carries the dispute's own reason/reasonCode, so the timeline can show it concisely", () => {
    const txn: PaTransaction = {
      ...BASE,
      disputes: [
        {
          id: "d1",
          transactionId: BASE.gid!,
          amount: 4000,
          currency: "INR",
          reason: "Duplicate processing",
          reasonCode: "12.6",
          description: "desc",
          status: "DISPUTED",
          raisedOn: "09/08/2026, 09:00:00",
        },
      ],
    };
    const steps = deriveTimelineSteps(deriveTransactionDetail(txn).financials);
    const raised = steps.find((s) => s.label === "Dispute raised");
    expect(raised?.reason).toBe("Duplicate processing");
    expect(raised?.reasonCode).toBe("12.6");
  });
});
