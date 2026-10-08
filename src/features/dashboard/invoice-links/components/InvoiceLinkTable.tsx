"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button, ColumnManager, DataTableCard } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { ReportDownloadDrawer, type ReportWindow } from "@/components/common/ReportDownloadDrawer";
import { ConfirmActionDialog } from "@/features/dashboard/mca-invoices/components/ConfirmActionDialog";
import { useApp } from "@/stores/useApp";
import {
  DateFilterChip,
  FilterChipGroup,
  StatusFilterChip,
  toEndOfDayMs,
  toStartOfDayMs,
} from "@/components/common/filters/FilterChips";
import { reorderColumns } from "@/lib/utils/columns";
import { buildInvoiceLinkColumns } from "@/features/dashboard/invoice-links/columns";
import {
  FIXED_COLUMN_KEYS,
  INVOICE_LINKS_PAGE_LIMIT,
  INVOICE_LINKS_PAGE_SIZE_OPTIONS,
  INVOICE_LINK_STATUS_FILTERS,
} from "@/features/dashboard/invoice-links/constants";
import {
  buildInvoiceLinksReportBody,
  invoiceLinkDisableApi,
  invoiceLinkDraftApi,
  invoiceLinkRetrieveApi,
  useDeleteInvoiceDraft,
  useDisableInvoiceLink,
  useInvoiceLinks,
  useInvoiceLinkMidScope,
  useInvoiceLinksReport,
  useInvoicePreview,
} from "@/features/dashboard/invoice-links/hooks";
import { InvoicePreviewDrawer } from "@/features/dashboard/invoice-links/components/InvoicePreviewDrawer";
import { ProofDocumentsDrawer } from "@/features/dashboard/invoice-links/components/ProofDocumentsDrawer";
import { UpdateInvoiceStatusDialog } from "@/features/dashboard/invoice-links/components/UpdateInvoiceStatusDialog";
import type { InvoiceLink } from "@/features/dashboard/invoice-links/types";

/**
 * The Invoice Links table.
 *
 * Structurally a sibling of McaLinkTable — same controls container, same
 * chips, same DataTableCard configuration — but unlike that one it is wired to
 * a real endpoint, so every filter is applied **server-side** through the
 * search body rather than client-side over a mock array.
 *
 * pg-dashboard offers exactly three filters on this page (Date and time,
 * Invoice Id, Status) and no free-text search box — the search input is
 * `page === "PAYMENT"` only. The Invoice Id input is reproduced here as the
 * search control because that is what it is: upstream routes it to
 * `queryString`, not to a fieldSearch key.
 */
export function InvoiceLinkTable() {
  // Seeded from ?q= so the header's global search can hand an identifier
  // straight to this table, same as every other grid in the app.
  const router = useRouter();
  const searchParams = useSearchParams();
  const [linkId, setLinkId] = useState(() => searchParams.get("q") ?? "");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(INVOICE_LINKS_PAGE_LIMIT);

  const { rows, totalCount, isPending, isFetching, isError, isReady, refetch } = useInvoiceLinks(
    {
      linkId: linkId.trim() || undefined,
      status: statusFilters,
      startTime: dateRange.from ? toStartOfDayMs(dateRange.from) : undefined,
      endTime: dateRange.to ? toEndOfDayMs(dateRange.to) : undefined,
    },
    page,
    pageSize
  );

  // Row-action surfaces. Each keeps the row it was opened from, so closing one
  // leaves the table's filters, ordering and page exactly as they were.
  const [previewState, setPreviewState] = useState<{
    url: string | null;
    invoiceId: string | null;
  }>({ url: null, invoiceId: null });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{
    mid: string;
    invoiceId: string;
    isOfflinePaid: boolean;
  } | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    row: InvoiceLink;
    kind: "disable" | "delete";
  } | null>(null);

  // pg-dashboard reads this off the profile and defaults it to "GLOCAL" when
  // absent (index.tsx:133). That default is fail-closed — it hides Update
  // Status on every non-PAID invoice — and is carried over deliberately.
  const midType = useApp((s) => s.profile?.midType) || "GLOCAL";

  const { selectMid } = useInvoiceLinkMidScope();

  const { mutate: downloadReport, isPending: isReportPending, reportMid } = useInvoiceLinksReport();

  // Report opens the shared "Generate report" drawer, as pg-dashboard's does,
  // pre-filled from the table's Date chip (upstream's setReportRange). It is
  // remounted on every open so it re-seeds from whatever the chip says then.
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
    downloadReport(buildInvoiceLinksReportBody(window), {
      onSuccess: () => setIsReportDrawerOpen(false),
    });
  const { mutate: previewInvoice, isPending: isPreviewPending } = useInvoicePreview();
  const { mutate: disableLink, isPending: isDisabling } = useDisableInvoiceLink();
  const { mutate: deleteDraft, isPending: isDeleting } = useDeleteInvoiceDraft();

  const handlers = {
    onPreview: (row: InvoiceLink) => {
      setPreviewState({ url: null, invoiceId: row.id });
      setPreviewOpen(true);
      previewInvoice(
        {
          dynamicUrl: invoiceLinkRetrieveApi(row.mid),
          reqBody: { invoiceRequestData: { invoiceId: row.id } },
        },
        {
          onSuccess: (data) => {
            const presignedUrl = data?.data?.presignedUrl;
            if (presignedUrl) {
              setPreviewState({ url: presignedUrl, invoiceId: row.id });
            } else {
              // Upstream treats a missing URL as an error rather than an empty
              // preview, and so does this.
              setPreviewOpen(false);
              toast.error("Failed to retrieve invoice preview");
            }
          },
          onError: (e: Error) => {
            setPreviewOpen(false);
            toast.error(e?.message || "Failed to retrieve invoice preview");
          },
        }
      );
    },
    // The status rides along so the editor knows whether this is an issued
    // invoice (PUT …/edit) or a draft (POST …), which is upstream's branch.
    // Scoped to the row's own MID first: this list spans every PA MID when
    // none is selected, and the editor reads the invoice from one MID's path.
    onEdit: (row: InvoiceLink) => {
      if (row.mid) selectMid(row.mid);
      router.push(
        `/invoice-links/edit/${encodeURIComponent(row.id)}?status=${encodeURIComponent(row.status ?? "")}`
      );
    },
    onUpdateStatus: (row: InvoiceLink, isOfflinePaid: boolean) =>
      setStatusTarget({ mid: row.mid, invoiceId: row.id, isOfflinePaid }),
    onDisable: (row: InvoiceLink) => setConfirmTarget({ row, kind: "disable" }),
    onDelete: (row: InvoiceLink) => setConfirmTarget({ row, kind: "delete" }),
  };

  // Same as MCA Invoices' Refresh; gcc-ui-temp's invoice list has one too.
  const handleRefresh = async () => {
    const { isError: failed } = await refetch();
    if (failed) toast.error("Couldn't refresh invoice links. Please try again.");
    else toast.success("Invoice links updated");
  };

  const runConfirmedAction = () => {
    if (!confirmTarget) return;
    const { row, kind } = confirmTarget;
    if (kind === "disable") {
      disableLink({ dynamicUrl: invoiceLinkDisableApi(row.mid, row.id) });
    } else {
      deleteDraft({ dynamicUrl: invoiceLinkDraftApi(row.mid, row.id) });
    }
    setConfirmTarget(null);
  };

  const hasNarrowingFilters =
    !!linkId.trim() || statusFilters.length > 0 || !!dateRange.from || !!dateRange.to;

  const emptyCopy = hasNarrowingFilters
    ? {
        title: "No matching invoice links",
        description: "Try a different Invoice Id, or clear a filter to widen the results.",
      }
    : {
        title: "No invoice links yet",
        description:
          "Invoice links you raise for your customers will appear here once they are created.",
      };

  const baseColumns = buildInvoiceLinkColumns({ midType, handlers });
  const columns = reorderColumns(baseColumns, columnOrder).filter(
    (c) => !hiddenColumns.includes(c.key)
  );
  // The action menu is pinned to the right edge and is not a data column, so
  // it stays out of the reorder list.
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "actions")
    .map((c) => ({
      key: c.key,
      label: typeof c.header === "string" ? c.header : c.key,
    }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  return (
    // A flex column filling what the page leaves below its header, so the card
    // can take the remaining height (see the page's own sizing in index.tsx).
    <div className="flex min-h-0 flex-1 flex-col">
      <DataTableCard
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <RotatingSearchInput
              value={linkId}
              onSearch={(v) => {
                setLinkId(v);
                setPage(1);
              }}
              words={["invoice id"]}
              className="w-40 sm:w-56"
            />

            <FilterChipGroup className="flex flex-wrap items-center gap-1.5">
              <DateFilterChip
                value={dateRange}
                onChange={(next) => {
                  setDateRange(next);
                  setPage(1);
                }}
              />
              <StatusFilterChip
                options={INVOICE_LINK_STATUS_FILTERS}
                selected={statusFilters}
                onChange={(next) => {
                  setStatusFilters(next);
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
                    className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
                  />
                }
                onClick={() => void handleRefresh()}
                disabled={!isReady || isFetching}
                className="h-auto min-h-0 shrink-0 py-1 text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.12)]!"
              >
                Refresh
              </Button>
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
                fixedReason="Always shown. An invoice link row is unreadable without its ID, amount and status."
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
                onClick={openReportDrawer}
                className="h-auto min-h-0 shrink-0 py-1 text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.08),0_2px_8px_rgba(15,23,42,0.12)]!"
              >
                Report
              </Button>
            </div>
          </div>
        }
        columns={columns}
        data={rows}
        isLoading={isReady && isPending}
        skeletonRows={pageSize}
        rowKey={(row) => row.id}
        emptyState={
          isError ? (
            <PlaceholderState
              variant="error"
              title="Couldn't load invoice links"
              description="Something went wrong fetching this list. Try again in a moment."
              className="py-16"
            />
          ) : (
            <PlaceholderState
              // Filtered-to-nothing gets the generic empty grid; a merchant
              // who has simply not raised an invoice link yet gets the
              // invoices artwork.
              variant={hasNarrowingFilters ? "empty-table" : "no-invoices"}
              title={emptyCopy.title}
              description={emptyCopy.description}
              className="py-16"
            />
          )
        }
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        pagination={{
          mode: "page",
          page,
          pageSize,
          total: totalCount,
          onPageChange: setPage,
          pageSizeOptions: INVOICE_LINKS_PAGE_SIZE_OPTIONS,
          onPageSizeChange: (size) => {
            setPageSize(size);
            setPage(1);
          },
        }}
        tableLayout="content"
        // Dispute management's recipe (pg-internal-v2): the card fills the
        // page's flex column instead of capping its body at a guessed height.
        // The DataTable (the card's last child) becomes a flex column whose
        // scroll area takes the space left over, with the column header kept
        // sticky. `:not(.hidden)` leaves the grid hidden when the card shows
        // its empty or error state.
        maxBodyHeight="none"
        className="flex min-h-0 flex-1 flex-col [&>div:last-child:not(.hidden)]:flex [&>div:last-child]:min-h-0 [&>div:last-child]:flex-1 [&>div:last-child]:flex-col [&>div:last-child>div:first-child]:min-h-0 [&>div:last-child>div:first-child]:flex-1 [&>div:last-child>div:first-child]:overflow-y-auto [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-20 [&_th]:bg-card"
      />

      <ReportDownloadDrawer
        key={reportDrawerKey}
        open={isReportDrawerOpen}
        onOpenChange={setIsReportDrawerOpen}
        initialDateRange={dateRange}
        isGenerating={isReportPending}
        onGenerate={generateReport}
      />

      {/* All three rendered alongside the table, never in place of it, so
          dismissing any one leaves the list untouched. */}
      <InvoicePreviewDrawer
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        url={previewState.url}
        invoiceId={previewState.invoiceId}
        isLoading={isPreviewPending}
      />

      {/* One row item, two surfaces: an invoice already paid offline shows
          its proofs in a drawer, like Preview Invoice; any other opens the
          upload dialog. */}
      {statusTarget?.isOfflinePaid ? (
        <ProofDocumentsDrawer
          open
          onOpenChange={(next) => !next && setStatusTarget(null)}
          mid={statusTarget.mid}
          invoiceId={statusTarget.invoiceId}
        />
      ) : statusTarget ? (
        <UpdateInvoiceStatusDialog
          open
          onOpenChange={(next) => !next && setStatusTarget(null)}
          mid={statusTarget.mid}
          invoiceId={statusTarget.invoiceId}
        />
      ) : null}

      {/* flux has no popconfirm, so upstream's two antd popConfirms become the
          same small dialog MCA Invoices already uses for its destructive rows.
          Copy is upstream's, verbatim. */}
      <ConfirmActionDialog
        open={!!confirmTarget}
        onOpenChange={(next) => !next && setConfirmTarget(null)}
        title={
          confirmTarget?.kind === "delete"
            ? "Are you sure you want to delete this invoice?"
            : "Are you sure you want to disable this invoice?"
        }
        description={
          confirmTarget?.kind === "delete"
            ? "Deleting the invoice will remove it permanently."
            : "Disabling the invoice will stop it accepting any further payment."
        }
        confirmLabel="Yes"
        isDestructive
        isPending={isDisabling || isDeleting}
        onConfirm={runConfirmedAction}
      />
    </div>
  );
}
