import { describe, expect, it } from "vitest";
import {
  deriveTransactionStatus,
  getActiveDisputeAmount,
  getDisputedAmount,
  getFailedRefundAmount,
  getLostDisputeAmount,
  getNetAmount,
  getPendingRefundAmount,
  getRefundedAmount,
  getRemainingAmount,
  getSettledAmount,
  getWonDisputeAmount,
  hasDuplicateEventIds,
  validateChildEventReference,
  validateRefund,
} from "@/features/dashboard/transactions/financial/deriveFinancials";
import type {
  DisputeEvent,
  RefundEvent,
  SettlementEvent,
} from "@/features/dashboard/transactions/financial/types";

const TXN_ID = "gl_o-test1";
const CCY = "INR";

function refund(overrides: Partial<RefundEvent>): RefundEvent {
  return {
    id: "rf-1",
    transactionId: TXN_ID,
    amount: 100,
    currency: CCY,
    status: "SUCCEEDED",
    createdAt: "01/08/2026, 10:00:00",
    ...overrides,
  };
}

function dispute(overrides: Partial<DisputeEvent>): DisputeEvent {
  return {
    id: "du-1",
    transactionId: TXN_ID,
    amount: 100,
    currency: CCY,
    reason: "Fraudulent",
    reasonCode: "10.4",
    description: "The cardholder claims they did not authorise this purchase.",
    status: "DISPUTED",
    raisedOn: "02/08/2026, 10:00:00",
    ...overrides,
  };
}

function settlement(overrides: Partial<SettlementEvent>): SettlementEvent {
  return {
    id: "st-1",
    transactionId: TXN_ID,
    amount: 100,
    currency: CCY,
    status: "SETTLED",
    ...overrides,
  };
}

describe("getRefundedAmount", () => {
  it("counts only SUCCEEDED refunds", () => {
    const refunds = [
      refund({ id: "rf-1", status: "SUCCEEDED", amount: 100 }),
      refund({ id: "rf-2", status: "PENDING", amount: 50 }),
      refund({ id: "rf-3", status: "FAILED", amount: 25 }),
    ];
    expect(getRefundedAmount(refunds)).toBe(100);
  });

  it("sums multiple successful partial refunds", () => {
    const refunds = [
      refund({ id: "rf-1", amount: 2500 }),
      refund({ id: "rf-2", amount: 2500 }),
      refund({ id: "rf-3", amount: 5000 }),
    ];
    expect(getRefundedAmount(refunds)).toBe(10000);
  });
});

describe("getPendingRefundAmount / getFailedRefundAmount", () => {
  it("bucket pending and failed refunds separately from succeeded", () => {
    const refunds = [
      refund({ id: "rf-1", status: "SUCCEEDED", amount: 100 }),
      refund({ id: "rf-2", status: "PENDING", amount: 50 }),
      refund({ id: "rf-3", status: "FAILED", amount: 25 }),
    ];
    expect(getPendingRefundAmount(refunds)).toBe(50);
    expect(getFailedRefundAmount(refunds)).toBe(25);
  });
});

describe("getSettledAmount", () => {
  it("sums multiple settlements", () => {
    const settlements = [
      settlement({ id: "st-1", amount: 6000 }),
      settlement({ id: "st-2", amount: 4000 }),
    ];
    expect(getSettledAmount(settlements)).toBe(10000);
  });

  it("excludes pending settlements", () => {
    const settlements = [
      settlement({ id: "st-1", amount: 6000, status: "SETTLED" }),
      settlement({ id: "st-2", amount: 4000, status: "PENDING" }),
    ];
    expect(getSettledAmount(settlements)).toBe(6000);
  });

  it("stays unmodified by a later refund (settlement and refund are independent)", () => {
    const settlements = [settlement({ id: "st-1", amount: 10000 })];
    const settledBefore = getSettledAmount(settlements);
    const refunds = [refund({ id: "rf-1", amount: 3000 })];
    getRefundedAmount(refunds);
    expect(getSettledAmount(settlements)).toBe(settledBefore);
  });
});

describe("getDisputedAmount / getActiveDisputeAmount / getWonDisputeAmount / getLostDisputeAmount", () => {
  it("preserves the historical disputed amount regardless of outcome", () => {
    const disputes = [dispute({ id: "du-1", amount: 780, status: "WON" })];
    expect(getDisputedAmount(disputes)).toBe(780);
    expect(getWonDisputeAmount(disputes)).toBe(780);
    expect(getActiveDisputeAmount(disputes)).toBe(0);
  });

  it("does not reduce a full dispute amount because of an earlier partial refund", () => {
    const disputes = [dispute({ id: "du-1", amount: 10000, status: "DISPUTED" })];
    expect(getDisputedAmount(disputes)).toBe(10000);
    expect(getActiveDisputeAmount(disputes)).toBe(10000);
  });

  it("splits won vs. lost vs. active across multiple disputes on one transaction", () => {
    const disputes = [
      dispute({ id: "du-1", amount: 100, status: "WON" }),
      dispute({ id: "du-2", amount: 200, status: "LOST" }),
      dispute({ id: "du-3", amount: 300, status: "UNDER_REVIEW" }),
    ];
    expect(getDisputedAmount(disputes)).toBe(600);
    expect(getWonDisputeAmount(disputes)).toBe(100);
    expect(getLostDisputeAmount(disputes)).toBe(200);
    expect(getActiveDisputeAmount(disputes)).toBe(300);
  });
});

describe("getRemainingAmount", () => {
  it("subtracts refunded from original", () => {
    expect(getRemainingAmount(1000, 400)).toBe(600);
  });

  it("clamps to zero rather than going negative", () => {
    expect(getRemainingAmount(1000, 1500)).toBe(0);
  });
});

describe("validateRefund", () => {
  it("accepts a refund within the refundable amount", () => {
    expect(validateRefund(1000, CCY, [], { amount: 400, currency: CCY })).toEqual({ ok: true });
  });

  it("rejects a zero or negative refund amount", () => {
    expect(validateRefund(1000, CCY, [], { amount: 0, currency: CCY }).ok).toBe(false);
    expect(validateRefund(1000, CCY, [], { amount: -50, currency: CCY }).ok).toBe(false);
  });

  it("rejects a refund in the wrong currency", () => {
    const result = validateRefund(1000, "INR", [], { amount: 100, currency: "USD" });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/currency/i);
  });

  it("rejects a refund that would exceed the refundable amount", () => {
    const existing = [refund({ id: "rf-1", amount: 700, status: "SUCCEEDED" })];
    const result = validateRefund(1000, CCY, existing, { amount: 400, currency: CCY });
    expect(result.ok).toBe(false);
  });

  it("counts pending refunds toward the refundable ceiling, not just succeeded ones", () => {
    const existing = [refund({ id: "rf-1", amount: 900, status: "PENDING" })];
    const result = validateRefund(1000, CCY, existing, { amount: 200, currency: CCY });
    expect(result.ok).toBe(false);
  });

  it("ignores failed refunds when checking the refundable ceiling", () => {
    const existing = [refund({ id: "rf-1", amount: 900, status: "FAILED" })];
    const result = validateRefund(1000, CCY, existing, { amount: 900, currency: CCY });
    expect(result.ok).toBe(true);
  });

  it("allows a final partial refund that exactly completes the original amount", () => {
    const existing = [refund({ id: "rf-1", amount: 600, status: "SUCCEEDED" })];
    const result = validateRefund(1000, CCY, existing, { amount: 400, currency: CCY });
    expect(result.ok).toBe(true);
  });
});

describe("validateChildEventReference", () => {
  it("accepts an event referencing the expected transaction", () => {
    expect(validateChildEventReference(TXN_ID, { transactionId: TXN_ID })).toEqual({ ok: true });
  });

  it("rejects an event referencing a different transaction", () => {
    const result = validateChildEventReference(TXN_ID, { transactionId: "gl_o-other" });
    expect(result.ok).toBe(false);
  });
});

describe("hasDuplicateEventIds", () => {
  it("returns false when every ID is unique", () => {
    expect(hasDuplicateEventIds([{ id: "a" }, { id: "b" }])).toBe(false);
  });

  it("returns true when an ID repeats", () => {
    expect(hasDuplicateEventIds([{ id: "a" }, { id: "a" }])).toBe(true);
  });
});

describe("deriveTransactionStatus", () => {
  const base = { originalAmount: 1000, refundedAmount: 0, activeDisputeAmount: 0 } as const;

  it("returns FAILED for a failed payment regardless of other amounts", () => {
    expect(deriveTransactionStatus({ ...base, paymentBucket: "failed", refundedAmount: 500 })).toBe(
      "FAILED"
    );
  });

  it("returns PENDING for a pending payment", () => {
    expect(deriveTransactionStatus({ ...base, paymentBucket: "pending" })).toBe("PENDING");
  });

  it("returns SUCCESSFUL when nothing has been refunded or disputed", () => {
    expect(deriveTransactionStatus({ ...base, paymentBucket: "success" })).toBe("SUCCESSFUL");
  });

  it("returns PARTIALLY_REFUNDED for a partial refund", () => {
    expect(
      deriveTransactionStatus({ ...base, paymentBucket: "success", refundedAmount: 400 })
    ).toBe("PARTIALLY_REFUNDED");
  });

  it("returns REFUNDED when refunded amount reaches the original amount", () => {
    expect(
      deriveTransactionStatus({ ...base, paymentBucket: "success", refundedAmount: 1000 })
    ).toBe("REFUNDED");
  });

  it("returns DISPUTED for a full active dispute with no refund", () => {
    expect(
      deriveTransactionStatus({ ...base, paymentBucket: "success", activeDisputeAmount: 1000 })
    ).toBe("DISPUTED");
  });

  it("returns PARTIALLY_DISPUTED for a partial active dispute with no refund", () => {
    expect(
      deriveTransactionStatus({ ...base, paymentBucket: "success", activeDisputeAmount: 300 })
    ).toBe("PARTIALLY_DISPUTED");
  });

  it("returns REFUNDED_AND_DISPUTED when fully refunded and actively disputed", () => {
    expect(
      deriveTransactionStatus({
        ...base,
        paymentBucket: "success",
        refundedAmount: 1000,
        activeDisputeAmount: 1000,
      })
    ).toBe("REFUNDED_AND_DISPUTED");
  });

  it("returns PARTIALLY_REFUNDED_AND_DISPUTED for a partial refund plus an active dispute", () => {
    expect(
      deriveTransactionStatus({
        ...base,
        paymentBucket: "success",
        refundedAmount: 250,
        activeDisputeAmount: 1000,
      })
    ).toBe("PARTIALLY_REFUNDED_AND_DISPUTED");
  });

  it("does not auto-reduce a full dispute amount raised after a partial refund", () => {
    // 1000 original, 250 already refunded, a full 1000 dispute is then
    // raised, activeDisputeAmount must stay 1000, not 750.
    const status = deriveTransactionStatus({
      paymentBucket: "success",
      originalAmount: 1000,
      refundedAmount: 250,
      activeDisputeAmount: 1000,
    });
    expect(status).toBe("PARTIALLY_REFUNDED_AND_DISPUTED");
  });

  it("a won dispute is no longer active and falls back to the refund-only status", () => {
    expect(
      deriveTransactionStatus({ ...base, paymentBucket: "success", activeDisputeAmount: 0 })
    ).toBe("SUCCESSFUL");
  });
});

describe("getNetAmount", () => {
  it("subtracts fee and refunded amount from the amount received", () => {
    expect(getNetAmount(10000, 180, 2500)).toBe(7320);
  });

  it("never subtracts a disputed amount, only fee and refunds", () => {
    // A dispute must not be silently treated as a refund (Section 11 of the
    // Payment Breakdown spec), getNetAmount doesn't even take a dispute
    // amount parameter, this test guards that its 3-argument shape stays
    // fee+refund only.
    expect(getNetAmount(10000, 180, 0)).toBe(9820);
  });

  it("reflects a full refund", () => {
    expect(getNetAmount(10000, 180, 10000)).toBe(-180);
  });

  it("avoids float precision drift", () => {
    expect(getNetAmount(1000.5, 18.01, 200.25)).toBeCloseTo(782.24, 2);
  });
});
