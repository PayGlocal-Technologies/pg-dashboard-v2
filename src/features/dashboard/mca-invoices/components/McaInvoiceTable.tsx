"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, DataTable } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { ReorderColumnsPopover } from "@/components/common/ReorderColumnsPopover";
import {
  DateFilterChip,
  EMPTY_RELATIVE_RANGE,
  StatusFilterChip,
  hasRelativeRange,
  relativeRangeToEpochMs,
  type RelativeRangeValue,
} from "@/components/common/filters/FilterChips";
import { useDelete, usePost, usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { reorderColumns } from "@/lib/utils/columns";
import {
  allInvoicesApi,
  deleteInvoiceApi,
  duplicateInvoiceApi,
  viewInvoiceApi,
} from "@/features/dashboard/mca-invoices/services";
import {
  buildInvoiceRequestBody,
  dateFilterToEpochMs,
  EMPTY_INVOICE_DATE_FILTER,
} from "@/features/dashboard/mca-invoices/helpers";
import { buildInvoiceColumns } from "@/features/dashboard/mca-invoices/columns";
import {
  FIXED_COLUMN_KEYS,
  INVOICES_PAGE_LIMIT,
  INVOICE_STATUS_FILTERS,
  INVOICE_VIEW_TABS,
  SEARCH_WORDS,
  STATUS_PINNED_TABS,
  TAB_STATUS_FILTERS,
  type InvoiceViewTab,
} from "@/features/dashboard/mca-invoices/constants";
import { InvoiceCardList } from "@/features/dashboard/mca-invoices/components/InvoiceCardList";
import { MarkAsPaidDialog } from "@/features/dashboard/mca-invoices/components/MarkAsPaidDialog";
import { ConfirmActionDialog } from "@/features/dashboard/mca-invoices/components/ConfirmActionDialog";
import { LinkTransactionModal } from "@/features/dashboard/mca-invoices/components/LinkTransactionModal";
import { toDateKey } from "@/features/dashboard/create-invoice/components/InvoiceHeaderChips";
import type {
  InvoiceDateFilter,
  InvoiceSearchBody,
  McaInvoiceRow,
  McaInvoicesResponse,
} from "@/features/dashboard/mca-invoices/types";
import type { BaseResponse } from "@/types/common";

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

/**
 * Date + Status as one control group.
 *
 * Owns `openChip` itself, which is load bearing rather than incidental. The
 * desktop and compact control rows are both mounted at once, with CSS deciding
 * which is visible, so each row needs its own instance holding its own open
 * state. Lifting it to the parent and sharing it across the two opens the
 * hidden row's twin alongside the visible one, and a Radix popover anchored to
 * a display:none trigger never positions: it stays off-screen while still
 * stacking above the real popover and swallowing the click, so the chips look
 * completely dead. This mirrors FilterChipsRow, which carries the same warning.
 */
function InvoiceFilterChips({
  dateRange,
  onDateRangeChange,
  relativeRange,
  onRelativeRangeChange,
  statusFilters,
  onStatusFiltersChange,
}: {
  dateRange: { from: string; to: string };
  onDateRangeChange: (next: { from: string; to: string }) => void;
  relativeRange: RelativeRangeValue;
  onRelativeRangeChange: (next: RelativeRangeValue) => void;
  statusFilters: string[];
  onStatusFiltersChange: (next: string[]) => void;
}) {
  const [openChip, setOpenChip] = useState<"date" | "status" | null>(null);

  return (
    <>
      <DateFilterChip
        value={dateRange}
        onChange={onDateRangeChange}
        relativeValue={relativeRange}
        onRelativeChange={onRelativeRangeChange}
        open={openChip === "date"}
        onOpenChange={(next) => setOpenChip(next ? "date" : null)}
      />
      <StatusFilterChip
        options={INVOICE_STATUS_FILTERS}
        selected={statusFilters}
        onChange={onStatusFiltersChange}
        open={openChip === "status"}
        onOpenChange={(next) => setOpenChip(next ? "status" : null)}
      />
    </>
  );
}

interface McaInvoiceTableProps {
  /** The page's summary cards, composed by the page but positioned here so
   *  they always sit directly above the controls, at every width. */
  summarySection?: ReactNode;
  /** Lifted so the summary cards can drive the table's own filters, which is
   *  what pg-dashboard's summary does. */
  statusFilters: string[];
  onStatusFiltersChange: (next: string[]) => void;
}

/**
 * The invoice list.
 *
 * Structure, spacing and controls follow the MCA transactions table: one
 * bordered surface holding a tab bar, a search/filter row, and the table (or
 * a card list below lg), with the summary block above it. The data, columns,
 * row actions and request shape follow pg-dashboard's invoice management page.
 */
export function McaInvoiceTable({
  summarySection,
  statusFilters,
  onStatusFiltersChange,
}: McaInvoiceTableProps) {
  const router = useRouter();

  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const paCbMids = useApp((s) => s.paCbMids);

  const [search, setSearch] = useState("");
  /**
   * The Date chip's own value, and nobody else's.
   *
   * This used to be lifted to the page so the summary's range picker could be a
   * second view of it. That made each control silently move the other, so the
   * chip could read "Date · last 7 days" because someone had scoped the counts
   * above. The summary keeps its own period now, and this lives here — where the
   * only control that edits it lives — so the two cannot be re-coupled by
   * threading one prop.
   */
  const [dateFilter, setDateFilter] = useState<InvoiceDateFilter>(EMPTY_INVOICE_DATE_FILTER);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [today] = useState(() => toDateKey(new Date()));

  // Row-action targets. Each holds the row the dialog is acting on, or null.
  const [markingPaid, setMarkingPaid] = useState<McaInvoiceRow | null>(null);
  const [deleting, setDeleting] = useState<McaInvoiceRow | null>(null);
  const [duplicating, setDuplicating] = useState<McaInvoiceRow | null>(null);
  const [linking, setLinking] = useState<McaInvoiceRow | null>(null);

  // An explicit selection narrows to that MID; otherwise the merchant's whole
  // PACB set is queried, matching production.
  const mids = useMemo(() => (selectedMid ? [selectedMid] : paCbMids), [selectedMid, paCbMids]);
  const showMid = !selectedMid && paCbMids.length > 1;

  const body = buildInvoiceRequestBody(
    {
      status: statusFilters.length ? statusFilters : undefined,
      type: typeFilter.length ? typeFilter : undefined,
      ...dateFilterToEpochMs(dateFilter),
    },
    {
      mids,
      searchQuery: search,
      pageLimit: INVOICES_PAGE_LIMIT,
      from: (page - 1) * INVOICES_PAGE_LIMIT,
    }
  );

  // Any MID can address the endpoint; fieldSearch.mid is what scopes results.
  const searchUrl = allInvoicesApi(mids[0] ?? "");

  const { data, isPending, isFetching, isError, refetch } = usePostQuery<
    McaInvoicesResponse,
    InvoiceSearchBody
  >(["mca-invoices", ...mids], searchUrl, body, { staleTime: 0 }, mids.length > 0 && !!searchUrl);

  const rows = data?.data?.data ?? [];
  const totalRows = data?.data?.totalCount ?? 0;

  // Derived from the filters rather than stored, so the tab stays correct when
  // something else moves them: a summary card, or the Status flyout. Matching
  // over STATUS_PINNED_TABS means adding a tab needs no change here.
  const activeTab: InvoiceViewTab = typeFilter.length
    ? "recurring"
    : (STATUS_PINNED_TABS.find((tab) => sameSet(statusFilters, TAB_STATUS_FILTERS[tab.value]))
        ?.value ?? "all");

  // Blank URLs: every call overrides them per row via `dynamicUrl`, because
  // the MID differs by row on a multi-MID merchant's list.
  const { mutate: viewInvoice } = usePost<BaseResponse<{ url: string }>, object>("", {
    invalidateQueries: false,
  });
  const { mutate: duplicateInvoice, isPending: isDuplicating } = usePost<
    BaseResponse<null>,
    object
  >("", { invalidateQueries: ["mca-invoices"] });
  const { mutate: deleteInvoice, isPending: isDeleting } = useDelete<BaseResponse<null>, object>(
    "",
    { invalidateQueries: ["mca-invoices"] }
  );

  const openDocument = (row: McaInvoiceRow) => {
    viewInvoice(
      { dynamicUrl: viewInvoiceApi(row.mid, row.id) },
      {
        onSuccess: (response) => {
          const url = response?.data?.url;
          if (!url) {
            toast.error("Couldn't open the invoice", {
              description: "No document link came back.",
            });
            return;
          }
          window.open(url, "_blank", "noopener,noreferrer");
        },
        onError: (error) =>
          toast.error("Couldn't open the invoice", { description: error.message }),
      }
    );
  };

  const handlers = {
    // A draft reopens in the editor to be finished; anything finalised opens
    // its details page, which is where the document, the linked transaction and
    // the remaining actions live. Downloading is still available from the row's
    // own menu, and is no longer what a plain row click does.
    onOpenRow: (row: McaInvoiceRow) => {
      if (row.status === "DRAFT") {
        router.push(`/create-invoice?invoiceId=${row.id}`);
        return;
      }
      router.push(`/mca-invoices/${row.id}`);
    },
    onLinkTransaction: setLinking,
    onDelete: setDeleting,
    onDuplicate: setDuplicating,
    onDownload: openDocument,
    onMarkAsPaid: setMarkingPaid,
  };

  const confirmDelete = () => {
    if (!deleting) return;
    deleteInvoice(
      { dynamicUrl: deleteInvoiceApi(deleting.mid, deleting.id) },
      {
        onSuccess: () => {
          toast.success(`Invoice ${deleting.invoiceNumber} deleted`);
          setDeleting(null);
        },
        onError: (error) => toast.error("Couldn't delete", { description: error.message }),
      }
    );
  };

  const confirmDuplicate = () => {
    if (!duplicating) return;
    duplicateInvoice(
      { dynamicUrl: duplicateInvoiceApi(duplicating.mid, duplicating.id) },
      {
        onSuccess: () => {
          toast.success(`Invoice ${duplicating.invoiceNumber} duplicated`, {
            description: "The copy is in your list as a draft.",
          });
          setDuplicating(null);
        },
        onError: (error) => toast.error("Couldn't duplicate", { description: error.message }),
      }
    );
  };

  const handleRefresh = async () => {
    const { isError: failed } = await refetch();
    if (failed) toast.error("Couldn't refresh invoices. Please try again.");
    else toast.success("Invoices updated");
  };

  const baseColumns = buildInvoiceColumns(handlers, {
    showMid,
    showFrequency: activeTab === "recurring",
  });
  const orderedColumns = reorderColumns(baseColumns, columnOrder);
  const columns = orderedColumns.filter((col) => !hiddenColumns.includes(col.key));
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "action")
    .map((c) => ({ key: c.key, label: typeof c.header === "string" ? c.header : c.key }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  const onSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // A function, not a stored element: each control row must get its own
  // InvoiceFilterChips instance, since that component's own open state is what
  // keeps the hidden row's chips from opening alongside the visible ones.
  const renderFilterChips = () => (
    <InvoiceFilterChips
      dateRange={dateFilter.range}
      onDateRangeChange={(next) => {
        // The chip's two modes are exclusive, so applying an absolute range
        // drops the relative one and the window it had resolved to.
        setDateFilter({ range: next, relative: EMPTY_RELATIVE_RANGE, window: null });
        setPage(1);
      }}
      relativeRange={dateFilter.relative}
      onRelativeRangeChange={(next) => {
        setDateFilter({
          range: { from: "", to: "" },
          relative: next,
          // Clock reads belong in the handler, never in render.
          window: hasRelativeRange(next) ? relativeRangeToEpochMs(next) : null,
        });
        setPage(1);
      }}
      statusFilters={statusFilters}
      onStatusFiltersChange={(next) => {
        onStatusFiltersChange(next);
        // Status and the Recurring view are different axes; picking a status
        // explicitly leaves the recurring-only view.
        setTypeFilter([]);
        setPage(1);
      }}
    />
  );

  return (
    <div className="flex flex-col gap-4">
      {summarySection && <div className="mb-4 lg:mb-0">{summarySection}</div>}

      {/* Tab bar, controls and the table share one bordered surface; DataTable's
          own border/radius are neutralised below since this wrapper provides
          them. */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 pt-3">
          <UnderlineTabs
            tabs={INVOICE_VIEW_TABS}
            value={activeTab}
            onValueChange={(next) => {
              const tab = next as InvoiceViewTab;
              setTypeFilter(tab === "recurring" ? ["RECURRING"] : []);
              onStatusFiltersChange(TAB_STATUS_FILTERS[tab]);
              setPage(1);
            }}
          />
        </div>

        {/* Desktop (lg+): search, filter chips, then actions pushed right. */}
        <div className="hidden flex-wrap items-center gap-2 border-b border-border px-4 py-3 lg:flex">
          <RotatingSearchInput
            value={search}
            onSearch={onSearch}
            words={SEARCH_WORDS}
            ariaLabel="Search invoices"
            className="w-40 sm:w-56"
          />

          <div className="flex flex-wrap items-center gap-1.5">{renderFilterChips()}</div>

          <div className="ml-auto flex items-center gap-2">
            <ReorderColumnsPopover
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
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={
                <Icon name="refresh" className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              }
              onClick={() => void handleRefresh()}
              disabled={isFetching}
              className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
            >
              Refresh
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onClick={() => router.push("/create-invoice")}
              className="h-auto min-h-0 shrink-0 py-1"
            >
              Create invoice
            </Button>
          </div>
        </div>

        {/* Tablet + mobile: search and Create on one row, chips beneath. */}
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3 lg:hidden">
          <div className="flex flex-nowrap items-center gap-2">
            <RotatingSearchInput
              value={search}
              onSearch={onSearch}
              words={SEARCH_WORDS}
              ariaLabel="Search invoices"
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onClick={() => router.push("/create-invoice")}
              className="h-auto min-h-0 shrink-0 py-1"
            >
              Create
            </Button>
          </div>

          <div className="scrollbar-none flex flex-nowrap items-center gap-1.5 overflow-x-auto">
            {renderFilterChips()}
          </div>
        </div>

        {isError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
              <Icon name="alert-circle" size={22} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Couldn&apos;t load invoices</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Something went wrong while fetching data.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <DataTable
              className="hidden rounded-none border-0 lg:block"
              columns={columns}
              data={rows}
              isLoading={isPending}
              skeletonRows={8}
              emptyTitle="No invoices found"
              emptyDescription="Try adjusting your filters or search query"
              rowKey={(row) => row.id}
              pageSize={INVOICES_PAGE_LIMIT}
              totalRows={totalRows}
              page={page}
              onPageChange={setPage}
              tableLayout="content"
              density="compact"
            />

            <InvoiceCardList
              className="lg:hidden"
              rows={rows}
              isLoading={isPending}
              handlers={handlers}
              page={page}
              onPageChange={setPage}
              totalRows={totalRows}
              pageSize={INVOICES_PAGE_LIMIT}
              emptyTitle="No invoices found"
              emptyDescription="Try adjusting your filters or search query"
            />
          </>
        )}
      </div>

      <MarkAsPaidDialog
        invoice={markingPaid}
        today={today}
        onOpenChange={(open) => {
          if (!open) setMarkingPaid(null);
        }}
        onDone={() => setMarkingPaid(null)}
      />

      <ConfirmActionDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Delete this invoice?"
        description={
          deleting
            ? `${deleting.invoiceNumber} will be removed. This cannot be undone.`
            : "This invoice will be removed."
        }
        confirmLabel="Delete"
        isDestructive
        isPending={isDeleting}
        onConfirm={confirmDelete}
      />

      <ConfirmActionDialog
        open={!!duplicating}
        onOpenChange={(open) => {
          if (!open) setDuplicating(null);
        }}
        title="Duplicate this invoice?"
        description={
          duplicating
            ? `A new draft will be created from ${duplicating.invoiceNumber}.`
            : "A new draft will be created from this invoice."
        }
        confirmLabel="Duplicate"
        isPending={isDuplicating}
        onConfirm={confirmDuplicate}
      />

      <LinkTransactionModal
        invoice={linking}
        onOpenChange={(open) => {
          if (!open) setLinking(null);
        }}
        onLinked={() => setLinking(null)}
      />
    </div>
  );
}
