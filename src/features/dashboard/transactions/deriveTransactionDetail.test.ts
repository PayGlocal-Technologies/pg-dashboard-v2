import { describe, expect, it } from "vitest";
import { deriveTransactionDetail } from "@/features/dashboard/transactions/deriveTransactionDetail";
import { MOCK_PA_TRANSACTIONS } from "@/features/dashboard/transactions/mockRows";
import type { PaTransaction } from "@/features/dashboard/transactions/types";
import type { RefundEvent } from "@/features/dashboard/transactions/financial/types";

const BASE_TXN: PaTransaction = {
  gid: "gl_o-test1",
  externalStatus: "SUCCESS",
  txnCurrency: "INR",
  totalAmount: "1000.00",
  formattedCreationDateTime: "01/08/2026, 09:00:00",
  paymentInstrument: "CARDS",
};

describe("deriveTransactionDetail backwards compatibility", () => {
  it("treats a call with no refund events as an empty refunds array, never throwing", () => {
    expect(() => deriveTransactionDetail(BASE_TXN)).not.toThrow();
    const detail = deriveTransactionDetail(BASE_TXN);
    expect(detail.financials.refundEvents).toEqual([]);
    expect(detail.financials.refundedAmount).toBe(0);
    expect(detail.financials.remainingAmount).toBe(1000);
  });

  it("still returns every pre-existing field on the detail view", () => {
    const detail = deriveTransactionDetail(BASE_TXN);
    expect(detail.merchantTxnId).toBe("gl_o-test1");
    expect(detail.settlement).toBeDefined();
    expect(detail.amountBreakdown).not.toBeNull();
    expect(detail.dispute).toBeNull();
  });
});

describe("deriveTransactionDetail financials", () => {
  it("reduces the remaining amount by successful refunds only", () => {
    const refundEvents: RefundEvent[] = [
      {
        id: "gl_o-test1-refund-1",
        transactionId: "gl_o-test1",
        amount: 300,
        currency: "INR",
        status: "COMPLETED",
        createdAt: "05/08/2026, 09:00:00",
      },
      {
        id: "gl_o-test1-refund-2",
        transactionId: "gl_o-test1",
        amount: 200,
        currency: "INR",
        status: "PROCESSING",
        createdAt: "06/08/2026, 09:00:00",
      },
    ];
    const detail = deriveTransactionDetail(BASE_TXN, refundEvents);
    expect(detail.financials.refundedAmount).toBe(300);
    expect(detail.financials.processingRefundAmount).toBe(200);
    expect(detail.financials.remainingAmount).toBe(700);
    // A refund is still PROCESSING here (alongside the already-COMPLETED one),
    // and the precedence table checks "still moving" before "completed", so
    // this reads as REFUND_IN_PROGRESS, not REFUNDED.
    expect(detail.financials.derivedTransactionStatus).toBe("REFUND_IN_PROGRESS");
  });

  it("derives DISPUTED status and a matching dispute event for a disputed transaction", () => {
    const disputedTxn: PaTransaction = { ...BASE_TXN, externalStatus: "NEEDS_RESPONSE" };
    const detail = deriveTransactionDetail(disputedTxn);
    expect(detail.dispute).not.toBeNull();
    expect(detail.financials.disputeEvents).toHaveLength(1);
    expect(detail.financials.disputeEvents[0]!.status).toBe("NEEDS_RESPONSE");
    expect(detail.financials.disputedAmount).toBe(1000);
    expect(detail.financials.derivedTransactionStatus).toBe("DISPUTED");
  });

  it("keeps the historical disputed amount when a dispute resolves to CLEARED", () => {
    const clearedTxn: PaTransaction = { ...BASE_TXN, externalStatus: "CLEARED" };
    const detail = deriveTransactionDetail(clearedTxn);
    expect(detail.financials.disputeEvents[0]!.status).toBe("CLEARED");
    expect(detail.financials.disputedAmount).toBe(1000);
    expect(detail.financials.clearedDisputeAmount).toBe(1000);
    expect(detail.financials.activeDisputeAmount).toBe(0);
    // No longer actively disputed, but a cleared dispute alone (nothing else
    // touching the transaction) now gets its own dedicated status rather than
    // falling all the way back to a plain successful payment.
    expect(detail.financials.derivedTransactionStatus).toBe("DISPUTE_CLEARED");
  });

  it("produces chronologically sorted timeline events including the dispute", () => {
    const disputedTxn: PaTransaction = { ...BASE_TXN, externalStatus: "UNDER_REVIEW" };
    const detail = deriveTransactionDetail(disputedTxn);
    const types = detail.financials.timelineEvents.map((e) => e.type);
    expect(types[0]).toBe("PAYMENT_INITIATED");
    expect(types).toContain("DISPUTE_RAISED");
  });
});

describe("deriveTransactionDetail with embedded child events (the corrected unified model)", () => {
  it("reads settlement/refund/dispute straight from the transaction's own arrays, all independent", () => {
    const txn: PaTransaction = {
      ...BASE_TXN,
      settlements: [
        {
          id: "s1",
          transactionId: "gl_o-test1",
          amount: 1000,
          currency: "INR",
          status: "SETTLED",
          settledOnDate: "02/08/2026, 09:00:00",
          utrNumber: "UTR1",
          settledToAccount: "HDFC ****1234",
        },
      ],
      refunds: [
        {
          id: "r1",
          transactionId: "gl_o-test1",
          amount: 250,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "05/08/2026, 09:00:00",
        },
      ],
      disputes: [
        {
          id: "d1",
          transactionId: "gl_o-test1",
          amount: 200,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "06/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);

    // Refund + settlement + dispute together (Section 19 of the spec): one
    // transaction, three independent amounts, a later refund/dispute never
    // touches the historical settlement.
    expect(detail.financials.settledAmount).toBe(1000);
    expect(detail.financials.refundedAmount).toBe(250);
    expect(detail.financials.disputedAmount).toBe(200);
    expect(detail.financials.remainingAmount).toBe(750);
    expect(detail.financials.derivedTransactionStatus).toBe("REFUNDED_AND_DISPUTED");
    expect(detail.settlement).toEqual({
      applicable: true,
      isSettled: true,
      settledOnDate: "02/08/2026, 09:00:00",
      utrNumber: "UTR1",
      settledToAccount: "HDFC ****1234",
      settlementId: "",
    });
  });

  it("keeps settledAmount unmodified when a refund is issued afterwards", () => {
    const txn: PaTransaction = {
      ...BASE_TXN,
      settlements: [
        { id: "s1", transactionId: "gl_o-test1", amount: 1000, currency: "INR", status: "SETTLED" },
      ],
    };
    const before = deriveTransactionDetail(txn).financials.settledAmount;
    const after = deriveTransactionDetail({
      ...txn,
      refunds: [
        {
          id: "r1",
          transactionId: "gl_o-test1",
          amount: 250,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "05/08/2026, 09:00:00",
        },
      ],
    }).financials.settledAmount;
    expect(after).toBe(before);
    expect(after).toBe(1000);
  });

  it("sums multiple settlement events instead of assuming exactly one", () => {
    const txn: PaTransaction = {
      ...BASE_TXN,
      settlements: [
        { id: "s1", transactionId: "gl_o-test1", amount: 600, currency: "INR", status: "SETTLED" },
        { id: "s2", transactionId: "gl_o-test1", amount: 400, currency: "INR", status: "SETTLED" },
      ],
    };
    expect(deriveTransactionDetail(txn).financials.settledAmount).toBe(1000);
  });
});

describe("mock data reflects the unified transaction model (no child event masquerades as a row)", () => {
  it("never lists a refund/dispute/settlement id as its own transaction gid", () => {
    const transactionGids = new Set(MOCK_PA_TRANSACTIONS.map((t) => t.gid));
    for (const txn of MOCK_PA_TRANSACTIONS) {
      for (const child of [
        ...(txn.refunds ?? []),
        ...(txn.disputes ?? []),
        ...(txn.settlements ?? []),
      ]) {
        expect(transactionGids.has(child.id)).toBe(false);
      }
    }
  });

  it("every child event references the transaction it's embedded on", () => {
    for (const txn of MOCK_PA_TRANSACTIONS) {
      for (const child of [
        ...(txn.refunds ?? []),
        ...(txn.disputes ?? []),
        ...(txn.settlements ?? []),
      ]) {
        expect(child.transactionId).toBe(txn.gid);
      }
    }
  });

  it("a transaction with multiple refunds and a dispute is still exactly one row", () => {
    const withEverything = MOCK_PA_TRANSACTIONS.filter(
      (t) => (t.refunds?.length ?? 0) >= 2 && (t.disputes?.length ?? 0) > 0
    );
    expect(withEverything).toHaveLength(1);
    const txn = withEverything[0]!;
    expect(MOCK_PA_TRANSACTIONS.filter((t) => t.gid === txn.gid)).toHaveLength(1);
  });

  it("includes at least one of each required demonstration scenario", () => {
    const detailsByGid = new Map(
      MOCK_PA_TRANSACTIONS.map((t) => [t.gid, deriveTransactionDetail(t)])
    );
    const statuses = [...detailsByGid.values()].map((d) => d.financials.derivedTransactionStatus);
    // New vocabulary has no partial/full distinction at the transaction-status
    // level (that's what remainingAmount is for), so the old PARTIALLY_REFUNDED/
    // PARTIALLY_DISPUTED/PARTIALLY_REFUNDED_AND_DISPUTED variants collapse into
    // their plain REFUNDED/DISPUTED/REFUNDED_AND_DISPUTED counterparts below.
    expect(statuses).toContain("SUCCESS");
    expect(statuses).toContain("REFUNDED");
    expect(statuses).toContain("DISPUTED");
    expect(statuses).toContain("REFUNDED_AND_DISPUTED");
    expect(statuses).toContain("DISPUTE_CLEARED");
    expect(statuses).toContain("CHARGED_BACK");
  });
});

describe("Payment Breakdown stays in sync with header status and timeline (Section 22)", () => {
  const BASE_10K: PaTransaction = {
    gid: "gl_o-pb1",
    externalStatus: "SUCCESS",
    txnCurrency: "INR",
    totalAmount: "10000.00",
    formattedCreationDateTime: "01/08/2026, 09:00:00",
  };

  it("normal: no Refunded/Disputed dimension, netAmount is just amount minus fee", () => {
    const detail = deriveTransactionDetail(BASE_10K);
    expect(detail.amountBreakdown!.refundedAmount).toBe(0);
    expect(detail.amountBreakdown!.disputedAmount).toBe(0);
    expect(detail.amountBreakdown!.netAmount).toBe(
      detail.amountBreakdown!.amountReceived - detail.amountBreakdown!.fee
    );
  });

  it("partial refund: refundedAmount matches financials exactly, netAmount is refund-adjusted", () => {
    const txn: PaTransaction = {
      ...BASE_10K,
      refunds: [
        {
          id: "r1",
          transactionId: BASE_10K.gid!,
          amount: 2500,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "03/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);
    expect(detail.amountBreakdown!.refundedAmount).toBe(detail.financials.refundedAmount);
    expect(detail.amountBreakdown!.refundedAmount).toBe(2500);
    expect(detail.amountBreakdown!.netAmount).toBe(
      detail.amountBreakdown!.amountReceived - detail.amountBreakdown!.fee - 2500
    );
  });

  it("multiple refunds: aggregated into a single refundedAmount, matching financials", () => {
    const txn: PaTransaction = {
      ...BASE_10K,
      refunds: [
        {
          id: "r1",
          transactionId: BASE_10K.gid!,
          amount: 2000,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "03/08/2026, 09:00:00",
        },
        {
          id: "r2",
          transactionId: BASE_10K.gid!,
          amount: 1500,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "05/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);
    expect(detail.amountBreakdown!.refundedAmount).toBe(3500);
    expect(detail.amountBreakdown!.refundedAmount).toBe(detail.financials.refundedAmount);
  });

  it("full refund: refundedAmount equals the original amount", () => {
    const txn: PaTransaction = {
      ...BASE_10K,
      refunds: [
        {
          id: "r1",
          transactionId: BASE_10K.gid!,
          amount: 10000,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "03/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);
    expect(detail.amountBreakdown!.refundedAmount).toBe(10000);
    expect(detail.financials.derivedTransactionStatus).toBe("REFUNDED");
  });

  it("pending refund: not counted in the breakdown's refundedAmount", () => {
    const txn: PaTransaction = {
      ...BASE_10K,
      refunds: [
        {
          id: "r1",
          transactionId: BASE_10K.gid!,
          amount: 2500,
          currency: "INR",
          status: "PROCESSING",
          createdAt: "03/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);
    expect(detail.amountBreakdown!.refundedAmount).toBe(0);
    expect(detail.financials.processingRefundAmount).toBe(2500);
  });

  it("failed refund: not counted in the breakdown's refundedAmount", () => {
    const txn: PaTransaction = {
      ...BASE_10K,
      refunds: [
        {
          id: "r1",
          transactionId: BASE_10K.gid!,
          amount: 2500,
          currency: "INR",
          status: "FAILED",
          createdAt: "03/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);
    expect(detail.amountBreakdown!.refundedAmount).toBe(0);
    expect(detail.financials.failedRefundAmount).toBe(2500);
  });

  it("settled + refund: settlement amount stays historically accurate, unmodified by the refund", () => {
    const txn: PaTransaction = {
      ...BASE_10K,
      settlements: [
        {
          id: "s1",
          transactionId: BASE_10K.gid!,
          amount: 10000,
          currency: "INR",
          status: "SETTLED",
        },
      ],
      refunds: [
        {
          id: "r1",
          transactionId: BASE_10K.gid!,
          amount: 2500,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "03/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);
    expect(detail.financials.settledAmount).toBe(10000);
    expect(detail.amountBreakdown!.refundedAmount).toBe(2500);
  });

  it("settled + dispute: disputedAmount is shown but never netted against the payment", () => {
    const txn: PaTransaction = {
      ...BASE_10K,
      settlements: [
        {
          id: "s1",
          transactionId: BASE_10K.gid!,
          amount: 10000,
          currency: "INR",
          status: "SETTLED",
        },
      ],
      disputes: [
        {
          id: "d1",
          transactionId: BASE_10K.gid!,
          amount: 2000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "04/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);
    expect(detail.amountBreakdown!.disputedAmount).toBe(2000);
    expect(detail.amountBreakdown!.refundedAmount).toBe(0);
    expect(detail.amountBreakdown!.netAmount).toBe(
      detail.amountBreakdown!.amountReceived - detail.amountBreakdown!.fee
    );
  });

  it("refund + dispute: independent dimensions, never combined into one subtracted figure", () => {
    const txn: PaTransaction = {
      ...BASE_10K,
      refunds: [
        {
          id: "r1",
          transactionId: BASE_10K.gid!,
          amount: 2500,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "03/08/2026, 09:00:00",
        },
      ],
      disputes: [
        {
          id: "d1",
          transactionId: BASE_10K.gid!,
          amount: 2000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "05/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);
    expect(detail.amountBreakdown!.refundedAmount).toBe(2500);
    expect(detail.amountBreakdown!.disputedAmount).toBe(2000);
    // Never 10000 - 2500 - 2000 = 5500, disputedAmount stays out of netAmount.
    expect(detail.amountBreakdown!.netAmount).toBe(
      detail.amountBreakdown!.amountReceived - detail.amountBreakdown!.fee - 2500
    );
  });

  it("settled + refund + dispute: all three dimensions independently correct, no double counting", () => {
    const txn: PaTransaction = {
      ...BASE_10K,
      settlements: [
        {
          id: "s1",
          transactionId: BASE_10K.gid!,
          amount: 10000,
          currency: "INR",
          status: "SETTLED",
        },
      ],
      refunds: [
        {
          id: "r1",
          transactionId: BASE_10K.gid!,
          amount: 2500,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "03/08/2026, 09:00:00",
        },
      ],
      disputes: [
        {
          id: "d1",
          transactionId: BASE_10K.gid!,
          amount: 2000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "05/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);
    expect(detail.financials.settledAmount).toBe(10000);
    expect(detail.amountBreakdown!.refundedAmount).toBe(2500);
    expect(detail.amountBreakdown!.disputedAmount).toBe(2000);
    expect(detail.amountBreakdown!.refundedAmount).not.toBe(4500);
    expect(detail.financials.derivedTransactionStatus).toBe("REFUNDED_AND_DISPUTED");
  });
});

describe("dispute reason hierarchy: merchant-facing label is dynamically derived, never hardcoded", () => {
  const BASE_DISPUTE_TXN: PaTransaction = {
    gid: "gl_o-reason1",
    externalStatus: "SUCCESS",
    txnCurrency: "INR",
    totalAmount: "10000.00",
    formattedCreationDateTime: "01/08/2026, 09:00:00",
  };

  it("derives a short merchant label from the dispute's own reason for a structured dispute", () => {
    const txn: PaTransaction = {
      ...BASE_DISPUTE_TXN,
      disputes: [
        {
          id: "d1",
          transactionId: BASE_DISPUTE_TXN.gid!,
          amount: 4000,
          currency: "INR",
          reason: "Duplicate processing",
          reasonCode: "12.6",
          description:
            "The customer claims they were charged more than once for the same purchase.",
          status: "NEEDS_RESPONSE",
          raisedOn: "09/08/2026, 09:00:00",
        },
      ],
    };
    const detail = deriveTransactionDetail(txn);
    expect(detail.dispute!.merchantLabel).toBe("Duplicate charge");
    expect(detail.dispute!.reason).toBe("Duplicate processing");
    expect(detail.dispute!.reasonCode).toBe("12.6");
  });

  it("different dispute reasons render their own appropriate merchant label", () => {
    const fraudTxn: PaTransaction = {
      ...BASE_DISPUTE_TXN,
      disputes: [
        {
          id: "d1",
          transactionId: BASE_DISPUTE_TXN.gid!,
          amount: 1000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "09/08/2026, 09:00:00",
        },
      ],
    };
    expect(deriveTransactionDetail(fraudTxn).dispute!.merchantLabel).toBe("Fraudulent transaction");
  });

  it("also derives a merchant label for the status-keyed fallback (real, not-yet-migrated API data)", () => {
    const legacyTxn: PaTransaction = { ...BASE_DISPUTE_TXN, externalStatus: "CLEARED" };
    const detail = deriveTransactionDetail(legacyTxn);
    expect(detail.dispute!.reason).toBe("Duplicate processing");
    expect(detail.dispute!.merchantLabel).toBe("Duplicate charge");
  });

  it("carries the dispute's reason/reasonCode onto the timeline's Dispute raised step", () => {
    const txn: PaTransaction = {
      ...BASE_DISPUTE_TXN,
      disputes: [
        {
          id: "d1",
          transactionId: BASE_DISPUTE_TXN.gid!,
          amount: 4000,
          currency: "INR",
          reason: "Duplicate processing",
          reasonCode: "12.6",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "09/08/2026, 09:00:00",
        },
      ],
    };
    const raised = deriveTransactionDetail(txn).financials.timelineEvents.find(
      (e) => e.type === "DISPUTE_RAISED"
    );
    expect(raised?.disputeId).toBe("d1");
  });
});

describe("deriveTransactionDetail.linkedTransactions (parent-child transaction model)", () => {
  const PARENT_20K: PaTransaction = {
    gid: "gl_o-linked1",
    externalStatus: "SUCCESS",
    txnCurrency: "INR",
    totalAmount: "20000.00",
    formattedCreationDateTime: "01/08/2026, 09:00:00",
  };

  it("shows no linked transactions and no placeholder when there are no children", () => {
    expect(deriveTransactionDetail(PARENT_20K).linkedTransactions).toEqual([]);
  });

  it("shows each refund and dispute as its own linked row, never collapsed", () => {
    const txn: PaTransaction = {
      ...PARENT_20K,
      refunds: [
        {
          id: "r1",
          transactionId: PARENT_20K.gid!,
          amount: 3000,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "03/08/2026, 09:00:00",
        },
        {
          id: "r2",
          transactionId: PARENT_20K.gid!,
          amount: 2000,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "04/08/2026, 09:00:00",
        },
      ],
      disputes: [
        {
          id: "d1",
          transactionId: PARENT_20K.gid!,
          amount: 4000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "05/08/2026, 09:00:00",
        },
      ],
    };
    const linked = deriveTransactionDetail(txn).linkedTransactions;
    expect(linked).toHaveLength(3);
    expect(linked.every((row) => row.gid === PARENT_20K.gid)).toBe(true);
    expect(linked.map((r) => r.linkedRecordId)).toEqual(["r1", "r2", "d1"]);
  });

  it("includes a session-issued refund (passed as additionalRefundEvents) immediately", () => {
    const sessionRefund = {
      id: "gl_o-linked1-refund-1",
      transactionId: PARENT_20K.gid!,
      amount: 1500,
      currency: "INR",
      status: "COMPLETED" as const,
      createdAt: "06/08/2026, 09:00:00",
    };
    const linked = deriveTransactionDetail(PARENT_20K, [sessionRefund]).linkedTransactions;
    expect(linked).toHaveLength(1);
    expect(linked[0]!.linkedRecordType).toBe("refund");
    expect(linked[0]!.linkedRecordId).toBe(sessionRefund.id);
  });
});
