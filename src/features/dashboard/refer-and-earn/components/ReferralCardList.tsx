"use client";

import { Shimmer, StatusBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatCurrency, formatEpochDate } from "@/lib/utils/format";
import {
  formatReferralReward,
  getReferralStatusMeta,
  isRewardReleased,
} from "@/features/dashboard/refer-and-earn/columns";
import type { Referral, ReferralRedemption } from "@/features/dashboard/refer-and-earn/types";

export function ReferralCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Shimmer className="h-5 w-32" />
        <Shimmer className="ml-auto h-5 w-24" rounded="full" />
      </div>
      {/* Email and reward, the two things the trailing row actually holds — the
          button-sized block that used to sit here went with the Remind action,
          and leaving it would have the skeleton promise a control the loaded
          card no longer has. */}
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <Shimmer className="h-3 w-40" />
        <Shimmer className="h-3.5 w-16" />
      </div>
    </div>
  );
}

// Same values as the table's columns — name, status, reward, email — just
// stacked instead of laid out in cells, matching ClientCardList's rhythm.
export function ReferralCard({ row }: { row: Referral }) {
  const { label, variant, trailIcon } = getReferralStatusMeta(row.status);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
          {row.fullName}
        </span>
        <StatusBadge
          variant={variant}
          label={label}
          trailIcon={trailIcon}
          size="sm"
          className="ml-auto shrink-0"
        />
      </div>

      {/* Trailing row: email at the left, reward at the right — the reward is
          the figure the merchant scans for, so it keeps its place beside the
          edge. The email takes the slack and truncates; the figure never
          shrinks. */}
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[12px] text-muted-foreground">{row.emailId}</span>
        <span
          className={cn(
            "shrink-0 text-[13px] tabular-nums",
            isRewardReleased(row) ? "font-semibold text-foreground" : "text-muted-foreground"
          )}
        >
          {formatReferralReward(row)}
        </span>
      </div>
    </div>
  );
}

// A redemption has no counterparty to name, so the card is the reference number
// over the pair of figures rather than the two-line arrangement above.
export function RedemptionCard({ row }: { row: ReferralRedemption }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="min-w-0 truncate font-mono text-[12px] text-muted-foreground">
          {row.id}
        </span>
        <span className="ml-auto shrink-0 whitespace-nowrap text-[13px] font-semibold tabular-nums text-foreground">
          −{formatCurrency(parseFloat(row.amount), row.currency, "en-US")}
        </span>
      </div>
      <span className="mt-2.5 text-[12px] tabular-nums text-muted-foreground">
        Redeemed on {formatEpochDate(row.createdAt)}
      </span>
    </div>
  );
}
