import type { DisputeRawStatus } from "@/features/dashboard/dispute-management/types";

/**
 * The list's tabs. Action required covers everything waiting on the
 * merchant: a new dispute or escalation (at any stage) and a request for
 * more documents. Won and Lost are the final outcomes (disputeStatus.ts).
 */
export const DISPUTE_STATUS_SEGMENTS = [
  { value: "action-required", label: "Action required" },
  { value: "all", label: "All disputes" },
  { value: "under-review", label: "Under review" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
] as const;

export type DisputeStatusSegment = (typeof DISPUTE_STATUS_SEGMENTS)[number]["value"];

/** Raw statuses behind each tab. "all" has no entry, it means no filter. */
export const DISPUTE_SEGMENT_RAW_STATUSES: Record<
  Exclude<DisputeStatusSegment, "all">,
  DisputeRawStatus[]
> = {
  "action-required": ["NEEDS_RESPONSE", "MORE_EVIDENCE_NEEDED", "REOPENED"],
  "under-review": ["UNDER_REVIEW"],
  won: ["CLEARED"],
  lost: ["CHARGED_BACK", "ACCEPTED", "EXPIRED"],
};

/** The Status filter chip's options: each status the merchant sees, so
 *  Insufficient documents can be picked out of Action required. */
export const DISPUTE_STATUS_FILTERS: { value: string; label: string; raw: DisputeRawStatus[] }[] = [
  { value: "action-required", label: "Action required", raw: ["NEEDS_RESPONSE", "REOPENED"] },
  {
    value: "insufficient-documents",
    label: "Insufficient documents",
    raw: ["MORE_EVIDENCE_NEEDED"],
  },
  { value: "under-review", label: "Under review", raw: ["UNDER_REVIEW"] },
  { value: "won", label: "Won", raw: ["CLEARED"] },
  { value: "lost", label: "Lost", raw: ["CHARGED_BACK", "ACCEPTED", "EXPIRED"] },
];

/** Tabs whose rows still have a response deadline, the only ones the table's
 *  "Respond by" column applies to. */
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
