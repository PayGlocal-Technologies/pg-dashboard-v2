"use client";

import { Button, Card, DataTable, type Column } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  SettlementDateFilter,
  type SettlementDateValue,
} from "@/features/dashboard/settlement-reports/components/SettlementDateFilter";
import type { SettlementRow } from "@/features/dashboard/settlement-reports/types";

/** pg-dashboard's own page size for this table (`pageLimit: 15` on the
 *  non-dashboard branch of FfmsReportTable). */
const CLASSIC_PAGE_SIZE = 15;

/**
 * The settlement report exactly as pg-dashboard draws it today.
 *
 * A deliberate reproduction, not a second design: this is the comparison side of
 * the view toggle on the settlement page, so it exists to show what production
 * merchants see right now next to what v2 adds. Every difference from the v2
 * table below it is a difference production actually has.
 *
 * What production's FfmsReportTable / ReportTable have, and this mirrors:
 *   - five columns: Settlement Date, Settlement Amount, Number of Transactions,
 *     UTR Numbers, and a download action
 *   - UTR Numbers rendered as the whole `utrNumbers` array joined, "-" when
 *     empty (the v2 table shows only the first, in a copyable cell)
 *   - a Date and Time filter, a Refresh action, and prev/next pagination
 *   - fifteen rows to a page
 *
 * What production does NOT have, and this therefore leaves out: the summary
 * cards and chart, the settlement calendar, the bank-holiday banner, search,
 * column reordering, per-row status, and the whole per-settlement detail page.
 */
export function ClassicSettlementTable({
  rows,
  isLoading,
  isError,
  onRefresh,
  dateFilter,
  onDateFilterChange,
  onDownload,
  page,
  onPageChange,
}: {
  rows: SettlementRow[];
  isLoading: boolean;
  isError: boolean;
  onRefresh: () => void;
  dateFilter: SettlementDateValue | undefined;
  onDateFilterChange: (next: SettlementDateValue | undefined) => void;
  onDownload: (row: SettlementRow) => void;
  page: number;
  onPageChange: (next: number) => void;
}) {
  // DataTable slices for itself ONLY while uncontrolled; passing `page` makes it
  // controlled, and it then renders exactly the rows handed to it. So the slice
  // happens here, as it does in the invoice and receipt tables.
  const pageRows = rows.slice((page - 1) * CLASSIC_PAGE_SIZE, page * CLASSIC_PAGE_SIZE);

  const columns: Column<SettlementRow>[] = [
    {
      key: "settlementDate",
      header: "Settlement Date",
      minWidth: 160,
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] text-foreground">
          {row.date
            ? formatDate(row.date, { month: "short", day: "2-digit", year: "numeric" })
            : "-"}
        </span>
      ),
    },
    {
      key: "settlementAmount",
      header: "Settlement Amount",
      minWidth: 170,
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] font-medium tabular-nums text-foreground">
          {formatCurrency(row.amount, row.currency || "INR")}
        </span>
      ),
    },
    {
      key: "numberOfTransactions",
      header: "Number of Transactions",
      minWidth: 190,
      render: (row) => (
        <span className="text-[13px] tabular-nums text-foreground">{row.transactionCount}</span>
      ),
    },
    {
      key: "utrNumbers",
      header: "UTR Numbers",
      minWidth: 220,
      // Production joins the array and shows "-" for an empty one. No copy
      // affordance and no truncation: it prints the raw join.
      render: (row) => {
        const utrs = row.utrNumbers?.length ? row.utrNumbers : row.utrNumber ? [row.utrNumber] : [];
        return (
          <span className="text-[13px] text-muted-foreground">
            {utrs.length === 0 ? "-" : utrs.join(", ")}
          </span>
        );
      },
    },
  ];

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 px-5 pb-3 pt-5">
        <SettlementDateFilter value={dateFilter} onChange={onDateFilterChange} />
        <Button
          variant="outline"
          size="sm"
          leftIcon={
            <Icon name="refresh" className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          }
          onClick={onRefresh}
          disabled={isLoading}
          className="ml-auto h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
        >
          Refresh
        </Button>
      </div>

      {isError ? (
        <PlaceholderState
          variant="error"
          title="Couldn't load settlements"
          description="Something went wrong while fetching data."
          className="border-t border-border py-14"
          action={
            <Button variant="outline" size="sm" onClick={onRefresh}>
              Retry
            </Button>
          }
        />
      ) : (
        <DataTable
          className="rounded-none border-0 border-t border-border"
          columns={columns}
          data={pageRows}
          isLoading={isLoading}
          skeletonRows={8}
          emptyTitle="No settlement reports yet"
          emptyDescription="Settlement reports will appear here once transactions are processed"
          rowKey={(row) => row.id}
          pageSize={CLASSIC_PAGE_SIZE}
          totalRows={rows.length}
          page={page}
          onPageChange={onPageChange}
          density="compact"
          tableLayout="content"
          rowAction={(row) => (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownload(row)}
              leftIcon={<Icon name="download" className="h-2.5 w-2.5" />}
              className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
            >
              Download Report
            </Button>
          )}
        />
      )}
    </Card>
  );
}
