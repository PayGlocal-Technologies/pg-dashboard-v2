import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";
import type { DisputeResolutionOutcome } from "@/stores/useDisputeResolutions";

/** Applies an in-session dispute resolution (see useDisputeResolutions) to a
 * transaction's own embedded disputes[], updating the resolved dispute's
 * status in place rather than the transaction's externalStatus, which no
 * longer drives the displayed status (see getDisplayStatus). Only ever
 * touches disputes[0], matching this app's one-active-dispute-per-
 * transaction UI. A transaction with no disputes, or no matching override,
 * is returned unchanged rather than mutated. */
export function applyDisputeResolutionOverride(
  row: PaTransaction,
  outcome: DisputeResolutionOutcome | undefined
): PaTransaction {
  if (!outcome) return row;
  const [first, ...rest] = row.disputes ?? [];
  if (!first) return row;
  return {
    ...row,
    disputes: [{ ...first, status: outcome }, ...rest],
  };
}
