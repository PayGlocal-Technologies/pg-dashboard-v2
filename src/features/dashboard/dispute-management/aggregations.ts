import { sumAmounts } from "@/features/dashboard/transactions/financial/money";
import type { DisputeRawStatus, DisputeRow } from "@/features/dashboard/dispute-management/types";

/** 5-bucket grouping for the Dispute Overview donut/stat cards, centralized
 * here instead of re-derived in each caller. NEEDS_RESPONSE/
 * MORE_EVIDENCE_NEEDED/REOPENED all fold into "needsAction" (all three mean
 * the merchant must act). ACCEPTED is its own bucket, deliberately never
 * folded into "lost"/CHARGED_BACK, the status-vocabulary spec's own note:
 * "Accepted is reported separately from Charged back so win-rate stays
 * honest. A merchant who accepted forty disputes has not lost forty
 * arguments." EXPIRED folds into "lost" since the spec treats it as a
 * charged-back money outcome. */
export type DisputeOverviewBucketKey = "needsAction" | "inReview" | "won" | "lost" | "accepted";

export const DISPUTE_OVERVIEW_BUCKETS: {
  key: DisputeOverviewBucketKey;
  label: string;
  color: string;
}[] = [
  { key: "needsAction", label: "Action required", color: "#f59e0b" },
  { key: "inReview", label: "In review", color: "#3b82f6" },
  { key: "won", label: "Cleared", color: "#10b981" },
  { key: "lost", label: "Charged back", color: "#ef4444" },
  { key: "accepted", label: "Accepted", color: "#a855f7" },
];

function bucketForStatus(status: DisputeRawStatus): DisputeOverviewBucketKey {
  switch (status) {
    case "NEEDS_RESPONSE":
    case "MORE_EVIDENCE_NEEDED":
    case "REOPENED":
      return "needsAction";
    case "UNDER_REVIEW":
      return "inReview";
    case "CLEARED":
      return "won";
    case "CHARGED_BACK":
    case "EXPIRED":
      return "lost";
    case "ACCEPTED":
      return "accepted";
    default:
      return "needsAction";
  }
}

export interface DisputeOverviewCounts {
  needsAction: number;
  inReview: number;
  won: number;
  lost: number;
  accepted: number;
}

/** Number of disputes per status bucket. Rows with a missing/unrecognized
 * status are skipped rather than thrown on, see Section 13's "missing
 * status" edge case, an undefined/null `disputes` list is treated as empty. */
export function getDisputeCounts(disputes: DisputeRow[] | undefined | null): DisputeOverviewCounts {
  const counts: DisputeOverviewCounts = {
    needsAction: 0,
    inReview: 0,
    won: 0,
    lost: 0,
    accepted: 0,
  };
  for (const row of disputes ?? []) {
    if (!row?.status) continue;
    counts[bucketForStatus(row.status)] += 1;
  }
  return counts;
}

export function getTotalDisputeCount(disputes: DisputeRow[] | undefined | null): number {
  const counts = getDisputeCounts(disputes);
  return counts.needsAction + counts.inReview + counts.won + counts.lost + counts.accepted;
}

/** The currency held by the most disputes in the given list (ties broken by
 * first occurrence), used as the single currency Amount-view totals are
 * expressed in. Never mixes currencies when summing (Section 30 of the
 * Unified Transaction ID & Financial Event Logic spec applies here too),
 * disputes in any other currency are excluded from the amount buckets
 * below rather than being added to a currency they don't belong to. */
export function getDominantCurrency(disputes: DisputeRow[] | undefined | null): string | undefined {
  const list = disputes ?? [];
  const countByCurrency = new Map<string, number>();
  for (const row of list) {
    if (!row?.currency) continue;
    countByCurrency.set(row.currency, (countByCurrency.get(row.currency) ?? 0) + 1);
  }
  let dominant: string | undefined;
  let bestCount = 0;
  for (const row of list) {
    if (!row?.currency) continue;
    const count = countByCurrency.get(row.currency) ?? 0;
    if (count > bestCount) {
      bestCount = count;
      dominant = row.currency;
    }
  }
  return dominant;
}

export interface DisputeOverviewAmounts {
  needsAction: number;
  inReview: number;
  won: number;
  lost: number;
  accepted: number;
  /** The single currency every amount above is expressed in, see
   * getDominantCurrency. Falls back to "INR" (formatCurrency's own default)
   * when the list is empty or no row has a currency. */
  currency: string;
  /** Disputes excluded from the amounts above because they're in a
   * different currency than `currency`, kept for callers/tests that need to
   * know data was excluded rather than silently vanishing. */
  excludedCount: number;
}

/** Total disputed amount per status bucket, in the dominant currency only.
 * Missing/NaN amounts are treated as 0 rather than propagating (Section 13),
 * a currency mismatch never gets summed in (Section 15/30). */
export function getDisputeAmounts(
  disputes: DisputeRow[] | undefined | null
): DisputeOverviewAmounts {
  const list = disputes ?? [];
  const currency = getDominantCurrency(list) ?? "INR";
  const totals: Record<DisputeOverviewBucketKey, number[]> = {
    needsAction: [],
    inReview: [],
    won: [],
    lost: [],
    accepted: [],
  };
  let excludedCount = 0;

  for (const row of list) {
    if (!row?.status) continue;
    if (row.currency !== currency) {
      excludedCount += 1;
      continue;
    }
    const amount = typeof row.amount === "number" && Number.isFinite(row.amount) ? row.amount : 0;
    totals[bucketForStatus(row.status)].push(amount);
  }

  return {
    needsAction: sumAmounts(totals.needsAction),
    inReview: sumAmounts(totals.inReview),
    won: sumAmounts(totals.won),
    lost: sumAmounts(totals.lost),
    accepted: sumAmounts(totals.accepted),
    currency,
    excludedCount,
  };
}

export function getTotalDisputeAmount(disputes: DisputeRow[] | undefined | null): number {
  const amounts = getDisputeAmounts(disputes);
  return sumAmounts([
    amounts.needsAction,
    amounts.inReview,
    amounts.won,
    amounts.lost,
    amounts.accepted,
  ]);
}
