"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Callout,
  CalloutText,
  CalloutTitle,
  Card,
  CardContent,
  ColumnManager,
  DataTable,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  PageHeader,
  StatusBadge,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { cn } from "@/lib/utils";
import { MidGuard } from "@/components/common/MidGuard";
import { SelectMidView } from "@/components/common/SelectMidView";
import { useNeedsMidSelection } from "@/features/dashboard/multi-currency/hooks";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { reorderColumns } from "@/lib/utils/columns";
import { type IrmRepositoryRow } from "@/features/dashboard/ebrc-generation/helpers";
import {
  EBRC_FEATURE,
  EBRC_PAGE_SIZE,
  EBRC_PAGE_SIZE_OPTIONS,
  useIrmRepository,
  useRefreshIrms,
} from "@/features/dashboard/ebrc-generation/hooks";
import { FilterChipGroup, StatusFilterChip } from "@/components/common/filters/FilterChips";
import {
  MAPPING_STATUS_LABELS,
  PROCESS_STATUS_LABELS,
  type MappingStatus,
  type ProcessStatus,
} from "@/features/dashboard/ebrc-generation/types";

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

const PROCESS_STATUS_VARIANT: Record<ProcessStatus, "muted" | "warning" | "info" | "success"> = {
  NOT_STARTED: "muted",
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLETED: "success",
};

const MAPPING_STATUS_OPTIONS = (Object.keys(MAPPING_STATUS_LABELS) as MappingStatus[]).map(
  (value) => ({ value, label: MAPPING_STATUS_LABELS[value] })
);
const PROCESS_STATUS_OPTIONS = (Object.keys(PROCESS_STATUS_LABELS) as ProcessStatus[]).map(
  (value) => ({ value, label: PROCESS_STATUS_LABELS[value] })
);

/** Label-above-value row, matching the Transactions detail drawer's own
 *  DetailRow (TransactionDetailsPage.tsx) so every drawer in the app reads
 *  the same way. */
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

function IrmDetailDrawer({
  row,
  onOpenChange,
}: {
  row: IrmRepositoryRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [calloutDismissed, setCalloutDismissed] = useState(false);

  return (
    <Drawer
      open={!!row}
      onOpenChange={(open) => {
        if (!open) setCalloutDismissed(false);
        onOpenChange(open);
      }}
    >
      <DrawerContent className="w-full sm:w-lg sm:max-w-[92vw] [&>button:last-child]:hidden">
        <DrawerHeader className="flex shrink-0 flex-row items-center justify-between gap-2 py-3">
          <DrawerTitle className="text-[15px]">IRM details</DrawerTitle>
          <IconButton
            aria-label="Close"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </DrawerHeader>

        {row && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 truncate font-mono text-[13px] font-semibold text-foreground">
                IRM: {row.irmNumber}
              </p>
              {row.processStatus !== "PENDING" && (
                <StatusBadge
                  variant={MAPPING_STATUS_VARIANT[row.mappingStatus]}
                  label={MAPPING_STATUS_LABELS[row.mappingStatus]}
                  size="sm"
                />
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[11px] text-muted-foreground">Remittance Amount</p>
                <p className="text-[13px] font-semibold tabular-nums text-foreground">
                  {formatCurrency(row.remittanceAmount, row.currencyCode)} {row.currencyCode}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Available Amount</p>
                <p className="text-[13px] font-semibold tabular-nums text-foreground">
                  {formatCurrency(row.availableAmount, row.currencyCode)} {row.currencyCode}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Utilised Amount</p>
                <p className="text-[13px] font-semibold tabular-nums text-foreground">
                  {formatCurrency(row.utilisedAmount, row.currencyCode)} {row.currencyCode}
                </p>
              </div>
            </div>

            {!calloutDismissed && (
              <Callout variant="info" className="relative pr-8">
                <div className="min-w-0 flex-1">
                  <CalloutTitle>What do I need to do?</CalloutTitle>
                  <CalloutText>
                    To ensure timely resolution, please take the necessary actions by the due date.
                    Please note that in case the merchant fails to submit the required documents in
                    time, the IRM may be cancelled.
                  </CalloutText>
                </div>
                <IconButton
                  aria-label="Dismiss"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1.5 top-1.5 h-6 w-6"
                  onClick={() => setCalloutDismissed(true)}
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </IconButton>
              </Callout>
            )}

            <div>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Remitter information
              </h3>
              <Card size="sm" className="shadow-none">
                <CardContent className="grid grid-cols-2 gap-4">
                  <DetailRow label="Remitter name" value={row.remitterName} />
                  <DetailRow label="Remitter country" value={row.remitterCountry} />
                  <DetailRow
                    label="Remitter date"
                    value={formatDate(row.remitterDate, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  />
                  <DetailRow label="Purpose of remittance" value={row.purposeOfRemittance} />
                </CardContent>
              </Card>
            </div>

            <div>
              <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Transaction details
              </h3>
              <Card size="sm" className="shadow-none">
                <CardContent className="grid grid-cols-2 gap-4">
                  <DetailRow label="PAN number" value={row.panNumber} />
                  <DetailRow label="IEC code" value={row.iecCode} />
                  <DetailRow label="AD code" value={row.adCode} />
                  <DetailRow label="IFSC code" value={row.ifscCode} />
                  <DetailRow label="Currency code" value={row.currencyCode} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/**
 * IRM Repository — "View, and manage your remittance messages", the eBRC nav
 * item's other child route. Columns, filters, and the mapping/process status
 * model match the merchant-facing screen directly (same model as
 * ebrc-generation's Select IRMs step, since both list the same underlying
 * IRMs). Reads the same `irm/search` endpoint that step does — the only
 * difference is that this one lists completed IRMs too, so it sends no
 * `mustNotFilters`.
 */
export function IrmRepositoryFeature() {
  // `refresh_irm` is MID-scoped in its path, so a multi-MID merchant has to
  // pick an account before Refresh means anything — same gate as eBRC Status.
  const needsMidSelection = useNeedsMidSelection();

  const [query, setQuery] = useState("");
  const [mappingFilter, setMappingFilter] = useState<MappingStatus[]>([]);
  const [processFilter, setProcessFilter] = useState<ProcessStatus[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [openRow, setOpenRow] = useState<IrmRepositoryRow | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(EBRC_PAGE_SIZE);

  const { rows, totalCount, isLoading, isError } = useIrmRepository({
    search: query,
    page,
    pageSize,
    mappingStatus: mappingFilter,
    processStatus: processFilter,
  });

  const { refresh, isRefreshing } = useRefreshIrms();

  const columns: Column<IrmRepositoryRow>[] = [
    {
      key: "issueDate",
      header: "Issue date",
      minWidth: 110,
      render: (row) =>
        formatDate(row.issueDate, { day: "2-digit", month: "short", year: "numeric" }),
    },
    {
      key: "remittanceAmount",
      header: "Amount",
      minWidth: 140,
      align: "right",
      render: (row) => (
        <span className="whitespace-nowrap tabular-nums">
          {formatCurrency(row.remittanceAmount, row.currencyCode)} {row.currencyCode}
        </span>
      ),
    },
    {
      key: "mappingStatus",
      header: "Mapping status",
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
    {
      key: "processStatus",
      header: "Process status",
      minWidth: 130,
      render: (row) => (
        <StatusBadge
          variant={PROCESS_STATUS_VARIANT[row.processStatus]}
          label={PROCESS_STATUS_LABELS[row.processStatus]}
          size="sm"
        />
      ),
    },
    {
      key: "irmNumber",
      header: "IRM number",
      minWidth: 170,
      render: (row) => (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto min-h-0 p-0 font-mono text-[12.5px]"
          onClick={() => setOpenRow(row)}
        >
          {row.irmNumber}
        </Button>
      ),
    },
  ];

  const orderedColumns = reorderColumns(columns, columnOrder);
  const reorderableColumns = columns.map((c) => ({
    key: c.key,
    label: typeof c.header === "string" ? c.header : c.key,
  }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  if (needsMidSelection) {
    return (
      <div className="mx-auto max-w-350 space-y-4 page-enter">
        <PageHeader title="IRM Repository" subtitle="View, and manage your remittance messages" />
        <SelectMidView midType="PACB" />
      </div>
    );
  }

  return (
    <MidGuard productType="PACB" feature={EBRC_FEATURE}>
      <div className="mx-auto max-w-350 space-y-4 page-enter">
        <PageHeader title="IRM Repository" subtitle="View, and manage your remittance messages" />

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

        <IrmDetailDrawer row={openRow} onOpenChange={(open) => !open && setOpenRow(null)} />
      </div>
    </MidGuard>
  );
}
