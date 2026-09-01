"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  Shimmer,
  StatusBadge,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { getInvoiceStatusMeta } from "@/features/dashboard/mca-invoices/constants";
import {
  buildInvoiceRowActions,
  type InvoiceRowHandlers,
} from "@/features/dashboard/mca-invoices/columns";
import type { McaInvoiceRow } from "@/features/dashboard/mca-invoices/types";

function InvoiceCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-center gap-2">
        <Shimmer className="h-5 w-28" />
        <Shimmer className="ml-auto h-5 w-20" rounded="full" />
      </div>
      <Shimmer className="mt-2 h-3 w-36" />
      <Shimmer className="mt-2.5 h-4 w-24" />
    </div>
  );
}

/**
 * One invoice as a stacked card. Carries the same facts the table's columns
 * do, in the order that matters on a narrow screen: number and status first,
 * then who it bills, then the amount and dates.
 */
function InvoiceCard({ row, handlers }: { row: McaInvoiceRow; handlers: InvoiceRowHandlers }) {
  const { label, variant } = getInvoiceStatusMeta(row.status);
  const actions = buildInvoiceRowActions(row, handlers);
  const isDraft = row.status === "DRAFT";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => handlers.onOpenRow(row)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handlers.onOpenRow(row);
        }
      }}
      className="flex cursor-pointer flex-col rounded-xl border border-border bg-card px-4 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
    >
      <div className="flex items-center gap-2">
        <span className="truncate text-[13.5px] font-medium text-foreground">
          {row.invoiceNumber || "—"}
        </span>
        {row.type === "RECURRING" && (
          <Icon name="recurring-outlined" className="h-3.5 w-3.5 shrink-0 text-primary" />
        )}
        {row.source === "ZOHO" && <Icon name="zoho-logo" className="h-3.5 w-3.5 shrink-0" />}
        <span className="ml-auto shrink-0">
          <StatusBadge variant={variant} label={label} size="sm" />
        </span>
      </div>

      <p className="mt-1.5 truncate text-[12px] text-muted-foreground">
        {row.clientBusinessName || row.clientName || "—"}
      </p>

      <div className="mt-2.5 flex items-end justify-between gap-2">
        <div>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[15px] font-semibold tabular-nums text-foreground">
              {formatCurrency(parseFloat(row.totalAmount ?? "0"), row.currency ?? "INR", "en-IN")}
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">{row.currency}</span>
          </span>
          <p className="mt-0.5 text-[11.5px] text-muted-foreground">
            {row.invoiceDate
              ? formatDate(row.invoiceDate, { day: "2-digit", month: "short", year: "2-digit" })
              : "—"}
            {row.dueDate
              ? ` · due ${formatDate(row.dueDate, { day: "2-digit", month: "short", year: "2-digit" })}`
              : ""}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon name="pencil" className="h-3 w-3" />}
              onClick={(e) => {
                e.stopPropagation();
                handlers.onOpenRow(row);
              }}
              className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px]"
            >
              Continue
            </Button>
          )}

          {actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton
                  aria-label="More actions"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon name="more-horizontal" className="h-4 w-4" />
                </IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {actions.map((action) => (
                  // No preventDefault: it suppresses Radix's own close, which
                  // left the menu open behind the confirmation dialog.
                  <DropdownMenuItem key={action.key} onSelect={() => action.onSelect()}>
                    <Icon name={action.icon} className="mr-2 h-3.5 w-3.5" />
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Mobile/tablet stand-in for DataTable. `rows` is already the current
 * server-paginated page, so this only lays it out and adds a compact pager.
 */
export function InvoiceCardList({
  rows,
  isLoading,
  skeletonCount = 6,
  handlers,
  page,
  onPageChange,
  totalRows,
  pageSize,
  emptyTitle,
  emptyDescription,
  className,
}: {
  rows: McaInvoiceRow[];
  isLoading: boolean;
  skeletonCount?: number;
  handlers: InvoiceRowHandlers;
  page: number;
  onPageChange: (page: number) => void;
  totalRows: number;
  pageSize: number;
  emptyTitle: string;
  emptyDescription?: string;
  className?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className={cn("flex flex-col gap-3 p-4", className)}>
      {isLoading ? (
        Array.from({ length: skeletonCount }).map((_, i) => <InvoiceCardSkeleton key={i} />)
      ) : rows.length === 0 ? (
        <PlaceholderState
          variant="no-invoices"
          size="sm"
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        rows.map((row) => <InvoiceCard key={row.id} row={row} handlers={handlers} />)
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
