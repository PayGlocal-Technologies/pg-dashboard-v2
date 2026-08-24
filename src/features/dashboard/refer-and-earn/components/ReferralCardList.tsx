"use client";

import { Button, EmptyState, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  canRemind,
  formatReferralReward,
  getReferralStatusMeta,
  ReferralRemindButton,
  type ReferralRemindActions,
} from "@/features/dashboard/refer-and-earn/columns";
import type { Referral } from "@/features/dashboard/refer-and-earn/types";

function ReferralCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Shimmer className="h-5 w-32" />
        <Shimmer className="ml-auto h-5 w-24" rounded="full" />
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <Shimmer className="h-3 w-40" />
        <Shimmer className="h-8 w-24" rounded="lg" />
      </div>
    </div>
  );
}

// Same values as the table's columns — name, status, reward, email, and the
// Remind action — just stacked instead of laid out in cells, matching
// ClientCardList's rhythm.
function ReferralCard({ row, onRemind, remindedIds }: { row: Referral } & ReferralRemindActions) {
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

      {/* Trailing row: email at the left, then the reward and the Remind action
          at the right — the reward is the figure the merchant scans for, so it
          keeps its place beside the edge and the action trails it. The email
          takes the slack and truncates; the pair beside it never shrinks. */}
      <div className="mt-2.5 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[12px] text-muted-foreground">{row.emailId}</span>
        <div className="flex shrink-0 items-center gap-2.5">
          <span
            className={cn(
              "text-[13px] tabular-nums",
              row.rewardAmount == null ? "text-muted-foreground" : "font-semibold text-foreground"
            )}
          >
            {formatReferralReward(row)}
          </span>
          {/* No button at all once a referral is done — completed or waived
              rows have nothing left to nudge, and a disabled button would
              suggest otherwise. The reward figure beside it simply stands
              alone; nothing pads the space where the button would have been. */}
          {canRemind(row) && (
            <ReferralRemindButton row={row} onRemind={onRemind} remindedIds={remindedIds} />
          )}
        </div>
      </div>
    </div>
  );
}

interface ReferralCardListProps extends ReferralRemindActions {
  rows: Referral[];
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

/**
 * Mobile/tablet stand-in for DataTable, the same arrangement the Transactions,
 * SKU, and Clients pages use (see ClientCardList): `rows` is already the
 * current page's slice, so this only lays it out as cards and adds the pager.
 */
export function ReferralCardList({
  rows,
  isLoading,
  skeletonCount = 5,
  page,
  onPageChange,
  totalRows,
  pageSize,
  emptyTitle,
  emptyDescription,
  className,
  onRemind,
  remindedIds,
}: ReferralCardListProps) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className={cn("flex flex-col gap-3 p-4", className)}>
      {isLoading ? (
        Array.from({ length: skeletonCount }).map((_, i) => <ReferralCardSkeleton key={i} />)
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        rows.map((row) => (
          <ReferralCard key={row.id} row={row} onRemind={onRemind} remindedIds={remindedIds} />
        ))
      )}

      {!isLoading && rows.length > 0 && totalPages > 1 && (
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
