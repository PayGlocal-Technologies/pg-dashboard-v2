"use client";

import { Button, EmptyState, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { formatPhoneNumber, formatTransactionDateOnly } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { Client } from "@/features/dashboard/client-management/types";

function ClientCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Shimmer className="h-4 w-40" />
        {/* Matches CountryFlag's own 20×14 rectangle, not a circle. */}
        <Shimmer className="ml-auto h-3.5 w-5" rounded="sm" />
      </div>
      <Shimmer className="mt-2 h-3 w-28" />
      <Shimmer className="mt-1.5 h-3 w-44" />
      <Shimmer className="mt-2.5 h-3 w-36" />
    </div>
  );
}

// The same fields, formatters, and click target as buildClientColumns, laid
// out as a stacked card instead of table cells: the whole card opens the
// client's details, exactly as the whole row does above lg. Any action added
// inside later must stop propagation in its own onClick to stay independent
// of that, the same rule the Transactions card follows.
function ClientCard({ row, onOpenDetails }: { row: Client; onOpenDetails: (row: Client) => void }) {
  return (
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
      {/* Primary row: the business name, then the flag trailing as the country
          marker. No avatar, matching the Business name column this card is the
          responsive form of, and no outstanding figure, matching the column the
          table no longer has. min-w-0 on the name so a long one truncates
          rather than pushing the flag off the card. */}
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
          {row.businessName}
        </span>
        <CountryFlag iso2={row.countryIso2} alt={row.countryName} />
      </div>

      {/* Contact block: who to talk to, then how. The name carries foreground
          weight (it's the second strongest thing on the card, after the
          business itself); email and phone trail it as muted metadata. */}
      <p className="mt-2 text-[13px] text-muted-foreground">
        <span className="font-medium text-foreground">{row.primaryContactName}</span>
        <span className="text-muted-foreground"> · {row.countryName}</span>
      </p>
      <p className="mt-1 truncate text-[12px] text-muted-foreground" title={row.email}>
        {row.email}
      </p>

      {/* Trailing metadata row, the same beat the transaction card puts its
          timestamp on: phone at the left, creation date at the right. */}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {formatPhoneNumber(row.phoneDialCode, row.phoneNumber)}
        </span>
        <span className="text-[12px] text-muted-foreground">
          Created {formatTransactionDateOnly(row.createdAt)}
        </span>
      </div>
    </div>
  );
}

interface ClientCardListProps {
  rows: Client[];
  isLoading: boolean;
  skeletonCount?: number;
  onOpenDetails: (row: Client) => void;
  page: number;
  onPageChange: (page: number) => void;
  totalRows: number;
  pageSize: number;
  emptyTitle: string;
  emptyDescription?: string;
  className?: string;
}

/**
 * Mobile/tablet stand-in for DataTable, the same arrangement the Transactions
 * and SKU pages use (see TransactionCardList): `rows` is already the current
 * page's slice, so this only lays it out as cards and adds the compact pager.
 */
export function ClientCardList({
  rows,
  isLoading,
  skeletonCount = 6,
  onOpenDetails,
  page,
  onPageChange,
  totalRows,
  pageSize,
  emptyTitle,
  emptyDescription,
  className,
}: ClientCardListProps) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className={cn("flex flex-col gap-3 p-4", className)}>
      {isLoading ? (
        Array.from({ length: skeletonCount }).map((_, i) => <ClientCardSkeleton key={i} />)
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        rows.map((row) => <ClientCard key={row.id} row={row} onOpenDetails={onOpenDetails} />)
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
