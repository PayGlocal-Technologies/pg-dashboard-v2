import { describe, expect, it } from "vitest";
import {
  buildDisputeLinkedRow,
  buildLinkedChildRows,
  buildParentLinkedRow,
  buildRefundLinkedRow,
  flattenDisputeRows,
  flattenRefundRows,
  getDisputeDetailLinkedRows,
  getRefundDetailLinkedRows,
  refundStatusToExternalStatus,
} from "@/features/dashboard/transactions/linkedChildRecords";
import type { DisputeEvent, RefundEvent } from "@/features/dashboard/transactions/financial/types";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

const PARENT: PaTransaction = {
  gid: "gl_o-parent1",
  externalStatus: "SUCCESS",
  txnCurrency: "INR",
  totalAmount: "20000.00",
  formattedCreationDateTime: "01/08/2026, 09:00:00",
  firstName: "Karan",
  lastName: "Shah",
  encEmailId: "karan.shah@example.com",
  paymentInstrument: "CARDS",
  cardBrand: "VISA",
};

const REFUND: RefundEvent = {
  id: "gl_o-parent1-refund-1",
  transactionId: "gl_o-parent1",
  amount: 3000,
  currency: "INR",
  status: "SUCCEEDED",
  createdAt: "03/08/2026, 09:00:00",
};

const DISPUTE: DisputeEvent = {
  id: "du_parent1",
  transactionId: "gl_o-parent1",
  amount: 4000,
  currency: "INR",
  reason: "Fraudulent",
  reasonCode: "10.4",
  description: "desc",
  status: "DISPUTED",
  raisedOn: "05/08/2026, 09:00:00",
};

describe("buildRefundLinkedRow", () => {
  it("never creates a new merchant-facing transaction ID, gid stays the parent's own", () => {
    const row = buildRefundLinkedRow(REFUND, PARENT);
    expect(row.gid).toBe(PARENT.gid);
  });

  it("shows the refund's own amount/currency/date, not the parent's", () => {
    const row = buildRefundLinkedRow(REFUND, PARENT);
    expect(row.totalAmount).toBe("3000");
    expect(row.formattedCreationDateTime).toBe("03/08/2026, 09:00:00");
  });

  it("tags the row so navigation can route to the refund's own detail view", () => {
    const row = buildRefundLinkedRow(REFUND, PARENT);
    expect(row.linkedRecordType).toBe("refund");
    expect(row.linkedRecordId).toBe(REFUND.id);
  });

  it("clears the row's own refunds/disputes/settlements so it never masquerades as a full transaction", () => {
    const row = buildRefundLinkedRow(REFUND, PARENT);
    expect(row.refunds).toBeUndefined();
    expect(row.disputes).toBeUndefined();
    expect(row.settlements).toBeUndefined();
  });

  it("inherits customer/payment method context from the parent", () => {
    const row = buildRefundLinkedRow(REFUND, PARENT);
    expect(row.firstName).toBe("Karan");
    expect(row.cardBrand).toBe("VISA");
  });
});

describe("refundStatusToExternalStatus", () => {
  it("maps every refund status to a real, existing PA_STATUS_META key", () => {
    expect(refundStatusToExternalStatus("SUCCEEDED")).toBe("REFUNDED");
    expect(refundStatusToExternalStatus("PENDING")).toBe("SENT_FOR_REFUND");
    expect(refundStatusToExternalStatus("FAILED")).toBe("REFUND_FAILED");
  });
});

describe("buildDisputeLinkedRow", () => {
  it("never creates a new transaction ID and shows the dispute's own amount/date/status", () => {
    const row = buildDisputeLinkedRow(DISPUTE, PARENT);
    expect(row.gid).toBe(PARENT.gid);
    expect(row.totalAmount).toBe("4000");
    expect(row.externalStatus).toBe("DISPUTED");
    expect(row.linkedRecordType).toBe("dispute");
    expect(row.linkedRecordId).toBe(DISPUTE.id);
  });
});

describe("buildLinkedChildRows", () => {
  it("returns refunds before disputes, one row per child event", () => {
    const rows = buildLinkedChildRows(PARENT, [REFUND], [DISPUTE]);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.linkedRecordType).toBe("refund");
    expect(rows[1]!.linkedRecordType).toBe("dispute");
  });

  it("returns an empty list when there are no children, never a placeholder row", () => {
    expect(buildLinkedChildRows(PARENT, [], [])).toEqual([]);
  });

  it("includes every refund individually when there are multiple, never collapsed into one", () => {
    const refund2: RefundEvent = { ...REFUND, id: "gl_o-parent1-refund-2", amount: 2000 };
    const rows = buildLinkedChildRows(PARENT, [REFUND, refund2], []);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.linkedRecordId)).toEqual([REFUND.id, refund2.id]);
  });
});

describe("buildParentLinkedRow", () => {
  it("strips linkedRecordType/linkedRecordId so it always resolves back to the parent's own page", () => {
    const childRow = buildRefundLinkedRow(REFUND, PARENT);
    const parentRow = buildParentLinkedRow(childRow);
    expect(parentRow.linkedRecordType).toBeUndefined();
    expect(parentRow.linkedRecordId).toBeUndefined();
  });
});

describe("getRefundDetailLinkedRows", () => {
  it("shows the parent plus a sibling dispute belonging to the SAME parent", () => {
    const parentWithBoth: PaTransaction = { ...PARENT, refunds: [REFUND], disputes: [DISPUTE] };
    const rows = getRefundDetailLinkedRows(parentWithBoth);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.linkedRecordType).toBeUndefined(); // the parent row
    expect(rows[1]!.linkedRecordType).toBe("dispute");
  });

  it("shows only the parent when there is no sibling dispute, no empty placeholder", () => {
    const parentRefundOnly: PaTransaction = { ...PARENT, refunds: [REFUND] };
    const rows = getRefundDetailLinkedRows(parentRefundOnly);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.gid).toBe(PARENT.gid);
  });
});

describe("getDisputeDetailLinkedRows", () => {
  it("shows the parent plus a sibling refund belonging to the SAME parent", () => {
    const parentWithBoth: PaTransaction = { ...PARENT, refunds: [REFUND], disputes: [DISPUTE] };
    const rows = getDisputeDetailLinkedRows(parentWithBoth);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.linkedRecordType).toBeUndefined(); // the parent row
    expect(rows[1]!.linkedRecordType).toBe("refund");
  });

  it("shows only the parent when there is no sibling refund, no empty placeholder", () => {
    const parentDisputeOnly: PaTransaction = { ...PARENT, disputes: [DISPUTE] };
    const rows = getDisputeDetailLinkedRows(parentDisputeOnly);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.gid).toBe(PARENT.gid);
  });

  it("never lists a sibling dispute, only the parent and refunds", () => {
    const otherDispute: DisputeEvent = { ...DISPUTE, id: "du_parent1_second" };
    const parentWithTwoDisputes: PaTransaction = {
      ...PARENT,
      refunds: [REFUND],
      disputes: [DISPUTE, otherDispute],
    };
    const rows = getDisputeDetailLinkedRows(parentWithTwoDisputes);
    expect(rows.some((r) => r.linkedRecordType === "dispute")).toBe(false);
  });
});

describe("flattenRefundRows / flattenDisputeRows (Transactions table Refunded/Disputed segments)", () => {
  const otherParent: PaTransaction = {
    gid: "gl_o-parent2",
    externalStatus: "SUCCESS",
    txnCurrency: "USD",
    totalAmount: "500.00",
    formattedCreationDateTime: "02/08/2026, 09:00:00",
  };
  const otherRefund: RefundEvent = {
    id: "gl_o-parent2-refund-1",
    transactionId: "gl_o-parent2",
    amount: 100,
    currency: "USD",
    status: "SUCCEEDED",
    createdAt: "04/08/2026, 09:00:00",
  };

  it("flattens refunds across multiple transactions, each keeping its own parent gid", () => {
    const parentWithRefund: PaTransaction = { ...PARENT, refunds: [REFUND] };
    const other: PaTransaction = { ...otherParent, refunds: [otherRefund] };
    const rows = flattenRefundRows([parentWithRefund, other]);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.gid).toBe("gl_o-parent1");
    expect(rows[1]!.gid).toBe("gl_o-parent2");
  });

  it("never attributes one transaction's refund to a different transaction's gid", () => {
    const parentWithRefund: PaTransaction = { ...PARENT, refunds: [REFUND] };
    const other: PaTransaction = { ...otherParent, refunds: [otherRefund] };
    const rows = flattenRefundRows([parentWithRefund, other]);
    const forParent1 = rows.find((r) => r.linkedRecordId === REFUND.id);
    expect(forParent1?.gid).toBe("gl_o-parent1");
  });

  it("flattens disputes across multiple transactions similarly", () => {
    const parentWithDispute: PaTransaction = { ...PARENT, disputes: [DISPUTE] };
    const rows = flattenDisputeRows([parentWithDispute, otherParent]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.gid).toBe("gl_o-parent1");
  });

  it("returns an empty list when no transactions have that child type", () => {
    expect(flattenRefundRows([otherParent])).toEqual([]);
  });
});
