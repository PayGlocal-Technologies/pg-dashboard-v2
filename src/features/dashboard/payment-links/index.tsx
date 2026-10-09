"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  ColumnManager,
  DataTableCard,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  PageHeader,
} from "@/components/ui";
import { ConfirmActionDialog } from "@/features/dashboard/mca-invoices/components/ConfirmActionDialog";
import { reorderColumns } from "@/lib/utils/columns";
import { Icon } from "@/components/icon";
import {
  FilterChipGroup,
  toEndOfDayMs,
  toStartOfDayMs,
} from "@/components/common/filters/FilterChips";
import { ReportDownloadDrawer, type ReportWindow } from "@/components/common/ReportDownloadDrawer";
import { cn } from "@/lib/utils";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { buildPaymentLinkColumns } from "@/features/dashboard/payment-links/columns";
import { PaymentLinkDetailsModal } from "@/features/dashboard/payment-links/components/PaymentLinkDetailsModal";
import { CreatePaymentLinkModal } from "@/features/dashboard/payment-links/components/CreatePaymentLinkModal";
import {
  PaymentLinksDateFilter,
  type PaymentLinksDateValue,
} from "@/features/dashboard/payment-links/components/PaymentLinksDateFilter";
import {
  FIXED_COLUMN_KEYS,
  PAYMENT_LINKS_PAGE_LIMIT,
  PAYMENT_LINK_DEFAULT_STATUS,
  PAYMENT_LINK_STATUS_FILTERS,
} from "@/features/dashboard/payment-links/constants";
import {
  buildPaymentLinksReportBody,
  useDisablePaymentLink,
  useHasPaymentLinks,
  usePaymentLinkMidScope,
  usePaymentLinks,
  usePaymentLinksEnabled,
  usePaymentLinksReport,
} from "@/features/dashboard/payment-links/hooks";
import type { PaymentLinkRow } from "@/features/dashboard/payment-links/types";
import { rowActionColumn } from "@/components/common/rowActionColumn";
import { MidScopedAction } from "@/components/common/MidScopedAction";
import { EnableProductAction, FeatureBanner } from "@/components/common/FeatureBanner";

export function PaymentLinksFeature() {
  // Not enabled: the banner asks them to enable it, and there is nothing to
  // list or create. Enabled with no link yet: the banner leads, pointing at
  // Create. Once a link exists the page is just the list.
  const productEnabled = usePaymentLinksEnabled();
  const hasLinks = useHasPaymentLinks(productEnabled);
  const showBanner = !productEnabled || hasLinks === false;

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(PAYMENT_LINK_DEFAULT_STATUS);
  const [dateFilter, setDateFilter] = useState<PaymentLinksDateValue | undefined>(undefined);
  const [page, setPage] = useState(1);
  // null until the merchant drags a column: the columns' own order until then.
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  // Captured once on mount (CLAUDE.md: no Date.now() during render), the
  // "now" the Expires At column's "Expiring in N days" chip counts from.
  const [nowMs] = useState(() => Date.now());

  // Every control narrows on the server (see usePaymentLinks), and each one
  // goes back to page 1 so a later page can't be left asking for an offset
  // the new results don't reach.
  const onSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };
  const onStatus = (v: string) => {
    setStatus(v);
    setPage(1);
  };
  const onDate = (v: PaymentLinksDateValue | undefined) => {
    setDateFilter(v);
    setPage(1);
  };

  const { rows, totalCount, isPending, isFetching, isError, isReady, refetch } = usePaymentLinks(
    {
      search: search.trim() || undefined,
      status: status === "All" ? undefined : [status],
      startTime: dateFilter?.from ? toStartOfDayMs(dateFilter.from) : undefined,
      endTime: dateFilter?.to ? toEndOfDayMs(dateFilter.to) : undefined,
    },
    page,
    { enabled: productEnabled }
  );

  const handleRefresh = async () => {
    const { isError: failed } = await refetch();
    if (failed) toast.error("Couldn't refresh payment links. Please try again.");
    else toast.success("Payment links updated");
  };

  // Report opens the shared "Generate report" drawer, as Invoice Links does,
  // pre-filled from the Date chip; remounted on every open so it re-seeds.
  const { mutate: downloadReport, isPending: isReportPending, reportMid } = usePaymentLinksReport();
  const [isReportDrawerOpen, setIsReportDrawerOpen] = useState(false);
  const [reportDrawerKey, setReportDrawerKey] = useState(0);
  const openReportDrawer = () => {
    if (!reportMid) {
      toast.error("Couldn't generate the report", {
        description: "No merchant account is available to export from.",
      });
      return;
    }
    setReportDrawerKey((k) => k + 1);
    setIsReportDrawerOpen(true);
  };
  const generateReport = (window: ReportWindow) =>
    downloadReport(buildPaymentLinksReportBody(window), {
      onSuccess: () => setIsReportDrawerOpen(false),
    });

  // Which empty state applies. The default tab (Active) and the empty
  // filters don't count as narrowing until the merchant changes one: a
  // first-time merchant should be told what payment links are for, not to
  // adjust filters.
  const hasNarrowingFilters =
    !!search.trim() || status !== PAYMENT_LINK_DEFAULT_STATUS || !!dateFilter;

  const baseColumns = buildPaymentLinkColumns(nowMs);
  const columns = reorderColumns(baseColumns, columnOrder).filter(
    (c) => !hiddenColumns.includes(c.key)
  );
  // The amount header is a component, so it gets its label here; the row
  // action stays out of the editor (it is added after, not a data column).
  const reorderableColumns = baseColumns.map((c) => ({
    key: c.key,
    label: typeof c.header === "string" ? c.header : "Amount",
  }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  const emptyCopy = hasNarrowingFilters
    ? {
        title: "No matching payment links",
        description: "Try a different search, or clear a filter to widen the results.",
      }
    : {
        title: "Share a payment link and start collecting",
        description:
          "Create a link, send it to your customer, and collect payment without building a checkout.",
      };

  const [detailsRow, setDetailsRow] = useState<PaymentLinkRow | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // Create asks which account first when the merchant has several eligible
  // MIDs and none selected (usePaymentLinkMidScope); the pick becomes the
  // selected MID, which the create form reads.
  const { needsMidChoice, midOptions, selectMid } = usePaymentLinkMidScope();
  const openCreate = (mid: string) => {
    if (mid) selectMid(mid);
    setCreateOpen(true);
  };

  const openDetails = (row: PaymentLinkRow) => {
    setDetailsRow(row);
    setDetailsOpen(true);
  };

  // The list refetches the new link on its own (see CreatePaymentLinkModal);
  // its details open straight away.
  const handleCreated = (row: PaymentLinkRow) => openDetails(row);

  // The row menu's Disable link, confirmed first, as the details modal's is.
  const [disableTarget, setDisableTarget] = useState<PaymentLinkRow | null>(null);
  const { disable, isPending: isDisabling } = useDisablePaymentLink(() => setDisableTarget(null));

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden">
      <PageHeader
        title="Payment Links"
        subtitle={isReady && !isPending ? `${totalCount} Links Created` : undefined}
        actions={
          productEnabled && (
            <>
              <Button
                variant="outline"
                size="sm"
                leftIcon={
                  <Icon
                    name="refresh"
                    className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
                  />
                }
                onClick={() => void handleRefresh()}
                disabled={!isReady || isFetching}
              >
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
                onClick={openReportDrawer}
              >
                Report
              </Button>
              <MidScopedAction
                label="Create Payment Link"
                icon="plus"
                variant="primary"
                needsMidChoice={needsMidChoice}
                midOptions={midOptions}
                onRun={openCreate}
              />
            </>
          )
        }
      />

      {showBanner && (
        <FeatureBanner
          imageSrc="/assets/banner-states/Payment%20links.png"
          title="Send a link. Collect a payment."
          description="Generate a payment link for any amount and share it with your customers to collect payments with ease."
          action={
            productEnabled ? (
              <MidScopedAction
                label="Create payment link"
                icon="plus"
                variant="primary"
                needsMidChoice={needsMidChoice}
                midOptions={midOptions}
                onRun={openCreate}
              />
            ) : (
              <EnableProductAction product="Payment Links" />
            )
          }
        />
      )}

      {/* No metrics section: there is no payment links analytics endpoint
          yet, and the cards that were here drew static figures as if they
          were the merchant's. They come back with real data. */}

      {/* Single cohesive card: title, status tabs, then the filter bar, all
       * sharing one border/rounded container, the table sits directly
       * beneath with only a top border, same hierarchy as the Settlement
       * Reports and Transactions tables. */}
      <DataTableCard<PaymentLinkRow>
        tabs={
          <SegmentedTabs options={PAYMENT_LINK_STATUS_FILTERS} value={status} onChange={onStatus} />
        }
        toolbar={
          <div className="flex items-center gap-2.5 flex-wrap">
            <RotatingSearchInput
              value={search}
              onSearch={onSearch}
              words={["customer name", "email", "payment link"]}
              className="min-w-40 max-w-xs flex-1"
            />

            <div className="hidden sm:block h-4 w-px bg-border" />

            <FilterChipGroup className="flex items-center gap-2 flex-wrap">
              <PaymentLinksDateFilter value={dateFilter} onChange={onDate} />
            </FilterChipGroup>

            <ColumnManager
              columns={reorderableColumns}
              order={currentColumnOrder}
              onOrderChange={setColumnOrder}
              onReset={() => {
                setColumnOrder(null);
                setHiddenColumns([]);
              }}
              hiddenKeys={hiddenColumns}
              onHiddenKeysChange={setHiddenColumns}
              fixedKeys={FIXED_COLUMN_KEYS}
              fixedReason="Always shown. A payment link row is unreadable without its amount, status and link."
              className="ml-auto"
            />
          </div>
        }
        emptyState={
          isError ? (
            <PlaceholderState
              variant="error"
              title="Couldn't load payment links"
              description="Something went wrong fetching this list. Try again in a moment."
              className="py-16"
            />
          ) : (
            <PlaceholderState
              variant="empty-table"
              title={emptyCopy.title}
              description={emptyCopy.description}
              action={
                hasNarrowingFilters || showBanner ? undefined : (
                  <MidScopedAction
                    label="Create payment link"
                    icon="plus"
                    variant="primary"
                    size="md"
                    needsMidChoice={needsMidChoice}
                    midOptions={midOptions}
                    onRun={openCreate}
                  />
                )
              }
              className="py-16"
            />
          )
        }
        columns={[
          ...columns,
          rowActionColumn((row) => (
            <Button
              variant="outline"
              size="sm"
              rightIcon={<Icon name="chevron-right" className="h-2.5 w-2.5" />}
              onClick={() => openDetails(row)}
              className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
            >
              View details
            </Button>
          )),
        ]}
        // pg-dashboard's row menu: Disable Link, offered only on an Active
        // link (greyed otherwise). In flux's rowAction slot, pinned to the
        // table's right edge; clicks stop here, so opening the menu never
        // also opens the row's details.
        rowAction={(row) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <IconButton
                aria-label={`More actions for payment link ${row.id}`}
                variant="ghost"
                size="sm"
                onClick={(e) => e.stopPropagation()}
              >
                <Icon name="more-vertical" className="h-4 w-4" />
              </IconButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                disabled={row.status.toUpperCase() !== "ACTIVE" || !row.mid}
                onSelect={() => setDisableTarget(row)}
              >
                <Icon name="ban" className="h-3.5 w-3.5" />
                Disable link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        data={rows}
        isLoading={isReady && isPending}
        skeletonRows={PAYMENT_LINKS_PAGE_LIMIT}
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        rowKey={(row) => row.id}
        // The whole row opens the link's details, through DataTable's
        // row-level handler rather than a wrapper around every cell.
        onRowClick={openDetails}
        pagination={{
          mode: "page",
          page,
          pageSize: PAYMENT_LINKS_PAGE_LIMIT,
          total: totalCount,
          onPageChange: setPage,
        }}
        maxBodyHeight="none"
      />

      <ReportDownloadDrawer
        key={reportDrawerKey}
        open={isReportDrawerOpen}
        onOpenChange={setIsReportDrawerOpen}
        initialDateRange={{ from: dateFilter?.from ?? "", to: dateFilter?.to ?? "" }}
        isGenerating={isReportPending}
        onGenerate={generateReport}
      />
      <ConfirmActionDialog
        open={!!disableTarget}
        onOpenChange={(next) => !next && setDisableTarget(null)}
        title="Are you sure you want to disable this link?"
        description="Disabling the link will prevent any further transactions."
        confirmLabel="Disable"
        isDestructive
        isPending={isDisabling}
        onConfirm={() => disableTarget && disable(disableTarget.mid, disableTarget.id)}
      />
      <PaymentLinkDetailsModal row={detailsRow} open={detailsOpen} onOpenChange={setDetailsOpen} />
      <CreatePaymentLinkModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
