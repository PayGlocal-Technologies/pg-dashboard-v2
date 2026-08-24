import { describe, expect, it } from "vitest";
import { getDisputeReasonMeta } from "@/features/dashboard/transactions/disputeReasonMeta";

describe("getDisputeReasonMeta", () => {
  it("maps Fraudulent to a short merchant-facing label with its reason code", () => {
    const meta = getDisputeReasonMeta("Fraudulent");
    expect(meta.merchantLabel).toBe("Fraudulent transaction");
    expect(meta.reasonCode).toBe("10.4");
    expect(meta.description.length).toBeGreaterThan(0);
  });

  it("maps Duplicate processing (transactions feature) to Duplicate charge", () => {
    expect(getDisputeReasonMeta("Duplicate processing").merchantLabel).toBe("Duplicate charge");
  });

  it("maps Duplicate charge (dispute-management's own vocabulary) to the same short label", () => {
    expect(getDisputeReasonMeta("Duplicate charge").merchantLabel).toBe("Duplicate charge");
  });

  it("maps every dispute-management reason to a real reason code, never leaving it blank", () => {
    const reasons = [
      "Fraudulent",
      "Product not received",
      "Duplicate charge",
      "Subscription cancelled",
      "Other reason",
    ];
    for (const reason of reasons) {
      const meta = getDisputeReasonMeta(reason);
      expect(meta.reasonCode.length).toBeGreaterThan(0);
      expect(meta.merchantLabel.length).toBeGreaterThan(0);
    }
  });

  it("is case/spacing insensitive, same normalization every other status lookup in the app uses", () => {
    expect(getDisputeReasonMeta("duplicate processing").merchantLabel).toBe("Duplicate charge");
    expect(getDisputeReasonMeta("DUPLICATE_PROCESSING").merchantLabel).toBe("Duplicate charge");
  });

  it("falls back to the raw reason string for an unrecognized reason, never throwing", () => {
    const meta = getDisputeReasonMeta("Some new network reason");
    expect(meta.merchantLabel).toBe("Some new network reason");
    expect(meta.reasonCode).toBe("N/A");
  });
});
