"use client";

import { Button, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils/format";
import { commissionStatusMeta, formatPeriod } from "@/features/dashboard/commissions/columns";
import type { CommissionCycle } from "@/features/dashboard/commissions/types";

/** One cycle as a card, below lg. Same card rhythm as the MCA TransactionCard:
 *  the headline figure (commission earned) and status first, then detail. */
export function CommissionCard({
  row,
  onDownloadStatement,
}: {
  row: CommissionCycle;
  onDownloadStatement: (row: CommissionCycle) => void;
}) {
  const { label, variant, trailIcon } = commissionStatusMeta(row.status);

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatCurrency(row.commissionEarned, "INR")}
        </span>
        <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />
      </div>

      <p className="mt-1.5 text-[13px] text-muted-foreground">
        On <span className="font-semibold text-foreground">{row.transactionCount}</span>{" "}
        {row.transactionCount === 1 ? "transaction" : "transactions"} worth{" "}
        <span className="font-semibold text-foreground">
          {formatCurrency(row.transactionAmount, "INR")}
        </span>
      </p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">{formatPeriod(row)}</p>
        {row.status === "RELEASED" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
            onClick={() => onDownloadStatement(row)}
            className="h-auto min-h-0 shrink-0 gap-1.5 py-1.5"
          >
            Statement
          </Button>
        )}
      </div>
    </div>
  );
}
