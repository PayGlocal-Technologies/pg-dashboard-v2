import { describe, expect, it } from "vitest";
import {
  getDisputeAmounts,
  getDisputeCounts,
  getDominantCurrency,
  getTotalDisputeAmount,
  getTotalDisputeCount,
} from "@/features/dashboard/dispute-management/aggregations";
import type { DisputeRow } from "@/features/dashboard/dispute-management/types";

function row(overrides: Partial<DisputeRow>): DisputeRow {
  return {
    disputeId: "du_1",
    txnGid: "gl_o-1",
    status: "DISPUTED",
    amount: 100,
    currency: "INR",
    reason: "Fraudulent",
    customerName: "Test User",
    email: "test@example.com",
    disputedOn: "01/08/2026, 09:00:00",
    ...overrides,
  };
}

// Section 22's own worked example: 6 Needs action, 2 In review, 1 Won, 1 Lost.
const SAMPLE: DisputeRow[] = [
  row({ disputeId: "d1", status: "DISPUTED", amount: 20000 }),
  row({ disputeId: "d2", status: "DISPUTED", amount: 20000 }),
  row({ disputeId: "d3", status: "NEEDS_ACTION", amount: 14500 }),
  row({ disputeId: "d4", status: "NEEDS_ACTION", amount: 10000 }),
  row({ disputeId: "d5", status: "NEEDS_ACTION", amount: 10000 }),
  row({ disputeId: "d6", status: "NEEDS_ACTION", amount: 10000 }),
  row({ disputeId: "d7", status: "UNDER_REVIEW", amount: 12200 }),
  row({ disputeId: "d8", status: "UNDER_REVIEW", amount: 12000 }),
  row({ disputeId: "d9", status: "WON", amount: 8500 }),
  row({ disputeId: "d10", status: "LOST", amount: 5200 }),
];

describe("getDisputeCounts / getTotalDisputeCount", () => {
  it("buckets DISPUTED and NEEDS_ACTION together as needsAction", () => {
    const counts = getDisputeCounts(SAMPLE);
    expect(counts).toEqual({ needsAction: 6, inReview: 2, won: 1, lost: 1 });
  });

  it("totals to the sum of every bucket", () => {
    expect(getTotalDisputeCount(SAMPLE)).toBe(10);
  });

  it("treats undefined/null/empty input as zero counts", () => {
    expect(getDisputeCounts(undefined)).toEqual({ needsAction: 0, inReview: 0, won: 0, lost: 0 });
    expect(getDisputeCounts(null)).toEqual({ needsAction: 0, inReview: 0, won: 0, lost: 0 });
    expect(getTotalDisputeCount([])).toBe(0);
  });

  it("skips a row with a missing status instead of throwing", () => {
    const withMissing = [...SAMPLE, { ...row({ disputeId: "dX" }), status: undefined as never }];
    expect(() => getDisputeCounts(withMissing)).not.toThrow();
    expect(getTotalDisputeCount(withMissing)).toBe(10);
  });

  it("buckets INSUFFICIENT_DOCUMENTS as needsAction, the merchant still has to act", () => {
    const withInsufficient = [
      ...SAMPLE,
      row({ disputeId: "dY", status: "INSUFFICIENT_DOCUMENTS" }),
    ];
    const counts = getDisputeCounts(withInsufficient);
    expect(counts.needsAction).toBe(7);
    expect(getTotalDisputeCount(withInsufficient)).toBe(11);
  });
});

describe("getDisputeAmounts / getTotalDisputeAmount", () => {
  it("sums the disputed amount per status bucket, matching Section 22's example", () => {
    const amounts = getDisputeAmounts(SAMPLE);
    expect(amounts.needsAction).toBe(84500);
    expect(amounts.inReview).toBe(24200);
    expect(amounts.won).toBe(8500);
    expect(amounts.lost).toBe(5200);
    expect(amounts.currency).toBe("INR");
  });

  it("totals to the sum of the displayed status amounts", () => {
    expect(getTotalDisputeAmount(SAMPLE)).toBe(122400);
  });

  it("treats undefined/empty input as all-zero amounts, never NaN", () => {
    const amounts = getDisputeAmounts(undefined);
    expect(amounts).toEqual({
      needsAction: 0,
      inReview: 0,
      won: 0,
      lost: 0,
      currency: "INR",
      excludedCount: 0,
    });
    expect(getTotalDisputeAmount([])).toBe(0);
  });

  it("treats a missing or non-numeric amount as zero instead of producing NaN", () => {
    const rows = [
      row({ disputeId: "d1", status: "WON", amount: undefined as unknown as number }),
      row({ disputeId: "d2", status: "WON", amount: Number.NaN }),
    ];
    const amounts = getDisputeAmounts(rows);
    expect(amounts.won).toBe(0);
    expect(Number.isNaN(amounts.won)).toBe(false);
  });

  it("never mixes currencies: only the dominant currency's disputes are summed", () => {
    const rows = [
      row({ disputeId: "d1", status: "WON", amount: 100, currency: "INR" }),
      row({ disputeId: "d2", status: "WON", amount: 200, currency: "INR" }),
      row({ disputeId: "d3", status: "WON", amount: 9999, currency: "USD" }),
    ];
    const amounts = getDisputeAmounts(rows);
    expect(amounts.currency).toBe("INR");
    expect(amounts.won).toBe(300);
    expect(amounts.excludedCount).toBe(1);
  });
});

describe("getDominantCurrency", () => {
  it("picks the currency held by the most disputes", () => {
    const rows = [
      row({ disputeId: "d1", currency: "INR" }),
      row({ disputeId: "d2", currency: "INR" }),
      row({ disputeId: "d3", currency: "USD" }),
    ];
    expect(getDominantCurrency(rows)).toBe("INR");
  });

  it("returns undefined for an empty list", () => {
    expect(getDominantCurrency([])).toBeUndefined();
    expect(getDominantCurrency(undefined)).toBeUndefined();
  });
});
