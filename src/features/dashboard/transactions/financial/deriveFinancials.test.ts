import { describe, expect, it } from "vitest";
import {
  getActiveDisputeAmount,
  getChargedBackDisputeAmount,
  getClearedDisputeAmount,
  getDisputedAmount,
  getFailedRefundAmount,
  getNetAmount,
  getProcessingRefundAmount,
  getRefundedAmount,
  getRemainingAmount,
  getSettledAmount,
  hasDuplicateEventIds,
  validateChildEventReference,
  validateRefund,
} from "@/features/dashboard/transactions/financial/deriveFinancials";
import type {
  DisputeEvent,
  RefundEvent,
  SettlementEvent,
} from "@/features/dashboard/transactions/financial/types";
import { deriveTransactionStatusChip } from "@/features/dashboard/transactions/status/transactionStatus";

const TXN_ID = "gl_o-test1";
const CCY = "INR";

function refund(overrides: Partial<RefundEvent>): RefundEvent {
  return {
    id: "rf-1",
    transactionId: TXN_ID,
    amount: 100,
    currency: CCY,
    status: "COMPLETED",
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
    status: "NEEDS_RESPONSE",
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
  it("counts only COMPLETED refunds", () => {
    const refunds = [
      refund({ id: "rf-1", status: "COMPLETED", amount: 100 }),
      refund({ id: "rf-2", status: "PROCESSING", amount: 50 }),
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

describe("getProcessingRefundAmount / getFailedRefundAmount", () => {
  it("bucket processing and failed refunds separately from completed", () => {
    const refunds = [
      refund({ id: "rf-1", status: "COMPLETED", amount: 100 }),
      refund({ id: "rf-2", status: "PROCESSING", amount: 50 }),
      refund({ id: "rf-3", status: "FAILED", amount: 25 }),
    ];
    expect(getProcessingRefundAmount(refunds)).toBe(50);
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

describe("getDisputedAmount / getActiveDisputeAmount / getClearedDisputeAmount / getChargedBackDisputeAmount", () => {
  it("preserves the historical disputed amount regardless of outcome", () => {
    const disputes = [dispute({ id: "du-1", amount: 780, status: "CLEARED" })];
    expect(getDisputedAmount(disputes)).toBe(780);
    expect(getClearedDisputeAmount(disputes)).toBe(780);
    expect(getActiveDisputeAmount(disputes)).toBe(0);
  });

  it("does not reduce a full dispute amount because of an earlier partial refund", () => {
    const disputes = [dispute({ id: "du-1", amount: 10000, status: "NEEDS_RESPONSE" })];
    expect(getDisputedAmount(disputes)).toBe(10000);
    expect(getActiveDisputeAmount(disputes)).toBe(10000);
  });

  it("splits cleared vs. charged-back vs. active across multiple disputes on one transaction", () => {
    const disputes = [
      dispute({ id: "du-1", amount: 100, status: "CLEARED" }),
      dispute({ id: "du-2", amount: 200, status: "CHARGED_BACK" }),
      dispute({ id: "du-3", amount: 300, status: "UNDER_REVIEW" }),
    ];
    expect(getDisputedAmount(disputes)).toBe(600);
    expect(getClearedDisputeAmount(disputes)).toBe(100);
    expect(getChargedBackDisputeAmount(disputes)).toBe(200);
    expect(getActiveDisputeAmount(disputes)).toBe(300);
  });

  it("counts ACCEPTED and EXPIRED disputes toward getChargedBackDisputeAmount, not just CHARGED_BACK", () => {
    // getChargedBackDisputeAmount now sums every dispute where money
    // ultimately left the merchant (didDisputeMoneyLeaveTheMerchant),
    // which is CHARGED_BACK, ACCEPTED or EXPIRED, not just CHARGED_BACK.
    const disputes = [
      dispute({ id: "du-1", amount: 200, status: "CHARGED_BACK" }),
      dispute({ id: "du-2", amount: 300, status: "ACCEPTED" }),
      dispute({ id: "du-3", amount: 400, status: "EXPIRED" }),
      dispute({ id: "du-4", amount: 500, status: "CLEARED" }),
      dispute({ id: "du-5", amount: 600, status: "UNDER_REVIEW" }),
    ];
    expect(getChargedBackDisputeAmount(disputes)).toBe(900);
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
    const existing = [refund({ id: "rf-1", amount: 700, status: "COMPLETED" })];
    const result = validateRefund(1000, CCY, existing, { amount: 400, currency: CCY });
    expect(result.ok).toBe(false);
  });

  it("counts processing refunds toward the refundable ceiling, not just completed ones", () => {
    const existing = [refund({ id: "rf-1", amount: 900, status: "PROCESSING" })];
    const result = validateRefund(1000, CCY, existing, { amount: 200, currency: CCY });
    expect(result.ok).toBe(false);
  });

  it("ignores failed refunds when checking the refundable ceiling", () => {
    const existing = [refund({ id: "rf-1", amount: 900, status: "FAILED" })];
    const result = validateRefund(1000, CCY, existing, { amount: 900, currency: CCY });
    expect(result.ok).toBe(true);
  });

  it("allows a final partial refund that exactly completes the original amount", () => {
    const existing = [refund({ id: "rf-1", amount: 600, status: "COMPLETED" })];
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

describe("deriveTransactionStatusChip", () => {
  // Note: the old deriveTransactionStatus (removed from deriveFinancials.ts)
  // took { paymentBucket, originalAmount, refundedAmount, activeDisputeAmount }
  // and returned a distinct "PARTIALLY_*" key for a partial refund/dispute vs.
  // a full one. deriveTransactionStatusChip takes
  // { paymentBucket, originalAmount, refundedAmount, hasProcessingRefund,
  // disputeEvents } and no longer distinguishes partial vs. full, only
  // presence (refundedAmount > 0, a live/money-left dispute event) matters,
  // per the status-vocabulary spec's 9-step precedence table. Every scenario
  // below is translated from the old suite into this new shape/vocabulary;
  // where the old suite had separate PARTIALLY_X and X cases they now
  // collapse onto the same TransactionStatusKey.

  const base = {
    originalAmount: 1000,
    refundedAmount: 0,
    hasProcessingRefund: false,
    disputeEvents: [] as DisputeEvent[],
  };

  it("returns FAILED for a failed payment regardless of other amounts", () => {
    expect(
      deriveTransactionStatusChip({ ...base, paymentBucket: "failed", refundedAmount: 500 })
    ).toBe("FAILED");
  });

  it("returns EXPIRED for an expired payment", () => {
    expect(deriveTransactionStatusChip({ ...base, paymentBucket: "expired" })).toBe("EXPIRED");
  });

  it("returns IN_FLIGHT for a payment still on its way to the bank (was PENDING)", () => {
    expect(deriveTransactionStatusChip({ ...base, paymentBucket: "in_flight" })).toBe("IN_FLIGHT");
  });

  it("returns SUCCESS when nothing has been refunded or disputed (was SUCCESSFUL)", () => {
    expect(deriveTransactionStatusChip({ ...base, paymentBucket: "success" })).toBe("SUCCESS");
  });

  it("returns REFUNDED for a partial refund (was PARTIALLY_REFUNDED, now collapsed into REFUNDED)", () => {
    expect(
      deriveTransactionStatusChip({ ...base, paymentBucket: "success", refundedAmount: 400 })
    ).toBe("REFUNDED");
  });

  it("returns REFUNDED when refunded amount reaches the original amount", () => {
    expect(
      deriveTransactionStatusChip({ ...base, paymentBucket: "success", refundedAmount: 1000 })
    ).toBe("REFUNDED");
  });

  it("returns DISPUTED for a live dispute with no refund (was DISPUTED for a 'full' dispute)", () => {
    expect(
      deriveTransactionStatusChip({
        ...base,
        paymentBucket: "success",
        disputeEvents: [dispute({ amount: 1000, status: "NEEDS_RESPONSE" })],
      })
    ).toBe("DISPUTED");
  });

  it("returns DISPUTED for a partial-amount live dispute too (was PARTIALLY_DISPUTED, now collapsed into DISPUTED)", () => {
    expect(
      deriveTransactionStatusChip({
        ...base,
        paymentBucket: "success",
        disputeEvents: [dispute({ amount: 300, status: "UNDER_REVIEW" })],
      })
    ).toBe("DISPUTED");
  });

  it("returns REFUNDED_AND_DISPUTED when fully refunded and actively disputed", () => {
    expect(
      deriveTransactionStatusChip({
        ...base,
        paymentBucket: "success",
        refundedAmount: 1000,
        disputeEvents: [dispute({ amount: 1000, status: "NEEDS_RESPONSE" })],
      })
    ).toBe("REFUNDED_AND_DISPUTED");
  });

  it("returns REFUNDED_AND_DISPUTED for a partial refund plus a live dispute (was PARTIALLY_REFUNDED_AND_DISPUTED)", () => {
    expect(
      deriveTransactionStatusChip({
        ...base,
        paymentBucket: "success",
        refundedAmount: 250,
        disputeEvents: [dispute({ amount: 1000, status: "NEEDS_RESPONSE" })],
      })
    ).toBe("REFUNDED_AND_DISPUTED");
  });

  it("still returns REFUNDED_AND_DISPUTED when a full dispute is raised after only a partial refund (was 'does not auto-reduce a full dispute amount')", () => {
    // 1000 original, 250 already refunded, a full 1000 dispute is then
    // raised and reopened; the dispute's own amount no longer factors into
    // this function at all (only whether it's live), the outcome is driven
    // purely by precedence: refunded + live dispute still wins.
    const status = deriveTransactionStatusChip({
      paymentBucket: "success",
      originalAmount: 1000,
      refundedAmount: 250,
      hasProcessingRefund: false,
      disputeEvents: [dispute({ amount: 1000, status: "REOPENED" })],
    });
    expect(status).toBe("REFUNDED_AND_DISPUTED");
  });

  it("returns DISPUTE_CLEARED for a cleared dispute alone (was 'a won dispute is no longer active and falls back to SUCCESSFUL', now its own resolved-status chip instead of falling back to SUCCESS)", () => {
    expect(
      deriveTransactionStatusChip({
        ...base,
        paymentBucket: "success",
        disputeEvents: [dispute({ amount: 100, status: "CLEARED" })],
      })
    ).toBe("DISPUTE_CLEARED");
  });

  it("returns CHARGED_BACK for a dispute that took money with no refund", () => {
    expect(
      deriveTransactionStatusChip({
        ...base,
        paymentBucket: "success",
        disputeEvents: [dispute({ amount: 500, status: "CHARGED_BACK" })],
      })
    ).toBe("CHARGED_BACK");
  });

  it("returns REFUNDED_AND_CHARGED_BACK when refunded and the dispute took money (ACCEPTED counts too, not just CHARGED_BACK)", () => {
    expect(
      deriveTransactionStatusChip({
        ...base,
        paymentBucket: "success",
        refundedAmount: 1000,
        disputeEvents: [dispute({ amount: 1000, status: "ACCEPTED" })],
      })
    ).toBe("REFUNDED_AND_CHARGED_BACK");
  });

  it("returns REFUND_IN_PROGRESS when a refund is still processing and nothing else has resolved", () => {
    expect(
      deriveTransactionStatusChip({ ...base, paymentBucket: "success", hasProcessingRefund: true })
    ).toBe("REFUND_IN_PROGRESS");
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
