"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, DataTable } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import {
  AmountFilterChip,
  CurrencyFilterChip,
  DateFilterChip,
  StatusFilterChip,
  toEndOfDayMs,
  toStartOfDayMs,
} from "@/components/common/filters/FilterChips";
import { ReorderColumnsPopover } from "@/components/common/ReorderColumnsPopover";
import { CURRENCY_FILTER_OPTIONS } from "@/features/dashboard/multi-currency/constants";
import { reorderColumns } from "@/lib/utils/columns";
import { parseApiDateTime } from "@/lib/utils/format";
import { buildMcaLinkColumns } from "@/features/dashboard/mca-links/columns";
import { McaLinkDetailsDrawer } from "@/features/dashboard/mca-links/components/McaLinkDetailsDrawer";
import { MOCK_MCA_LINKS } from "@/features/dashboard/mca-links/mock-data";
import {
  ACTIVE_LINK_STATUSES,
  DISABLED_LINK_STATUSES,
  MCA_LINKS_PAGE_LIMIT,
  MCA_LINK_STATUS_FILTERS,
  MCA_LINK_VIEW_TABS,
} from "@/features/dashboard/mca-links/constants";
import type { McaLink } from "@/features/dashboard/mca-links/types";

function sameStatusSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

/** Epoch ms for a link timestamp, or null when it can't be parsed. */
function timestampMs(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const parsed = parseApiDateTime(raw);
  if (parsed) return parsed.getTime();
  const iso = new Date(raw);
  return Number.isNaN(iso.getTime()) ? null : iso.getTime();
}

/**
 * The MCA Links table.
 *
 * Structurally a sibling of McaTransactionTable — same tab bar, same controls
 * container, same chips, same Reorder Columns/Report action group, same
 * DataTable configuration — so the two pages read as one product family. The
 * one real difference is the data source: there is no MCA links endpoint yet,
 * so rows come from MOCK_MCA_LINKS and every filter is applied client-side
 * here. When the endpoint lands, replace the filtering block below with a
 * request body (mirroring buildTxnRequestBody) and a usePostQuery call; the
 * chips, tabs, and columns above and below it need no changes.
 */
export function McaLinkTable({ onCreateLink }: { onCreateLink: () => void }) {
  const [search, setSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [currencyFilters, setCurrencyFilters] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [amountRange, setAmountRange] = useState<{ min: string; max: string }>({
    min: "",
    max: "",
  });
  // null until the merchant actually drags a column, at which point
  // DataTable renders that order instead of buildMcaLinkColumns' own default.
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  // Which of the Date/Amount/Status/Currency filter chip popovers is open,
  // if any: shared so opening one closes whichever other one was open.
  const [openChip, setOpenChip] = useState<"date" | "amount" | "status" | "currency" | null>(null);
  const [page, setPage] = useState(1);

  const [detailsRowId, setDetailsRowId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dummy data for now. Swapping this for the real query's `data` /
  // `isPending` is the only change needed once the endpoint exists.
  const allLinks = MOCK_MCA_LINKS;
  const isPending = false;

  const query = search.trim().toLowerCase();
  const minAmount = amountRange.min ? parseFloat(amountRange.min) : undefined;
  const maxAmount = amountRange.max ? parseFloat(amountRange.max) : undefined;
  const fromMs = dateRange.from ? toStartOfDayMs(dateRange.from) : undefined;
  const toMs = dateRange.to ? toEndOfDayMs(dateRange.to) : undefined;

  const filtered = allLinks.filter((link) => {
    if (statusFilters.length && !statusFilters.includes(link.status)) return false;
    if (currencyFilters.length && !currencyFilters.includes(link.currency)) return false;

    if (query) {
      const haystack = [
        link.invoiceNumber,
        link.description,
        link.customerCountry,
        link.paymentLink,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (minAmount != null || maxAmount != null) {
      const amount = parseFloat(link.amount ?? "0");
      if (minAmount != null && amount < minAmount) return false;
      if (maxAmount != null && amount > maxAmount) return false;
    }

    // Date filters the creation timestamp, matching what the Transactions
    // table's startTime/endTime narrow on.
    if (fromMs != null || toMs != null) {
      const created = timestampMs(link.createdOn);
      if (created == null) return false;
      if (fromMs != null && created < fromMs) return false;
      if (toMs != null && created > toMs) return false;
    }

    return true;
  });

  const totalCount = filtered.length;
  // Client-side paging, since there's no server to ask for a page yet. The
  // real query will drop this slice and pass `from`/`pageLimit` instead.
  const tableRows = filtered.slice((page - 1) * MCA_LINKS_PAGE_LIMIT, page * MCA_LINKS_PAGE_LIMIT);

  const detailsRow = allLinks.find((r) => r.gid === detailsRowId) ?? null;

  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  // Clicking a row opens the details drawer; the table stays mounted
  // underneath it, so filters, ordering, paging, and scroll are untouched for
  // the whole time it's open and after it closes.
  const openDetails = (row: McaLink) => {
    setDetailsRowId(row.gid);
    setDrawerOpen(true);
  };

  const copyLink = async (row: McaLink) => {
    try {
      await navigator.clipboard.writeText(row.paymentLink);
      toast.success("Payment link copied");
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const baseColumns = buildMcaLinkColumns(openDetails, (row) => void copyLink(row));
  const columns = reorderColumns(baseColumns, columnOrder);
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "action")
    .map((c) => ({ key: c.key, label: typeof c.header === "string" ? c.header : c.key }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  return (
    <div className="space-y-4">
      {/* Tab bar: page-level navigation, sits directly on the page with no
          surrounding container. An underline-style shortcut onto the same
          status filter state as the Active/Disabled options inside the Status
          flyout, not a separate filter axis. The primary CTA sits flush right
          on the same row. */}
      <UnderlineTabs
        tabs={MCA_LINK_VIEW_TABS}
        value={
          sameStatusSet(statusFilters, ACTIVE_LINK_STATUSES)
            ? "active"
            : sameStatusSet(statusFilters, DISABLED_LINK_STATUSES)
              ? "disabled"
              : "all"
        }
        onValueChange={(v) => {
          setStatusFilters(
            v === "active" ? ACTIVE_LINK_STATUSES : v === "disabled" ? DISABLED_LINK_STATUSES : []
          );
          setPage(1);
        }}
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onClick={onCreateLink}
          >
            Create MCA Link
          </Button>
        }
      />

      {/* Controls container: search, then the filter chip group, sit
          together on the left with tight spacing; the Reorder
          Columns/Report action group is pushed to the far right (ml-auto
          below) rather than spread apart via justify-between, so the chips
          read as immediately following search instead of floating in the
          middle of a wide gap. */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <RotatingSearchInput
          value={search}
          onSearch={onSearch}
          words={["invoice number", "description", "link"]}
          className="w-40 sm:w-56"
        />

        {/* Filter group: Date, Amount, Status, Currency read as one
            cohesive filtering control, so the gap within it is tight. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <DateFilterChip
            value={dateRange}
            onChange={(next) => {
              setDateRange(next);
              setPage(1);
            }}
            open={openChip === "date"}
            onOpenChange={(next) => setOpenChip(next ? "date" : null)}
          />
          <AmountFilterChip
            value={amountRange}
            onChange={(next) => {
              setAmountRange(next);
              setPage(1);
            }}
            open={openChip === "amount"}
            onOpenChange={(next) => setOpenChip(next ? "amount" : null)}
            idPrefix="mca-link-amount"
            hint="Applies to the links currently loaded."
          />
          <StatusFilterChip
            options={MCA_LINK_STATUS_FILTERS}
            selected={statusFilters}
            onChange={(next) => {
              setStatusFilters(next);
              setPage(1);
            }}
            open={openChip === "status"}
            onOpenChange={(next) => setOpenChip(next ? "status" : null)}
          />
          <CurrencyFilterChip
            options={CURRENCY_FILTER_OPTIONS}
            value={currencyFilters}
            onChange={(next) => {
              setCurrencyFilters(next);
              setPage(1);
            }}
            open={openChip === "currency"}
            onOpenChange={(next) => setOpenChip(next ? "currency" : null)}
          />
        </div>

        {/* Action group: Reorder Columns, then Report. ml-auto pushes this
            group all the way to the right regardless of how much space the
            search/filter groups take up. */}
        <div className="ml-auto flex items-center gap-2">
          <ReorderColumnsPopover
            columns={reorderableColumns}
            order={currentColumnOrder}
            onOrderChange={setColumnOrder}
            onReset={() => setColumnOrder(null)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
            onClick={() => {
              // TODO: wire up once an MCA links export endpoint exists —
              // same gap as the Transactions table's own Report button.
            }}
            className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
          >
            Report
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={tableRows}
        isLoading={isPending}
        skeletonRows={8}
        emptyTitle="No payment links found"
        emptyDescription="Try adjusting your filters or search query"
        rowKey={(row) => row.gid}
        pageSize={MCA_LINKS_PAGE_LIMIT}
        totalRows={totalCount}
        page={page}
        onPageChange={setPage}
        tableLayout="content"
        density="compact"
      />

      {/* Rendered alongside the table (not in place of it) so closing it
          leaves the table exactly as it was. */}
      <McaLinkDetailsDrawer row={detailsRow} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
