"use client";

import { StatusBadge } from "@/components/ui";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { formatCurrency, formatTransactionTimestamp } from "@/lib/utils/format";
import { statusMetaFor } from "@/features/dashboard/transaction-overview/columns";
import type { PartnerTransaction } from "@/features/dashboard/transaction-overview/types";

/**
 * One transaction as a card, for below lg where the table has no room. Same
 * layout as the Multi-Currency Accounts TransactionCard: country flag, amount
 * and status on the first line, who paid under it, then the timestamp; plus
 * the merchant, since a partner is looking across several.
 */
export function TransactionOverviewCard({
  row,
  onOpenDetails,
}: {
  row: PartnerTransaction;
  onOpenDetails: (row: PartnerTransaction) => void;
}) {
  const { label, variant, trailIcon } = statusMetaFor(row);

  return (
    // The whole card opens the details drawer, as the MCA card does.
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetails(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetails(row);
        }
      }}
      className="flex cursor-pointer flex-col rounded-xl border border-border bg-card px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
    >
      <div className="flex items-center gap-2">
        <CountryFlagAvatar
          iso2={row.country}
          countryName={row.country}
          className="h-7 w-7 shrink-0"
        />
        <span className="text-xl font-semibold tabular-nums tracking-tight text-foreground">
          {formatCurrency(row.amount, row.currency, "en-US")}
        </span>
        <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />
      </div>

      <p className="mt-1.5 truncate text-[13px] text-muted-foreground">
        {row.rail === "MCA" ? "Charged by" : "Paid by"}{" "}
        <span className="font-semibold text-foreground">{row.customerName}</span>
      </p>

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[12px] text-muted-foreground">
        <span>{formatTransactionTimestamp(row.createdAt)}</span>
        <span className="truncate">{row.merchantId}</span>
      </div>
    </div>
  );
}
