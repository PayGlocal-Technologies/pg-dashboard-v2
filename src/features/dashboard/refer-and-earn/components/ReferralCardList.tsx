"use client";

import { Button, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { cn } from "@/lib/utils";
import { formatCurrency, formatEpochDate } from "@/lib/utils/format";
import {
  formatReferralReward,
  getReferralStatusMeta,
  isRewardReleased,
} from "@/features/dashboard/refer-and-earn/columns";
import type { Referral, ReferralRedemption } from "@/features/dashboard/refer-and-earn/types";

function ReferralCardSkeleton() {
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
function ReferralCard({ row }: { row: Referral }) {
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
function RedemptionCard({ row }: { row: ReferralRedemption }) {
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

/**
 * Everything the two card lists share: the loading skeletons, the empty state,
 * and the pager. Only the card itself differs between them, so only the card is
 * passed in — the shell around it stays one implementation and the two tabs
 * cannot drift apart in spacing or paging behaviour.
 */
interface CardListShellProps {
  isLoading: boolean;
  skeletonCount?: number;
  page: number;
  onPageChange: (page: number) => void;
  totalRows: number;
  pageSize: number;
  emptyTitle: string;
  emptyDescription?: string;
  className?: string;
}

function CardListShell({
  isLoading,
  skeletonCount = 5,
  page,
  onPageChange,
  totalRows,
  pageSize,
  emptyTitle,
  emptyDescription,
  className,
  count,
  children,
}: CardListShellProps & { count: number; children: React.ReactNode }) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className={cn("flex flex-col gap-3 p-4", className)}>
      {isLoading ? (
        Array.from({ length: skeletonCount }).map((_, i) => <ReferralCardSkeleton key={i} />)
      ) : count === 0 ? (
        <PlaceholderState
          variant="no-data"
          size="sm"
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        children
      )}

      {!isLoading && count > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            leftIcon={<Icon name="chevron-left" className="h-3.5 w-3.5" />}
          >
            Prev
          </Button>
          <span className="text-[12px] tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            rightIcon={<Icon name="chevron-right" className="h-3.5 w-3.5" />}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Mobile/tablet stand-in for DataTable, the same arrangement the Transactions,
 * SKU, and Clients pages use (see ClientCardList): `rows` is already the
 * current page's slice, so this only lays it out as cards and adds the pager.
 */
export function ReferralCardList({ rows, ...shell }: CardListShellProps & { rows: Referral[] }) {
  return (
    <CardListShell {...shell} count={rows.length}>
      {rows.map((row) => (
        <ReferralCard key={row.id} row={row} />
      ))}
    </CardListShell>
  );
}

/** The Redeemed tab's mobile/tablet layout. */
export function RedemptionCardList({
  rows,
  ...shell
}: CardListShellProps & { rows: ReferralRedemption[] }) {
  return (
    <CardListShell {...shell} count={rows.length}>
      {rows.map((row) => (
        <RedemptionCard key={row.id} row={row} />
      ))}
    </CardListShell>
  );
}
