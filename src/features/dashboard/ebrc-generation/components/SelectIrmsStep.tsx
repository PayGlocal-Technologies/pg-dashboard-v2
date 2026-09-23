"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  ColumnManager,
  DataTable,
  StatusBadge,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { FilterChipGroup, StatusFilterChip } from "@/components/common/filters/FilterChips";
import { useContentAreaBounds } from "@/components/layout/ContentAreaContext";
import { ViewPortal } from "@/components/layout/ViewPortal";
import {
  MAPPING_STATUS_LABELS,
  PROCESS_STATUS_LABELS,
  type IrmSelectionRow,
  type MappingStatus,
  type ProcessStatus,
} from "@/features/dashboard/ebrc-generation/types";
import {
  EBRC_PAGE_SIZE,
  EBRC_PAGE_SIZE_OPTIONS,
  useIrmSearch,
  useRefreshIrms,
} from "@/features/dashboard/ebrc-generation/hooks";

/** Same idea as `@/lib/utils/columns`' `reorderColumns`, but pins "select"
 *  FIRST instead of pinning a trailing "action" column last — this table's
 *  fixed column is the leading checkbox, not a trailing one. */
function reorderWithSelectFirst(
  cols: Column<IrmSelectionRow>[],
  order: string[] | null
): Column<IrmSelectionRow>[] {
  if (!order) return cols;
  const selectCol = cols.find((c) => c.key === "select");
  const reorderable = cols.filter((c) => c.key !== "select");
  const byKey = new Map(reorderable.map((c) => [c.key, c]));
  const ordered = order.map((k) => byKey.get(k)).filter((c): c is Column<IrmSelectionRow> => !!c);
  const missing = reorderable.filter((c) => !order.includes(c.key));
  return [...(selectCol ? [selectCol] : []), ...ordered, ...missing];
}

/** What the search actually matches. The box's text is sent as a full-text
 *  `queryString`, so it spans the whole record — these are the fields worth
 *  naming, and they are production's own list verbatim. */
const IRM_SEARCH_WORDS = ["IRM Number", "Remitter Name", "Purpose Code"];

const MAPPING_STATUS_VARIANT: Record<MappingStatus, "muted" | "warning" | "success"> = {
  UNMAPPED: "warning",
  // Both mid-states read the same: some of the remittance is spoken for, none
  // of it is finished.
  UNDER_CONSIDERATION: "muted",
  PARTIALLY_MAPPED: "muted",
  FULLY_MAPPED: "success",
};

const MAPPING_STATUS_OPTIONS = (Object.keys(MAPPING_STATUS_LABELS) as MappingStatus[]).map(
  (value) => ({ value, label: MAPPING_STATUS_LABELS[value] })
);
const PROCESS_STATUS_OPTIONS = (Object.keys(PROCESS_STATUS_LABELS) as ProcessStatus[]).map(
  (value) => ({ value, label: PROCESS_STATUS_LABELS[value] })
);

interface SelectIrmsStepProps {
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  /** Advances the wizard to "Map Shipping Bills" — same `goToStep(2)` the
   *  old shared footer called, just reached from this step's own docked
   *  selection bar now instead. */
  onProceed: () => void;
}

/** Step 1 — "Select IRMs to Map for eBRC Generation". Columns, filters, and
 *  the two-status model (mapping vs. process) match the merchant-facing
 *  screen directly. Rows come from `irm/search` (useIrmSearch), scoped to the
 *  merchant's PACB MIDs and excluding IRMs already COMPLETED — the same
 *  `mustNotFilters` pg-dashboard's own pick list applies. */
export function SelectIrmsStep({
  selectedIds,
  onSelectedIdsChange,
  onProceed,
}: SelectIrmsStepProps) {
  const contentBounds = useContentAreaBounds();
  const [query, setQuery] = useState("");
  const [mappingFilter, setMappingFilter] = useState<MappingStatus[]>([]);
  const [processFilter, setProcessFilter] = useState<ProcessStatus[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(EBRC_PAGE_SIZE);

  const { rows, totalCount, isLoading, isError } = useIrmSearch({
    search: query,
    page,
    pageSize,
    mappingStatus: mappingFilter,
    processStatus: processFilter,
    excludeCompleted: true,
  });

  const { refresh, isRefreshing } = useRefreshIrms();

  const selectedSet = new Set(selectedIds);
  const allSelected = rows.length > 0 && rows.every((row) => selectedSet.has(row.id));

  const toggleRow = (id: string) => {
    onSelectedIdsChange(
      selectedSet.has(id) ? selectedIds.filter((v) => v !== id) : [...selectedIds, id]
    );
  };

  const toggleAll = () => {
    if (allSelected) {
      onSelectedIdsChange(selectedIds.filter((id) => !rows.some((row) => row.id === id)));
    } else {
      const merged = new Set(selectedIds);
      rows.forEach((row) => merged.add(row.id));
      onSelectedIdsChange([...merged]);
    }
  };

  const selectedRows = rows.filter((row) => selectedSet.has(row.id));
  const totalAmount = selectedRows.reduce((sum, row) => sum + row.remittanceAmount, 0);
  const currency = selectedRows[0]?.currencyCode ?? "INR";
  const unmappedCount = selectedRows.filter((row) => row.mappingStatus === "UNMAPPED").length;

  const columns: Column<IrmSelectionRow>[] = [
    {
      key: "select",
      header: (
        <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Select all IRMs" />
      ),
      width: "40px",
      render: (row) => (
        <Checkbox
          checked={selectedSet.has(row.id)}
          onCheckedChange={() => toggleRow(row.id)}
          aria-label={`Select IRM ${row.irmNumber}`}
        />
      ),
    },
    {
      key: "irmDate",
      header: "IRM Date",
      minWidth: 100,
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] text-foreground">
          {formatDate(row.irmDate, { day: "2-digit", month: "short", year: "2-digit" })}
        </span>
      ),
    },
    { key: "purposeCode", header: "Purpose Code", minWidth: 100, render: (row) => row.purposeCode },
    {
      key: "irmNumber",
      header: "IRM Number",
      minWidth: 170,
      render: (row) => <span className="font-mono text-[12.5px]">{row.irmNumber}</span>,
    },
    {
      key: "remitterName",
      header: "Remitter Name",
      minWidth: 150,
      render: (row) => row.remitterName,
    },
    { key: "country", header: "Country", minWidth: 90, render: (row) => row.country },
    {
      key: "remittanceAmount",
      header: "Remittance Amount",
      minWidth: 150,
      align: "right",
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatCurrency(row.remittanceAmount, row.currencyCode)} {row.currencyCode}
        </span>
      ),
    },
    {
      key: "availableAmount",
      header: "Available Amount",
      minWidth: 150,
      align: "right",
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatCurrency(row.availableAmount, row.currencyCode)} {row.currencyCode}
        </span>
      ),
    },
    {
      key: "mappingStatus",
      header: "Mapping Status",
      minWidth: 150,
      // Mapping hasn't started until the IRM clears "Pending" processing —
      // the merchant-facing screen shows a dash rather than a status badge
      // for those rows.
      render: (row) =>
        row.processStatus === "PENDING" ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          <StatusBadge
            variant={MAPPING_STATUS_VARIANT[row.mappingStatus]}
            label={MAPPING_STATUS_LABELS[row.mappingStatus]}
            size="sm"
          />
        ),
    },
    { key: "adCode", header: "AD Code", minWidth: 100, render: (row) => row.adCode },
  ];

  const orderedColumns = reorderWithSelectFirst(columns, columnOrder);
  const reorderableColumns = columns
    .filter((c) => c.key !== "select")
    .map((c) => ({ key: c.key, label: typeof c.header === "string" ? c.header : c.key }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  return (
    // A genuinely `fixed` bar (see below) sits outside document flow, so
    // unlike `sticky` it can't push the last row above itself for free —
    // this reserves that space by hand once the bar is showing, roughly its
    // ~64-72px height plus its bottom-5 (20px) gap and some breathing room.
    <div className={cn("space-y-4", selectedIds.length > 0 && "pb-28")}>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <RotatingSearchInput
            value={query}
            onSearch={(value) => {
              setQuery(value);
              setPage(1);
            }}
            words={IRM_SEARCH_WORDS}
            ariaLabel="Search IRMs"
            className="w-56"
          />

          {/* One group, so clicking from one open chip to the next closes the
              first and leaves the second open — FilterChipGroup owns that state,
              which is why no chip here holds its own. */}
          <FilterChipGroup className="flex flex-wrap items-center gap-1.5">
            <StatusFilterChip
              label="Mapping status"
              options={MAPPING_STATUS_OPTIONS}
              selected={mappingFilter}
              onChange={(next) => {
                setMappingFilter(next as MappingStatus[]);
                setPage(1);
              }}
            />
            <StatusFilterChip
              label="Process status"
              options={PROCESS_STATUS_OPTIONS}
              selected={processFilter}
              onChange={(next) => {
                setProcessFilter(next as ProcessStatus[]);
                setPage(1);
              }}
            />
          </FilterChipGroup>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={
                <Icon
                  name="refresh"
                  className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")}
                />
              }
              disabled={isRefreshing}
              onClick={refresh}
              className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
            >
              Refresh
            </Button>
            <ColumnManager
              columns={reorderableColumns}
              order={currentColumnOrder}
              onOrderChange={setColumnOrder}
              onReset={() => setColumnOrder(null)}
            />
          </div>
        </div>

        <DataTable
          className="rounded-none border-0"
          columns={orderedColumns}
          data={rows}
          rowKey={(row) => row.id}
          isLoading={isLoading}
          skeletonRows={pageSize}
          emptyTitle={isError ? "Couldn't load IRMs" : "No IRMs found"}
          emptyDescription={
            isError
              ? "The IRM list didn't load. Try refreshing."
              : "Try a different remitter name or clear the filters above."
          }
          density="compact"
          tableLayout="content"
          pagination={{
            mode: "page",
            page,
            pageSize,
            total: totalCount,
            onPageChange: setPage,
            // flux's pager renders the "Rows per page" picker itself once it
            // has the choices and a handler — nothing here hand-rolls one.
            pageSizeOptions: EBRC_PAGE_SIZE_OPTIONS,
            onPageSizeChange: (size) => {
              setPageSize(size);
              // Row 1 of the new page size, not whatever page number the old
              // size happened to be on — page 8 of 10-row pages does not exist
              // once the pages hold 100.
              setPage(1);
            },
          }}
        />
      </div>

      {/* Docked selection bar — only takes up space once something's
          selected, so browsing keeps the full table height. Portaled to
          document.body (ViewPortal) and given true `position: fixed`, per
          explicit ask: not `sticky`, which stays anchored to this page's own
          scroll position rather than the viewport. `contentBounds` (from
          ContentAreaContext) supplies the left/width of the actual content
          column — everything right of the sidebar, left of the Echo panel —
          so a viewport-fixed bar still lines up with the page instead of
          spanning edge to edge over the sidebar. Nothing renders until it's
          measured, avoiding a flash at the wrong width. */}
      {selectedIds.length > 0 && contentBounds && (
        <ViewPortal>
          <div
            style={{ left: contentBounds.left, width: contentBounds.width }}
            className="fixed bottom-5 z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-foreground px-4 py-3.5 text-background shadow-[0_8px_24px_-4px_rgba(0,0,0,0.4)] sm:px-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                <Icon name="check-circle" className="h-4 w-4 text-emerald-300" />
                {selectedIds.length} IRM{selectedIds.length === 1 ? "" : "s"} selected
              </span>
              <span className="hidden h-4 w-px bg-background/20 sm:block" />
              <span className="text-[13px] tabular-nums text-background/75">
                {formatCurrency(totalAmount, currency)}
              </span>
              <span className="hidden h-4 w-px bg-background/20 sm:block" />
              {unmappedCount > 0 ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-[12px] font-medium text-amber-300">
                  <Icon name="alert-triangle" className="h-3 w-3" />
                  {unmappedCount} unmapped
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[12px] font-medium text-emerald-300">
                  <Icon name="check" className="h-3 w-3" />
                  All mapped
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto min-h-0 p-0 text-[12.5px] text-background/75 hover:bg-transparent hover:text-background"
                onClick={() => onSelectedIdsChange([])}
              >
                Clear
              </Button>
              <Button
                type="button"
                variant="primary"
                rightIcon={<Icon name="arrow-right" className="h-3.5 w-3.5" />}
                onClick={onProceed}
              >
                Map shipping bills
              </Button>
            </div>
          </div>
        </ViewPortal>
      )}
    </div>
  );
}
