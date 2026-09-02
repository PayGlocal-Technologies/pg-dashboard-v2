import { describe, expect, it } from "vitest";
import {
  DISPUTE_SEGMENT_RAW_STATUSES,
  DISPUTE_STATUS_SEGMENTS,
} from "@/features/dashboard/dispute-management/constants";

describe("DISPUTE_SEGMENT_RAW_STATUSES", () => {
  it("the action-required segment is NEEDS_RESPONSE only", () => {
    expect(DISPUTE_SEGMENT_RAW_STATUSES["action-required"]).toEqual(["NEEDS_RESPONSE"]);
  });

  it("has its own dedicated segment for MORE_EVIDENCE_NEEDED, never folded into action-required", () => {
    expect(DISPUTE_SEGMENT_RAW_STATUSES["more-evidence-needed"]).toEqual(["MORE_EVIDENCE_NEEDED"]);
    expect(DISPUTE_SEGMENT_RAW_STATUSES["action-required"]).not.toContain("MORE_EVIDENCE_NEEDED");
  });

  it("every non-all segment value has a matching raw-status entry", () => {
    for (const segment of DISPUTE_STATUS_SEGMENTS) {
      if (segment.value === "all") continue;
      expect(DISPUTE_SEGMENT_RAW_STATUSES[segment.value]).toBeDefined();
    }
  });
});
