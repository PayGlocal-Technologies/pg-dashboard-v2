"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Callout,
  CalloutText,
  ColumnManager,
  DataTable,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  StatusBadge,
  Tabs,
  TabsList,
  TabsTrigger,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { reorderColumns } from "@/lib/utils/columns";
import { type EbrcRequestRow } from "@/features/dashboard/ebrc-generation/types";
import {
  EBRC_PAGE_SIZE,
  EBRC_PAGE_SIZE_OPTIONS,
  useEbrcPdfDownload,
  useEbrcSearch,
  useRefreshEbrcRequests,
} from "@/features/dashboard/ebrc-generation/hooks";

/**
 * `status` has no fixed enum on the wire — pg-dashboard renders it raw — so
 * this maps the values seen in production onto a badge tone and falls back to
 * neutral for anything else, rather than dropping a status the backend adds
 * later. The label is the wire value, title-cased, for the same reason.
 */
/** What the search actually matches. The box's text is sent as a full-text
 *  `queryString`, so it spans the whole record — these are the fields worth
 *  naming, and they are production's own list verbatim. */
const EBRC_SEARCH_WORDS = ["Request ID", "DGFT Ack ID", "IEC Number"];

function statusVariant(status: string): "warning" | "success" | "danger" | "muted" {
  const value = status.toUpperCase();
  if (value.includes("FAIL") || value.includes("ERROR") || value.includes("REJECT"))
    return "danger";
  if (value.includes("SUCCESS") || value.includes("VALIDATED") || value.includes("COMPLETE"))
    return "success";
  if (value.includes("PENDING") || value.includes("PROGRESS")) return "warning";
  return "muted";
}

function statusLabel(status: string): string {
  if (!status) return "-";
  return status
    .split(/[_\s]+/)
    .map((word, i) =>
      i === 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase()
    )
    .join(" ");
}

function RequestDetailDrawer({
  request,
  onOpenChange,
}: {
  request: EbrcRequestRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeIrm, setActiveIrm] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  const irm = request?.irms[activeIrm] ?? null;

  // Addressed to the MID that owns this request, not the currently selected
  // one — a partner or multi-MID merchant can be looking at either.
  const { download } = useEbrcPdfDownload(request?.merchantId ?? "");

  return (
    <Drawer
      open={!!request}
      onOpenChange={(open) => {
        if (!open) setActiveIrm(0);
        onOpenChange(open);
      }}
    >
      <DrawerContent className="w-full sm:w-lg sm:max-w-[92vw] [&>button:last-child]:hidden">
        <DrawerHeader className="flex shrink-0 flex-row items-center justify-between gap-2 py-3">
          <div>
            <DrawerTitle className="text-[15px]">Request Details</DrawerTitle>
            <p className="text-[12px] text-muted-foreground">
              Detailed information about your eBRC generation request
            </p>
          </div>
          <IconButton
            aria-label="Close"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </DrawerHeader>

        {request && (
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[13px] font-semibold text-foreground">Request Summary</p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">DGFT Ack. ID</p>
                  <p className="font-mono text-[12.5px] font-semibold text-foreground">
                    {request.dgftAckId}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Request ID</p>
                  <p className="truncate font-mono text-[12.5px] font-semibold text-foreground">
                    {request.requestId}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Total Records</p>
                  <p className="text-[12.5px] font-semibold tabular-nums text-foreground">
                    {request.totalIrms}
                  </p>
                </div>
              </div>
            </div>

            {request.irms.length > 1 && (
              <Tabs value={String(activeIrm)} onValueChange={(v) => setActiveIrm(Number(v))}>
                <TabsList>
                  {request.irms.map((row, i) => (
                    <TabsTrigger
                      key={row.irmNumber}
                      value={String(i)}
                      className="font-mono text-[12px]"
                    >
                      IRM: {row.irmNumber}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
            {request.irms.length === 1 && irm && (
              <p className="font-mono text-[12.5px] font-semibold text-primary underline underline-offset-4">
                IRM: {irm.irmNumber}
              </p>
            )}

            {irm && (
              <div className="grid grid-cols-3 gap-x-3 gap-y-3 rounded-lg bg-muted/30 p-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Serial No.</p>
                  <p className="text-[12.5px] font-semibold text-foreground">{irm.serialNo}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">IEC Number</p>
                  <p className="font-mono text-[12.5px] font-semibold text-foreground">
                    {irm.iecNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Port Code</p>
                  <p className="text-[12.5px] font-semibold text-foreground">{irm.portCode}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Bill Number</p>
                  <p className="text-[12.5px] font-semibold text-foreground">{irm.billNumber}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Shipping Bill No.</p>
                  <p className="text-[12.5px] font-semibold text-foreground">
                    {irm.shippingBillNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">eBRC Number</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-[12.5px] font-semibold text-foreground">
                      {irm.ebrcNumber ?? "-"}
                    </p>
                    {/* Only once DGFT has issued a certificate — there is
                        nothing to fetch before that. */}
                    {irm.ebrcNumber && (
                      <IconButton
                        aria-label={`Download eBRC ${irm.ebrcNumber}`}
                        variant="ghost"
                        size="sm"
                        disabled={downloading === irm.ebrcNumber}
                        onClick={() => {
                          setDownloading(irm.ebrcNumber);
                          download(irm.ebrcNumber as string, () => setDownloading(null));
                        }}
                      >
                        <Icon
                          name={downloading === irm.ebrcNumber ? "loader" : "download"}
                          className={cn(
                            "h-3.5 w-3.5",
                            downloading === irm.ebrcNumber && "animate-spin"
                          )}
                        />
                      </IconButton>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">FOB Value</p>
                  <p className="text-[12.5px] font-semibold tabular-nums text-foreground">
                    {formatCurrency(irm.fobValue, irm.currencyCode)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Currency</p>
                  <p className="text-[12.5px] font-semibold text-foreground">{irm.currencyCode}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/** "eBRC Status" — reached from eBRC Generation's own "Check eBRC Status" /
 *  "Generate eBRC" toggle, not a separate nav route. Columns and the request
 *  details drawer (summary tile + per-IRM tabs) match the merchant-facing
 *  screen directly. Rows come from `ebrc/search` (useEbrcSearch), scoped to
 *  the merchant's PACB MIDs. */
export function EbrcStatusTable() {
  const [query, setQuery] = useState("");
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [openRequest, setOpenRequest] = useState<EbrcRequestRow | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(EBRC_PAGE_SIZE);

  // No date filter here: `ebrc/search` takes a search query and a sort key and
  // nothing else, which is why pg-dashboard's own eBRC Status table offers
  // search and refresh alone. A chip filtering only the page already loaded
  // would look like a filter over every request and quietly not be one.
  const { rows, totalCount, isLoading, isError } = useEbrcSearch({
    search: query,
    page,
    pageSize,
  });

  const { refresh, isRefreshing } = useRefreshEbrcRequests();

  const columns: Column<EbrcRequestRow>[] = [
    {
      key: "requestId",
      header: "Request ID",
      minWidth: 200,
      render: (row) => (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto min-h-0 p-0 font-mono text-[12.5px]"
          onClick={() => setOpenRequest(row)}
        >
          {row.requestId}
        </Button>
      ),
    },
    {
      key: "dgftAckId",
      header: "DGFT Ack. ID",
      minWidth: 130,
      render: (row) => <span className="font-mono text-[12.5px]">{row.dgftAckId}</span>,
    },
    { key: "iecNumber", header: "IEC Number", minWidth: 110, render: (row) => row.iecNumber },
    {
      key: "status",
      header: "Status",
      minWidth: 100,
      render: (row) => (
        <StatusBadge
          variant={statusVariant(row.status)}
          label={statusLabel(row.status)}
          size="sm"
        />
      ),
    },
    {
      key: "totalIrms",
      header: "Total IRMs",
      minWidth: 90,
      align: "right",
      render: (row) => <span className="tabular-nums">{row.totalIrms}</span>,
    },
    {
      key: "createdAt",
      header: "Created At",
      minWidth: 110,
      render: (row) =>
        formatDate(row.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" }),
    },
  ];

  const orderedColumns = reorderColumns(columns, columnOrder);
  const reorderableColumns = columns.map((c) => ({
    key: c.key,
    label: typeof c.header === "string" ? c.header : c.key,
  }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  return (
    <div className="space-y-4">
      <Callout variant="info">
        <CalloutText>
          To check the updated status, please wait 2 hours after submission.
        </CalloutText>
      </Callout>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <RotatingSearchInput
            value={query}
            onSearch={(value) => {
              setQuery(value);
              setPage(1);
            }}
            words={EBRC_SEARCH_WORDS}
            ariaLabel="Search eBRC requests"
            className="w-56"
          />

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
          emptyTitle={isError ? "Couldn't load eBRC requests" : "No eBRC requests yet"}
          emptyDescription={
            isError
              ? "The request list didn't load. Try refreshing."
              : "Generate your first eBRC to see it tracked here."
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

      <RequestDetailDrawer
        request={openRequest}
        onOpenChange={(open) => !open && setOpenRequest(null)}
      />
    </div>
  );
}
