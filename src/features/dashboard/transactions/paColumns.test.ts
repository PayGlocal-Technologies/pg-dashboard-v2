import { describe, expect, it } from "vitest";
import {
  getDisplayStatus,
  getDisplayStatusBucket,
  getStatusMeta,
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

  it("shows Partially refunded for a partial refund", () => {
    const txn: PaTransaction = {
      ...BASE,
      refunds: [
        {
          id: "r1",
          transactionId: "gl_o-test1",
          amount: 2500,
          currency: "INR",
          status: "SUCCEEDED",
          createdAt: "02/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn)).toEqual({ label: "Partially refunded", variant: "refund" });
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
          status: "SUCCEEDED",
          createdAt: "02/08/2026, 09:00:00",
        },
        {
          id: "r2",
          transactionId: "gl_o-test1",
          amount: 7500,
          currency: "INR",
          status: "SUCCEEDED",
          createdAt: "03/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn)).toEqual({ label: "Refunded", variant: "refund" });
  });

  it("shows the dispute label for a full active dispute with no refund", () => {
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
          status: "DISPUTED",
          raisedOn: "02/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn)).toEqual({
      label: "Action required",
      variant: "warning",
      trailIcon: undefined,
      tooltip: "Respond within 6 days",
    });
  });

  it("combines a partial refund with an active dispute, dropping neither", () => {
    const txn: PaTransaction = {
      ...BASE,
      refunds: [
        {
          id: "r1",
          transactionId: "gl_o-test1",
          amount: 2500,
          currency: "INR",
          status: "SUCCEEDED",
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
          status: "DISPUTED",
          raisedOn: "03/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn).label).toBe("Partially refunded · Action required");
    expect(getDisplayStatus(txn).variant).toBe("warning");
    expect(getDisplayStatus(txn).tooltip).toBe("Respond within 6 days");
  });

  it("does not auto-reduce a full dispute after a partial refund and still combines the label", () => {
    const txn: PaTransaction = {
      ...BASE,
      totalAmount: "10000.00",
      refunds: [
        {
          id: "r1",
          transactionId: "gl_o-test1",
          amount: 2500,
          currency: "INR",
          status: "SUCCEEDED",
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
          status: "NEEDS_ACTION",
          raisedOn: "03/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn).label).toBe("Partially refunded · Action required");
  });

  it("keeps a resolved WON dispute's own label, unaffected by an independent refund", () => {
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
          status: "WON",
          raisedOn: "02/08/2026, 09:00:00",
          resolvedOn: "05/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn)).toEqual({ label: "Won", variant: "success", trailIcon: "check" });
  });

  it("keeps a resolved LOST dispute's own label", () => {
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
          status: "LOST",
          raisedOn: "02/08/2026, 09:00:00",
          resolvedOn: "05/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatus(txn)).toEqual({ label: "Lost", variant: "danger", trailIcon: "x" });
  });

  it("never overlays refund/dispute state on a failed payment", () => {
    const txn: PaTransaction = { ...BASE, externalStatus: "ISSUER_DECLINE" };
    expect(getDisplayStatus(txn).label).toBe("Issuer decline");
  });

  it("never overlays refund/dispute state on a still-pending payment", () => {
    const txn: PaTransaction = { ...BASE, externalStatus: "INPROGRESS" };
    expect(getDisplayStatus(txn).label).toBe("In progress");
  });

  it("falls back to the raw status for real API data with no structured refunds/disputes", () => {
    const txn: PaTransaction = { ...BASE, externalStatus: "DISPUTED" };
    expect(getDisplayStatus(txn).label).toBe("Action required");
    expect(getDisplayStatus(txn).tooltip).toBe("Respond within 6 days");
  });
});

describe("getStatusMeta: Action required / Insufficient documents vocabulary", () => {
  it("DISPUTED and NEEDS_ACTION both display identically as Action required", () => {
    expect(getStatusMeta("DISPUTED").label).toBe("Action required");
    expect(getStatusMeta("NEEDS_ACTION").label).toBe("Action required");
  });

  it("INSUFFICIENT_DOCUMENTS is its own distinct label, never folded into Action required", () => {
    const meta = getStatusMeta("INSUFFICIENT_DOCUMENTS");
    expect(meta.label).toBe("Insufficient documents");
    expect(meta.label).not.toBe("Action required");
  });

  it("a dispute stuck needing more evidence still buckets as disputed, not a plain failure", () => {
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
          status: "INSUFFICIENT_DOCUMENTS",
          raisedOn: "03/08/2026, 09:00:00",
        },
      ],
    };
    expect(getDisplayStatusBucket(txn)).toBe("disputed");
    expect(getDisplayStatus(txn).label).toBe("Insufficient documents");
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
          status: "SUCCEEDED",
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
          status: "SUCCEEDED",
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
          status: "DISPUTED",
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
