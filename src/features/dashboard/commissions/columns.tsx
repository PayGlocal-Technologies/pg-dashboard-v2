"use client";

import { Button, type Column, StatusBadge } from "@/components/ui";
import type { BadgeTrailIcon, BadgeVariant } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils/format";
import type { CommissionCycle, CommissionStatus } from "@/features/dashboard/commissions/types";

/**
 * Columns for the partner Commissions table, drawn with the same cell styles
 * as the Multi-Currency Accounts transactions table (amount + currency code,
 * StatusBadge, labelled outline row action). Default order: Transaction
 * Amount, Commission Earned, Transaction Count, Transaction Period, Status,
 * then the statement download.
 */

const STATUS_META: Record<
  CommissionStatus,
  { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon }
> = {
  IN_PROGRESS: { label: "In progress", variant: "muted" },
  PROCESSING: { label: "Processing", variant: "warning", trailIcon: "clock" },
  RELEASED: { label: "Released", variant: "success", trailIcon: "check" },
};

export function commissionStatusMeta(status: CommissionStatus) {
  return STATUS_META[status];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-06-01" → "Jun 1, 2026". Hand-formatted so server and client agree. */
function formatDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function formatPeriod(row: CommissionCycle) {
  return `${formatDay(row.periodStart)} – ${formatDay(row.periodEnd)}`;
}

function Inr({ amount }: { amount: number }) {
  return (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-semibold text-foreground tabular-nums text-[13px]">
        {formatCurrency(amount, "INR")}
      </span>
      <span className="text-[11px] text-muted-foreground font-medium">INR</span>
    </span>
  );
}

export function buildCommissionColumns({
  onDownloadStatement,
}: {
  onDownloadStatement: (row: CommissionCycle) => void;
}): Column<CommissionCycle>[] {
  return [
    {
      key: "transactionAmount",
      header: "Transaction Amount",
      minWidth: 160,
      render: (row) => <Inr amount={row.transactionAmount} />,
    },
    {
      key: "commissionEarned",
      header: "Commission Earned",
      minWidth: 160,
      render: (row) => <Inr amount={row.commissionEarned} />,
    },
    {
      key: "transactionCount",
      header: "Transaction Count",
      minWidth: 140,
      render: (row) => (
        <span className="text-[13px] text-muted-foreground tabular-nums">
          {row.transactionCount}
        </span>
      ),
    },
    {
      key: "period",
      header: "Transaction Period",
      minWidth: 220,
      render: (row) => (
        <span className="text-[13px] text-foreground whitespace-nowrap">{formatPeriod(row)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      minWidth: 140,
      render: (row) => {
        const { label, variant, trailIcon } = commissionStatusMeta(row.status);
        return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
      },
    },
    {
      key: "action",
      header: "",
      minWidth: 130,
      render: (row) =>
        // A statement exists once the cycle's payout has gone out.
        row.status === "RELEASED" ? (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon name="download" className="h-3 w-3" />}
              onClick={(e) => {
                e.stopPropagation();
                onDownloadStatement(row);
              }}
              className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap"
            >
              Statement
            </Button>
          </div>
        ) : null,
    },
  ];
}
