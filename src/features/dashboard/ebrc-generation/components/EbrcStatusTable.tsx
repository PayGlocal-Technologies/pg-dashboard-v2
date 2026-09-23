"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Callout,
  CalloutText,
  Card,
  CardContent,
  DataTable,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  Input,
  StatusBadge,
  Tabs,
  TabsList,
  TabsTrigger,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { reorderColumns } from "@/lib/utils/columns";
import { MOCK_EBRC_REQUESTS } from "@/features/dashboard/ebrc-generation/mock-data";
import {
  EBRC_REQUEST_STATUS_LABELS,
  type EbrcRequestRow,
  type EbrcRequestStatus,
} from "@/features/dashboard/ebrc-generation/types";
import { DateFilterChip, type DateRangeValue } from "@/components/common/filters/FilterChips";
import { ReorderColumnsPopover } from "@/components/common/ReorderColumnsPopover";

const STATUS_VARIANT: Record<EbrcRequestStatus, "warning" | "success" | "danger"> = {
  PENDING: "warning",
  VALIDATED: "success",
  FAILED: "danger",
};

const EMPTY_DATE_RANGE: DateRangeValue = { from: "", to: "" };

function RequestDetailDrawer({
  request,
  onOpenChange,
}: {
  request: EbrcRequestRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [activeIrm, setActiveIrm] = useState(0);
  const irm = request?.irms[activeIrm] ?? null;

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
              <Tabs
                value={String(activeIrm)}
                onValueChange={(v) => setActiveIrm(Number(v))}
              >
                <TabsList>
                  {request.irms.map((row, i) => (
                    <TabsTrigger key={row.irmNumber} value={String(i)} className="font-mono text-[12px]">
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
                  <p className="text-[12.5px] font-semibold text-foreground">
                    {irm.ebrcNumber ?? "-"}
                  </p>
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
 *  screen directly. No backend yet — see mock-data.ts. */
export function EbrcStatusTable() {
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeValue>(EMPTY_DATE_RANGE);
  const [dateChipOpen, setDateChipOpen] = useState(false);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [openRequest, setOpenRequest] = useState<EbrcRequestRow | null>(null);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return MOCK_EBRC_REQUESTS.filter((row) => {
      if (needle && !row.dgftAckId.toLowerCase().includes(needle)) return false;
      if (dateRange.from && row.createdAt < dateRange.from) return false;
      if (dateRange.to && row.createdAt > dateRange.to) return false;
      return true;
    });
  }, [query, dateRange]);

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
          variant={STATUS_VARIANT[row.status]}
          label={EBRC_REQUEST_STATUS_LABELS[row.status]}
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
        <CalloutText>To check the updated status, please wait 4 hours after submission.</CalloutText>
      </Callout>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative w-56">
            <Icon
              name="search"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by DGFT Ack ID"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-2 pl-8 text-xs bg-muted/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <DateFilterChip
              label="Created date"
              value={dateRange}
              onChange={setDateRange}
              open={dateChipOpen}
              onOpenChange={setDateChipOpen}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Icon name="refresh" className="h-3.5 w-3.5" />}
              onClick={() => setQuery("")}
              className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
            >
              Refresh
            </Button>
            <ReorderColumnsPopover
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
          emptyTitle="No eBRC requests yet"
          emptyDescription="Generate your first eBRC to see it tracked here."
          density="compact"
          tableLayout="content"
        />
      </div>

      <RequestDetailDrawer
        request={openRequest}
        onOpenChange={(open) => !open && setOpenRequest(null)}
      />
    </div>
  );
}
