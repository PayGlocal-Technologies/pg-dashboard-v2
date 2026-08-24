import { describe, expect, it } from "vitest";
import { toPaTransaction } from "@/features/dashboard/dispute-management/index";
import type { DisputeRow } from "@/features/dashboard/dispute-management/types";

const ROW: DisputeRow = {
  disputeId: "du_test1",
  txnGid: "gl_o-test1",
  status: "NEEDS_ACTION",
  amount: 5400,
  currency: "INR",
  reason: "Subscription cancelled",
  customerName: "Karan Shah",
  email: "karan.shah@example.com",
  cardBrand: "VISA",
  maskedCardNumber: "XXXXXXXXXXXX2290",
  paymentInstrument: "CARDS",
  disputedOn: "06/08/2026, 15:12:09",
  respondBy: "12/08/2026, 15:12:09",
};

describe("toPaTransaction (dispute-management)", () => {
  it("populates disputes[] with this row's OWN reason, not a generic status-keyed guess", () => {
    const txn = toPaTransaction(ROW);
    expect(txn.disputes).toHaveLength(1);
    expect(txn.disputes![0]!.reason).toBe("Subscription cancelled");
    expect(txn.disputes![0]!.id).toBe("du_test1");
    expect(txn.disputes![0]!.amount).toBe(5400);
  });

  it("gives the dispute a real reason code, derived via the shared reason-metadata lookup", () => {
    const txn = toPaTransaction(ROW);
    expect(txn.disputes![0]!.reasonCode).not.toBe("");
    expect(txn.disputes![0]!.reasonCode.length).toBeGreaterThan(0);
  });

  it("never creates a second merchant-facing transaction ID, disputes[0].transactionId matches the row's own txnGid", () => {
    const txn = toPaTransaction(ROW);
    expect(txn.gid).toBe(ROW.txnGid);
    expect(txn.disputes![0]!.transactionId).toBe(ROW.txnGid);
  });
});
