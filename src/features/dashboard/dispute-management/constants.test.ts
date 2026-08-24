import { describe, expect, it } from "vitest";
import {
  DISPUTE_SEGMENT_RAW_STATUSES,
  DISPUTE_STATUS_SEGMENTS,
} from "@/features/dashboard/dispute-management/constants";

describe("DISPUTE_SEGMENT_RAW_STATUSES", () => {
  it("the action-required segment includes both DISPUTED and NEEDS_ACTION, they display identically", () => {
    expect(DISPUTE_SEGMENT_RAW_STATUSES["action-required"]).toEqual(["DISPUTED", "NEEDS_ACTION"]);
  });

  it("has its own dedicated segment for INSUFFICIENT_DOCUMENTS, never folded into action-required", () => {
    expect(DISPUTE_SEGMENT_RAW_STATUSES["insufficient-documents"]).toEqual([
      "INSUFFICIENT_DOCUMENTS",
    ]);
    expect(DISPUTE_SEGMENT_RAW_STATUSES["action-required"]).not.toContain("INSUFFICIENT_DOCUMENTS");
  });

  it("every non-all segment value has a matching raw-status entry", () => {
    for (const segment of DISPUTE_STATUS_SEGMENTS) {
      if (segment.value === "all") continue;
      expect(DISPUTE_SEGMENT_RAW_STATUSES[segment.value]).toBeDefined();
    }
  });
});
