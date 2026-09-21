import type { DisputeRawStatus } from "@/features/dashboard/dispute-management/types";

export const DISPUTE_STATUS_SEGMENTS = [
  { value: "action-required", label: "Action required" },
  { value: "under-review", label: "Under review" },
  { value: "all", label: "All disputes" },
  { value: "accepted", label: "Accepted" },
  { value: "charged-back", label: "Charged back" },
] as const;

export type DisputeStatusSegment = (typeof DISPUTE_STATUS_SEGMENTS)[number]["value"];

/** Raw statuses behind each segment (mirrors STATUS_BUCKET_RAW_VALUES's
 * pattern in paColumns.tsx). "all" has no entry, it means no filter.
 *
 * MORE_EVIDENCE_NEEDED, REOPENED, CLEARED and EXPIRED no longer have their
 * own tab (trimmed down from the original 9-segment set), but the raw
 * statuses themselves still exist in the data — those rows just surface
 * under "All disputes" rather than a dedicated segment. MORE_EVIDENCE_NEEDED
 * and REOPENED fold into "action-required" (both still mean the merchant
 * must act) so they aren't orphaned from every segment filter. */
export const DISPUTE_SEGMENT_RAW_STATUSES: Record<
  Exclude<DisputeStatusSegment, "all">,
  DisputeRawStatus[]
> = {
  "action-required": ["NEEDS_RESPONSE", "MORE_EVIDENCE_NEEDED", "REOPENED"],
  "under-review": ["UNDER_REVIEW"],
  "charged-back": ["CHARGED_BACK"],
  accepted: ["ACCEPTED"],
};

/** Segments whose rows still need a merchant response, the only ones the
 * table's "Respond by" column applies to. Under review disputes already had
 * evidence submitted, so they have no response deadline left to show. */
export const RESPOND_BY_SEGMENTS: DisputeStatusSegment[] = ["action-required"];

export const DISPUTE_REASONS = [
  "Fraudulent",
  "Product not received",
  "Duplicate charge",
  "Subscription cancelled",
  "Other reason",
] as const;

export const DISPUTE_REASON_OPTIONS = DISPUTE_REASONS.map((r) => ({ value: r, label: r }));

/** Drives the metrics cards only (see DisputeManagementFeature), same
 * "period selector scoped to the stat cards, not the table" split as the
 * Transactions page's own timeframe tabs vs. its table's own date filter. */
export const DISPUTE_TIMEFRAMES = [
  { value: "today", label: "Today" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "ytd", label: "YTD" },
] as const;

export type DisputeTimeframe = (typeof DISPUTE_TIMEFRAMES)[number]["value"];
