import { describe, expect, it } from "vitest";
import {
  deriveDisputeOnlyTimelineSteps,
  deriveTimelineSteps,
  generateTimelineEvents,
  parseFormattedTimestamp,
} from "@/features/dashboard/transactions/financial/generateTimeline";
import { deriveTransactionDetail } from "@/features/dashboard/transactions/deriveTransactionDetail";
import type {
  DisputeEvent,
  RefundEvent,
  SettlementEvent,
} from "@/features/dashboard/transactions/financial/types";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

const TXN_ID = "gl_o-test1";
const CCY = "INR";

describe("parseFormattedTimestamp", () => {
  it("parses the DD/MM/YYYY, HH:MM:SS format", () => {
    const ms = parseFormattedTimestamp("08/08/2026, 10:22:15");
    const d = new Date(ms);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // August, 0-indexed
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(10);
    expect(d.getMinutes()).toBe(22);
    expect(d.getSeconds()).toBe(15);
  });

  it("returns 0 for an empty or malformed value", () => {
    expect(parseFormattedTimestamp(undefined)).toBe(0);
    expect(parseFormattedTimestamp("")).toBe(0);
    expect(parseFormattedTimestamp("not a date")).toBe(0);
  });

  it("orders two timestamps correctly", () => {
    const earlier = parseFormattedTimestamp("01/08/2026, 09:00:00");
    const later = parseFormattedTimestamp("02/08/2026, 09:00:00");
    expect(earlier).toBeLessThan(later);
  });
});

describe("generateTimelineEvents", () => {
  it("orders events by real timestamp, not push order", () => {
    const refunds: RefundEvent[] = [
      {
        id: "rf-1",
        transactionId: TXN_ID,
        amount: 100,
        currency: CCY,
        status: "COMPLETED",
        createdAt: "10/08/2026, 09:00:00",
      },
    ];
    const disputes: DisputeEvent[] = [
      {
        id: "du-1",
        transactionId: TXN_ID,
        amount: 200,
        currency: CCY,
        reason: "Fraudulent",
        reasonCode: "10.4",
        description: "desc",
        status: "NEEDS_RESPONSE",
        // Raised BEFORE the refund above, even though disputes are pushed
        // after refunds internally, must still sort earlier.
        raisedOn: "05/08/2026, 09:00:00",
      },
    ];

    const events = generateTimelineEvents({
      currency: CCY,
      originalAmount: 1000,
      paymentInitiatedAt: "01/08/2026, 09:00:00",
      paymentBucket: "success",
      refundEvents: refunds,
      disputeEvents: disputes,
      settlementEvents: [],
    });

    const types = events.map((e) => e.type);
    expect(types.indexOf("PAYMENT_INITIATED")).toBeLessThan(types.indexOf("DISPUTE_RAISED"));
    expect(types.indexOf("DISPUTE_RAISED")).toBeLessThan(types.indexOf("REFUND_INITIATED"));
  });

  it("keeps a historical dispute-raised event even after the dispute is cleared", () => {
    const disputes: DisputeEvent[] = [
      {
        id: "du-1",
        transactionId: TXN_ID,
        amount: 200,
        currency: CCY,
        reason: "Fraudulent",
        reasonCode: "10.4",
        description: "desc",
        status: "CLEARED",
        raisedOn: "05/08/2026, 09:00:00",
        resolvedOn: "12/08/2026, 09:00:00",
      },
    ];

    const events = generateTimelineEvents({
      currency: CCY,
      originalAmount: 1000,
      paymentInitiatedAt: "01/08/2026, 09:00:00",
      paymentBucket: "success",
      refundEvents: [],
      disputeEvents: disputes,
      settlementEvents: [],
    });

    const types = events.map((e) => e.type);
    expect(types).toContain("DISPUTE_RAISED");
    expect(types).toContain("DISPUTE_CLEARED");
    expect(types).toContain("FUNDS_REINSTATED");
    expect(types.indexOf("DISPUTE_RAISED")).toBeLessThan(types.indexOf("DISPUTE_CLEARED"));
  });

  it("generates a funds-withdrawn event as a separate entry when a dispute is charged back", () => {
    const disputes: DisputeEvent[] = [
      {
        id: "du-1",
        transactionId: TXN_ID,
        amount: 200,
        currency: CCY,
        reason: "Fraudulent",
        reasonCode: "10.4",
        description: "desc",
        status: "CHARGED_BACK",
        raisedOn: "05/08/2026, 09:00:00",
        resolvedOn: "12/08/2026, 09:00:00",
      },
    ];

    const events = generateTimelineEvents({
      currency: CCY,
      originalAmount: 1000,
      paymentInitiatedAt: "01/08/2026, 09:00:00",
      paymentBucket: "success",
      refundEvents: [],
      disputeEvents: disputes,
      settlementEvents: [],
    });

    const types = events.map((e) => e.type);
    expect(types).toContain("DISPUTE_CHARGED_BACK");
    expect(types).toContain("FUNDS_WITHDRAWN");
  });

  it("generates a funds-withdrawn event when a dispute is accepted by the merchant", () => {
    const disputes: DisputeEvent[] = [
      {
        id: "du-1",
        transactionId: TXN_ID,
        amount: 200,
        currency: CCY,
        reason: "Fraudulent",
        reasonCode: "10.4",
        description: "desc",
        status: "ACCEPTED",
        raisedOn: "05/08/2026, 09:00:00",
        resolvedOn: "12/08/2026, 09:00:00",
      },
    ];

    const events = generateTimelineEvents({
      currency: CCY,
      originalAmount: 1000,
      paymentInitiatedAt: "01/08/2026, 09:00:00",
      paymentBucket: "success",
      refundEvents: [],
      disputeEvents: disputes,
      settlementEvents: [],
    });

    const types = events.map((e) => e.type);
    expect(types).toContain("DISPUTE_ACCEPTED");
    expect(types).toContain("FUNDS_WITHDRAWN");
  });

  it("generates a funds-withdrawn event when a dispute expires unresolved", () => {
    const disputes: DisputeEvent[] = [
      {
        id: "du-1",
        transactionId: TXN_ID,
        amount: 200,
        currency: CCY,
        reason: "Fraudulent",
        reasonCode: "10.4",
        description: "desc",
        status: "EXPIRED",
        raisedOn: "05/08/2026, 09:00:00",
        resolvedOn: "12/08/2026, 09:00:00",
      },
    ];

    const events = generateTimelineEvents({
      currency: CCY,
      originalAmount: 1000,
      paymentInitiatedAt: "01/08/2026, 09:00:00",
      paymentBucket: "success",
      refundEvents: [],
      disputeEvents: disputes,
      settlementEvents: [],
    });

    const types = events.map((e) => e.type);
    expect(types).toContain("DISPUTE_EXPIRED");
    expect(types).toContain("FUNDS_WITHDRAWN");
  });

  it("includes a payment-settled event per settlement, not just the first", () => {
    const settlements: SettlementEvent[] = [
      {
        id: "st-1",
        transactionId: TXN_ID,
        amount: 600,
        currency: CCY,
        status: "SETTLED",
        settledOnDate: "03/08/2026, 09:00:00",
      },
      {
        id: "st-2",
        transactionId: TXN_ID,
        amount: 400,
        currency: CCY,
        status: "SETTLED",
        settledOnDate: "04/08/2026, 09:00:00",
      },
    ];

    const events = generateTimelineEvents({
      currency: CCY,
      originalAmount: 1000,
      paymentInitiatedAt: "01/08/2026, 09:00:00",
      paymentBucket: "success",
      refundEvents: [],
      disputeEvents: [],
      settlementEvents: settlements,
    });

    expect(events.filter((e) => e.type === "PAYMENT_SETTLED")).toHaveLength(2);
  });

  it("marks a failed payment without a captured event", () => {
    const events = generateTimelineEvents({
      currency: CCY,
      originalAmount: 1000,
      paymentInitiatedAt: "01/08/2026, 09:00:00",
      paymentBucket: "failed",
      refundEvents: [],
      disputeEvents: [],
      settlementEvents: [],
    });

    const types = events.map((e) => e.type);
    expect(types).toContain("PAYMENT_FAILED");
    expect(types).not.toContain("PAYMENT_CAPTURED");
  });

  it("marks an expired payment with a PAYMENT_EXPIRED event, no captured/failed event", () => {
    const events = generateTimelineEvents({
      currency: CCY,
      originalAmount: 1000,
      paymentInitiatedAt: "01/08/2026, 09:00:00",
      paymentBucket: "expired",
      refundEvents: [],
      disputeEvents: [],
      settlementEvents: [],
    });

    const types = events.map((e) => e.type);
    expect(types).toContain("PAYMENT_EXPIRED");
    expect(types).not.toContain("PAYMENT_CAPTURED");
    expect(types).not.toContain("PAYMENT_FAILED");
  });

  it("produces only PAYMENT_INITIATED for an in-flight payment (no captured/failed/expired event)", () => {
    const events = generateTimelineEvents({
      currency: CCY,
      originalAmount: 1000,
      paymentInitiatedAt: "01/08/2026, 09:00:00",
      paymentBucket: "in_flight",
      refundEvents: [],
      disputeEvents: [],
      settlementEvents: [],
    });

    const types = events.map((e) => e.type);
    expect(types).toEqual(["PAYMENT_INITIATED"]);
  });
});

const BASE_TXN: PaTransaction = {
  gid: "gl_o-test1",
  externalStatus: "SUCCESS",
  txnCurrency: "INR",
  totalAmount: "10000.00",
  formattedCreationDateTime: "01/08/2026, 12:00:00",
};

describe("deriveDisputeOnlyTimelineSteps", () => {
  it("returns only the steps belonging to the requested dispute, not a sibling dispute", () => {
    const txn: PaTransaction = {
      ...BASE_TXN,
      disputes: [
        {
          id: "d1",
          transactionId: BASE_TXN.gid!,
          amount: 1000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "CLEARED",
          raisedOn: "02/08/2026, 09:00:00",
          resolvedOn: "10/08/2026, 09:00:00",
        },
        {
          id: "d2",
          transactionId: BASE_TXN.gid!,
          amount: 500,
          currency: "INR",
          reason: "Duplicate processing",
          reasonCode: "12.6",
          description: "desc2",
          status: "CHARGED_BACK",
          raisedOn: "12/08/2026, 09:00:00",
          resolvedOn: "20/08/2026, 09:00:00",
        },
      ],
    };
    const financials = deriveTransactionDetail(txn).financials;

    const d1Steps = deriveDisputeOnlyTimelineSteps(financials, "d1");
    expect(d1Steps.map((s) => s.label)).toEqual(["Dispute raised", "Dispute cleared"]);

    const d2Steps = deriveDisputeOnlyTimelineSteps(financials, "d2");
    expect(d2Steps.map((s) => s.label)).toEqual(["Dispute raised", "Dispute charged back"]);
  });

  it("includes the current in-progress step for an active dispute, scoped to its own id", () => {
    const txn: PaTransaction = {
      ...BASE_TXN,
      disputes: [
        {
          id: "d1",
          transactionId: BASE_TXN.gid!,
          amount: 1000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "02/08/2026, 09:00:00",
          respondBy: "20/08/2026, 09:00:00",
        },
      ],
    };
    const steps = deriveDisputeOnlyTimelineSteps(deriveTransactionDetail(txn).financials, "d1");
    expect(steps.map((s) => s.label)).toEqual(["Dispute raised", "Needs response"]);
  });

  it("returns an empty list for an unknown dispute id, never falling back to another dispute's steps", () => {
    const txn: PaTransaction = {
      ...BASE_TXN,
      disputes: [
        {
          id: "d1",
          transactionId: BASE_TXN.gid!,
          amount: 1000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "02/08/2026, 09:00:00",
        },
      ],
    };
    const steps = deriveDisputeOnlyTimelineSteps(
      deriveTransactionDetail(txn).financials,
      "does-not-exist"
    );
    expect(steps).toEqual([]);
  });
});

describe("deriveTimelineSteps: PayGlocal review -> bank review -> more evidence needed", () => {
  it("shows a plain Under review trailing step while PayGlocal's own review is in progress (no reviewPhase set)", () => {
    const txn: PaTransaction = {
      ...BASE_TXN,
      disputes: [
        {
          id: "d1",
          transactionId: BASE_TXN.gid!,
          amount: 1000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "UNDER_REVIEW",
          raisedOn: "02/08/2026, 09:00:00",
          documents: ["evidence.pdf"],
        },
      ],
    };
    const steps = deriveTimelineSteps(deriveTransactionDetail(txn).financials);
    expect(steps.map((s) => s.label)).toContain("Under review");
    expect(steps.map((s) => s.label)).not.toContain("Bank review");
  });

  it("shows a Bank review trailing step once forwarded to the issuing bank (reviewPhase BANK_REVIEW)", () => {
    const txn: PaTransaction = {
      ...BASE_TXN,
      disputes: [
        {
          id: "d1",
          transactionId: BASE_TXN.gid!,
          amount: 1000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "UNDER_REVIEW",
          raisedOn: "02/08/2026, 09:00:00",
          documents: ["evidence.pdf"],
          reviewPhase: "BANK_REVIEW",
        },
      ],
    };
    const steps = deriveTimelineSteps(deriveTransactionDetail(txn).financials);
    expect(steps.map((s) => s.label)).toContain("Bank review");
    expect(steps.map((s) => s.label)).not.toContain("Under review");
  });

  it("shows a More evidence needed trailing step distinct from Needs response", () => {
    const txn: PaTransaction = {
      ...BASE_TXN,
      disputes: [
        {
          id: "d1",
          transactionId: BASE_TXN.gid!,
          amount: 1000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "MORE_EVIDENCE_NEEDED",
          raisedOn: "02/08/2026, 09:00:00",
          documents: ["evidence.pdf"],
        },
      ],
    };
    const steps = deriveTimelineSteps(deriveTransactionDetail(txn).financials);
    expect(steps.map((s) => s.label)).toContain("More evidence needed");
    expect(steps.map((s) => s.label)).not.toContain("Needs response");
  });
});
