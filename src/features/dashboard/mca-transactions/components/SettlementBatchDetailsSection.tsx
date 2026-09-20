"use client";

import { Shimmer } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  SettlementAmountBreakdownCard,
  SettlementDetailsCard,
} from "@/features/dashboard/mca-settlement-report/components/SettlementDetailCards";
import { useSettlementDetail } from "@/features/dashboard/mca-settlement-report/hooks";
import type { McaTransaction } from "@/features/dashboard/mca-transactions/types";

/**
 * The Details / Amount Breakdown pair from the settlement detail view (see
 * SettlementDetailCards, shared verbatim rather than rebuilt), shown on a
 * transaction's own details once it has actually settled — SETTLED or
 * FIRC_SETTLED, the only two statuses `isSettled` on TransactionDetailsPage
 * gates this on.
 *
 * These describe the whole SETTLEMENT BATCH this transaction landed in
 * (gross/deductions/net across every payment settled that day, the bank
 * account it landed in, the transaction count), not this one transaction's
 * own figures — that's SettlementBreakdown, nested inside the timeline's own
 * steps, a different and narrower thing answering "what did I keep on this
 * payment" rather than "what landed in my bank account this settlement". The
 * two are expected to coexist on the same view rather than replace one
 * another.
 *
 * A settlement has no id of its own — an account settles at most once a day,
 * so the pair (merchantId, settlementDate) IS the key, per useSettlementDetail's
 * own doc — and a settled McaTransaction row already carries both halves of
 * that key directly, so this is a straight prop-passing exercise: no new
 * endpoint, the exact same hook and cards the standalone settlement page uses.
 */
export function SettlementBatchDetailsSection({
  row,
  layout = "page",
}: {
  row: McaTransaction;
  /** "page": the two cards run side by side from lg up, matching the
   *  standalone settlement page. "drawer": always stacked — the drawer's
   *  own viewport never has the room a side-by-side pair needs. */
  layout?: "page" | "drawer";
}) {
  const { detail, isLoading, isError } = useSettlementDetail(
    row.merchantId,
    row.settlementDate ?? ""
  );

  // Silent, not an error state of its own: this section is supplementary to
  // the transaction's own details, which are already fully shown above it —
  // a settlement that fails to load just means this one section is absent,
  // not that the whole view should report a failure.
  if (isError) return null;

  // No extra wrapping heading here — SettlementDetailsCard and
  // SettlementAmountBreakdownCard already carry their own "Details"/"Amount
  // Breakdown" section labels, exactly as they do on the standalone
  // settlement page; a third label above both would just repeat what they
  // already say.
  if (isLoading) {
    return (
      <div className={cn("grid gap-4", layout === "page" && "lg:grid-cols-2")}>
        <Shimmer className="h-64 rounded-xl" />
        <Shimmer className="h-64 rounded-xl" />
      </div>
    );
  }

  // Same "-> null" reasoning as the isError branch: a SETTLED row the
  // settlement endpoint hasn't indexed yet (freshly settled, say) just means
  // this section doesn't render, not that anything is wrong.
  if (!detail) return null;

  return (
    <div className={cn("grid gap-4", layout === "page" && "lg:grid-cols-2")}>
      <SettlementDetailsCard detail={detail} />
      <SettlementAmountBreakdownCard detail={detail} />
    </div>
  );
}
