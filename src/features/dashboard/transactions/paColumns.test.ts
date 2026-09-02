import { describe, expect, it } from "vitest";
import {
  getDisplayStatus,
  getDisplayStatusBucket,
  getDisputeStatusMeta,
  getRefundStatusMeta,
} from "@/features/dashboard/transactions/paColumns";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

const BASE: PaTransaction = {
  gid: "gl_o-test1",
  externalStatus: "SUCCESS",
  txnCurrency: "INR",
  totalAmount: "10000.00",
  formattedCreationDateTime: "01/08/2026, 09:00:00",
};

describe("getDisplayStatus", () => {
  it("shows Success for a normal transaction with no refund or dispute", () => {
    expect(getDisplayStatus(BASE)).toEqual({
      label: "Success",
      variant: "success",
      trailIcon: "check",
    });
  });

  it("shows Refunded for a partial refund (the vocabulary no longer distinguishes partial from full)", () => {
    const txn: PaTransaction = {
      ...BASE,
      refunds: [
        {
          id: "r1",
          transactionId: "gl_o-test1",
          amount: 2500,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "02/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn)).toEqual({ label: "Refunded", variant: "muted" });
  });

  it("shows Refunded for a full refund reached via multiple partials", () => {
    const txn: PaTransaction = {
      ...BASE,
      refunds: [
        {
          id: "r1",
          transactionId: "gl_o-test1",
          amount: 2500,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "02/08/2026, 09:00:00",
        },
        {
          id: "r2",
          transactionId: "gl_o-test1",
          amount: 7500,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "03/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn)).toEqual({ label: "Refunded", variant: "muted" });
  });

  it("shows the generic Disputed chip for a full active dispute with no refund", () => {
    const txn: PaTransaction = {
      ...BASE,
      disputes: [
        {
          id: "d1",
          transactionId: "gl_o-test1",
          amount: 10000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "02/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn)).toEqual({
      label: "Disputed",
      variant: "warning",
      tooltip: "Respond before the deadline",
    });
  });

  it("combines a partial refund with an active dispute into Refunded and disputed", () => {
    const txn: PaTransaction = {
      ...BASE,
      refunds: [
        {
          id: "r1",
          transactionId: "gl_o-test1",
          amount: 2500,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "02/08/2026, 09:00:00",
        },
      ],
      disputes: [
        {
          id: "d1",
          transactionId: "gl_o-test1",
          amount: 2000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "03/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn).label).toBe("Refunded and disputed");
    expect(getDisplayStatus(txn).variant).toBe("warning");
    expect(getDisplayStatus(txn).tooltip).toBeUndefined();
  });

  it("does not auto-reduce a full dispute after a partial refund and still combines into Refunded and disputed", () => {
    const txn: PaTransaction = {
      ...BASE,
      totalAmount: "10000.00",
      refunds: [
        {
          id: "r1",
          transactionId: "gl_o-test1",
          amount: 2500,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "02/08/2026, 09:00:00",
        },
      ],
      disputes: [
        {
          id: "d1",
          transactionId: "gl_o-test1",
          amount: 10000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "03/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn).label).toBe("Refunded and disputed");
  });

  it("keeps a resolved CLEARED dispute's own outcome, unaffected by an independent refund", () => {
    const txn: PaTransaction = {
      ...BASE,
      disputes: [
        {
          id: "d1",
          transactionId: "gl_o-test1",
          amount: 340,
          currency: "INR",
          reason: "Duplicate processing",
          reasonCode: "12.6",
          description: "desc",
          status: "CLEARED",
          raisedOn: "02/08/2026, 09:00:00",
          resolvedOn: "05/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn)).toEqual({
      label: "Dispute cleared",
      variant: "success",
      trailIcon: "check",
    });
  });

  it("keeps a resolved CHARGED_BACK dispute's own outcome", () => {
    const txn: PaTransaction = {
      ...BASE,
      disputes: [
        {
          id: "d1",
          transactionId: "gl_o-test1",
          amount: 212.5,
          currency: "INR",
          reason: "Credit not processed",
          reasonCode: "13.6",
          description: "desc",
          status: "CHARGED_BACK",
          raisedOn: "02/08/2026, 09:00:00",
          resolvedOn: "05/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn)).toEqual({
      label: "Charged back",
      variant: "danger",
      trailIcon: "x",
    });
  });

  it("never overlays refund/dispute state on a failed payment", () => {
    const txn: PaTransaction = { ...BASE, externalStatus: "ISSUER_DECLINE" };
    expect(getDisplayStatus(txn).label).toBe("Failed");
  });

  it("never overlays refund/dispute state on a still-pending payment", () => {
    const txn: PaTransaction = { ...BASE, externalStatus: "INPROGRESS" };
    expect(getDisplayStatus(txn).label).toBe("-");
  });

  it("routes a dispute pseudo-row's externalStatus through the dispute vocabulary, not the transaction one", () => {
    const txn: PaTransaction = {
      ...BASE,
      linkedRecordType: "dispute",
      externalStatus: "NEEDS_RESPONSE",
    };
    expect(getDisplayStatus(txn)).toEqual(getDisputeStatusMeta("NEEDS_RESPONSE"));
    expect(getDisplayStatus(txn).label).toBe("Needs response");
  });

  it("routes a refund pseudo-row's externalStatus through the refund vocabulary, not the transaction one", () => {
    const txn: PaTransaction = {
      ...BASE,
      linkedRecordType: "refund",
      externalStatus: "COMPLETED",
    };
    expect(getDisplayStatus(txn)).toEqual(getRefundStatusMeta("COMPLETED"));
    expect(getDisplayStatus(txn).label).toBe("Completed");
  });
});

describe("getDisputeStatusMeta / getRefundStatusMeta: own-vocabulary lookups", () => {
  it("NEEDS_RESPONSE covers what used to be split across DISPUTED and NEEDS_ACTION", () => {
    expect(getDisputeStatusMeta("NEEDS_RESPONSE").label).toBe("Needs response");
  });

  it("MORE_EVIDENCE_NEEDED is its own distinct label, never folded into Needs response", () => {
    const meta = getDisputeStatusMeta("MORE_EVIDENCE_NEEDED");
    expect(meta.label).toBe("More evidence needed");
    expect(meta.label).not.toBe("Needs response");
  });

  it("exposes the 3-state refund vocabulary (renamed from PENDING/SUCCEEDED)", () => {
    expect(getRefundStatusMeta("PROCESSING")).toEqual({ label: "Processing", variant: "info" });
    expect(getRefundStatusMeta("COMPLETED")).toEqual({
      label: "Completed",
      variant: "success",
      trailIcon: "check",
    });
    expect(getRefundStatusMeta("FAILED")).toEqual({
      label: "Failed",
      variant: "danger",
      trailIcon: "x",
    });
  });

  it("a dispute stuck needing more evidence still buckets as disputed, shown as the generic Disputed chip", () => {
    const txn: PaTransaction = {
      ...BASE,
      disputes: [
        {
          id: "d1",
          transactionId: "gl_o-test1",
          amount: 2000,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "MORE_EVIDENCE_NEEDED",
          raisedOn: "03/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatusBucket(txn)).toBe("disputed");
    expect(getDisplayStatus(txn).label).toBe("Disputed");
  });
});

describe("getDisplayStatusBucket", () => {
  it("buckets a normal transaction as success", () => {
    expect(getDisplayStatusBucket(BASE)).toBe("success");
  });

  it("buckets any refund amount as refunded", () => {
    const txn: PaTransaction = {
      ...BASE,
      refunds: [
        {
          id: "r1",
          transactionId: "gl_o-test1",
          amount: 100,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "02/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatusBucket(txn)).toBe("refunded");
  });

  it("buckets an active dispute as disputed even when a refund also exists", () => {
    const txn: PaTransaction = {
      ...BASE,
      refunds: [
        {
          id: "r1",
          transactionId: "gl_o-test1",
          amount: 100,
          currency: "INR",
          status: "COMPLETED",
          createdAt: "02/08/2026, 09:00:00",
        },
      ],
      disputes: [
        {
          id: "d1",
          transactionId: "gl_o-test1",
          amount: 100,
          currency: "INR",
          reason: "Fraudulent",
          reasonCode: "10.4",
          description: "desc",
          status: "NEEDS_RESPONSE",
          raisedOn: "03/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatusBucket(txn)).toBe("disputed");
  });

  it("buckets failed/pending payments by their own raw status regardless of refunds/disputes", () => {
    expect(getDisplayStatusBucket({ ...BASE, externalStatus: "ISSUER_DECLINE" })).toBe("failed");
    expect(getDisplayStatusBucket({ ...BASE, externalStatus: "INPROGRESS" })).toBe("pending");
  });
});
