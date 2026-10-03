"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useReducedMotion } from "framer-motion";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
import { useRouter } from "next/navigation";
import {
  Button,
  ColumnManager,
  DataCardList,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  DataTableCard,
  PageHeader,
  StatusBadge,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import {
  DateRangeFilterChip,
  FilterChipGroup,
  StatusFilterChip,
  type DateRangeValue,
} from "@/components/common/filters/FilterChips";
import { cn } from "@/lib/utils";
import { reorderColumns } from "@/lib/utils/columns";
import { ConfirmActionDialog } from "@/features/dashboard/mca-invoices/components/ConfirmActionDialog";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import { CREATE_DEAL_PATH, REFERRAL_TYPES } from "@/features/dashboard/partner-deals/constants";
import { MOCK_DEALS } from "@/features/dashboard/partner-deals/mock-data";
import { DEAL_STATUS_META, DEAL_STATUS_OPTIONS } from "@/features/dashboard/partner-deals/status";
import { PartnerDealDetailPage } from "@/features/dashboard/partner-deals/components/detail/PartnerDealDetail";
import { PartnerDealDrawer } from "@/features/dashboard/partner-deals/components/detail/PartnerDealDrawer";
import {
  DealMorphLayer,
  drawerRect,
  elementRect,
  type DealMorph,
} from "@/features/dashboard/partner-deals/components/detail/DealMorphLayer";
import type { Deal } from "@/features/dashboard/partner-deals/types";

/**
 * DESIGN MOCK: the partner Deals list (Header's Partners tab), at
 * /partner-deals-dashboard, pg-dashboard's own path for it. Same page
 * anatomy as the Commissions page: PageHeader with the primary action, then
 * one DataTableCard with All / Active / Used / Deactivated tabs, search, the
 * Status, Creation date and Referral type chips, and Refresh and Columns on the
 * right; a card list below lg. The tabs are a shortcut onto the Status
 * chip's own selection (as on MCA Transactions), not a second filter.
 *
 * Details follow Multi-Currency Accounts Transactions exactly: a row (or its
 * hover-revealed "View details") opens a right-side drawer over the list;
 * the drawer's Expand swaps the list for the full-page view, whose Collapse
 * goes back to the drawer and Back to the list, filters untouched.
 *
 * Runs on placeholder deals (mock-data.ts). TODO(integration): the partner
 * deals list endpoint, confirmed against pg-dashboard.
 */

const referralTypeLabel = (value: string) =>
  REFERRAL_TYPES.find((t) => t.value === value)?.label ?? value;

const REFERRAL_TYPE_OPTIONS = REFERRAL_TYPES.map((t) => ({ value: t.value, label: t.label }));

const VIEW_TABS = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "USED", label: "Used" },
  { value: "DEACTIVATED", label: "Deactivated" },
] as const;

const SEARCH_WORDS = ["Deal name", "Deal ID", "Onboarding ID", "Business name"];

/** Always shown: a deal row means nothing without its name and status. */
const FIXED_COLUMN_KEYS = ["name", "status"];

const EMPTY_DATE: DateRangeValue = { from: "", to: "" };

/** "26/09/2026 16:20:05" → "2026-09-26", comparable with the date chip. */
const createdDayKey = (createdAt: string) => {
  const [d, m, y] = createdAt.slice(0, 10).split("/");
  return `${y}-${m}-${d}`;
};

function buildColumns(
  onOpen: (row: Deal) => void,
  onDeactivate: (row: Deal) => void
): Column<Deal>[] {
  return [
    {
      key: "name",
      header: "Deal",
      minWidth: 180,
      render: (row) => <span className="text-[13px] font-medium text-foreground">{row.name}</span>,
    },
    {
      key: "referralType",
      header: "Referral type",
      minWidth: 150,
      render: (row) => (
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">
          {referralTypeLabel(row.referralType)}
        </span>
      ),
    },
    {
      key: "dealId",
      header: "Deal ID",
      minWidth: 140,
      render: (row) => (
        <CopyableText value={row.dealId} valueClassName="font-mono text-[13px] text-foreground" />
      ),
    },
    {
      key: "onboardingId",
      header: "Onboarding ID",
      minWidth: 170,
      render: (row) => (
        // Only a used deal has one: the onboarding that used it.
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">
          {row.onboardingId ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      minWidth: 130,
      render: (row) => {
        const { label, variant, trailIcon } = DEAL_STATUS_META[row.status];
        return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
      },
    },
    {
      key: "createdAt",
      header: "Creation Time",
      minWidth: 170,
      render: (row) => (
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">
          {formatTransactionTimestamp(row.createdAt)}
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      minWidth: 150,
      render: (row) => (
        // Hidden until the row is hovered or focused, opacity only so
        // revealing it never shifts the row; opens the same drawer a click
        // anywhere on the row does. Same control as on MCA Transactions.
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(row);
            }}
            className="h-auto min-h-0 rounded-md px-2 py-1 text-[11px] whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            View details
          </Button>
          {/* Active deals only: Used and Deactivated have nothing left to
              turn off. Same "⋯" menu as MCA Invoices' rows. The slot is kept
              for other rows so View details lines up down the column. */}
          {row.status === "ACTIVE" ? (
            <DealRowMenu deal={row} onDeactivate={onDeactivate} />
          ) : (
            <span aria-hidden className="w-8" />
          )}
        </div>
      ),
    },
  ];
}

/** The row's "⋯" menu, built as MCA Invoices' RowActionsMenu. The menu
 *  closes on select; the confirmation is a sibling at page level. */
function DealRowMenu({ deal, onDeactivate }: { deal: Deal; onDeactivate: (deal: Deal) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          aria-label={`More actions for ${deal.name}`}
          variant="ghost"
          size="sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="more-horizontal" className="h-4 w-4" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => onDeactivate(deal)}>
          <Icon name="ban" className="h-3.5 w-3.5" />
          Deactivate deal
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DealCard({ row, onOpen }: { row: Deal; onOpen: (row: Deal) => void }) {
  const { label, variant, trailIcon } = DEAL_STATUS_META[row.status];
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onOpen(row)}
      className="h-auto w-full flex-col items-stretch rounded-xl border border-border bg-card px-4 py-3.5 text-left font-normal hover:bg-muted/40 [&>span]:block [&>span]:w-full"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[15px] font-semibold text-foreground">{row.name}</span>
        <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />
      </span>
      <span className="mt-1.5 block font-mono text-[13px] text-muted-foreground">
        {row.dealId}
        {row.onboardingId ? ` · ${row.onboardingId}` : ""}
      </span>
      <span className="mt-2.5 block text-[12px] text-muted-foreground">
        {formatTransactionTimestamp(row.createdAt)}
      </span>
    </Button>
  );
}

export function PartnerDealsFeature() {
  const router = useRouter();
  // The deals, held here so a deactivation shows everywhere at once: the
  // row, its chip, the tabs, and the drawer or page if it's open.
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
  const [deactivating, setDeactivating] = useState<Deal | null>(null);
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [referralTypes, setReferralTypes] = useState<string[]>([]);
  const [created, setCreated] = useState<DateRangeValue>(EMPTY_DATE);
  const [search, setSearch] = useState("");
  const [columnOrder, setColumnOrder] = useState<string[] | null>(null);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const reduceMotion = useReducedMotion();
  const contentEl = useContentAreaElement();
  const [morph, setMorph] = useState<DealMorph | null>(null);
  const [instantDrawer, setInstantDrawer] = useState(false);

  // Which deal is open, and where: the drawer over the list, or the full
  // page in its place. Kept here so Back lands on the list as it was left.
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pageOpen, setPageOpen] = useState(false);
  const openDeal = deals.find((d) => d.dealId === openDealId) ?? null;
  const open = (row: Deal) => {
    setInstantDrawer(false);
    setOpenDealId(row.dealId);
    setDrawerOpen(true);
  };
  const baseColumns = buildColumns(open, setDeactivating);
  const columns = reorderColumns(baseColumns, columnOrder).filter(
    (col) => !hiddenColumns.includes(col.key)
  );
  const reorderableColumns = baseColumns
    .filter((c) => c.key !== "action")
    .map((c) => ({ key: c.key, label: typeof c.header === "string" ? c.header : c.key }));
  const currentColumnOrder = columnOrder ?? reorderableColumns.map((c) => c.key);

  // Expand and Collapse as one surface (DealMorphLayer): the drawer grows
  // leftward into the full page, and the page shrinks back into the drawer.
  // The real drawer opens/closes instantly underneath while the layer covers
  // it. Reduced motion skips the layer and just swaps.
  const expandToPage = () => {
    if (reduceMotion) {
      setDrawerOpen(false);
      setPageOpen(true);
      return;
    }
    setInstantDrawer(true);
    setMorph({ kind: "expand", from: drawerRect(), to: elementRect(contentEl) });
    setDrawerOpen(false);
  };

  const collapseToDrawer = () => {
    if (reduceMotion) {
      setPageOpen(false);
      setDrawerOpen(true);
      return;
    }
    // The page stays until the morph panel has faded in over it
    // (onCovered), so it never blinks out before the panel is there.
    setInstantDrawer(true);
    setMorph({ kind: "collapse", from: elementRect(contentEl), to: drawerRect() });
  };

  const morphLayer = morph && openDeal && (
    <DealMorphLayer
      morph={morph}
      deal={openDeal}
      onCovered={() => setPageOpen(false)}
      onArrive={() => {
        if (morph.kind === "expand") setPageOpen(true);
        else setDrawerOpen(true);
      }}
      // instantDrawer is NOT cleared here: re-enabling the drawer's slide
      // while it is open restarts its slide-in. It's cleared when the drawer
      // next closes or a deal is opened from the list.
      onDone={() => setMorph(null)}
    />
  );

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return deals.filter((d) => {
      if (statusFilters.length && !statusFilters.includes(d.status)) return false;
      if (referralTypes.length && !referralTypes.includes(d.referralType)) return false;
      const day = createdDayKey(d.createdAt);
      if (created.from && day < created.from) return false;
      if (created.to && day > created.to) return false;
      if (query) {
        const haystack = [d.name, d.dealId, d.onboardingId ?? "", d.usedBy ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [deals, statusFilters, referralTypes, created, search]);

  const isFiltered =
    statusFilters.length > 0 ||
    referralTypes.length > 0 ||
    !!created.from ||
    !!created.to ||
    !!search.trim();
  const emptyCopy = isFiltered
    ? {
        title: "No deals match",
        description: "Try a different tab, date or referral type, or clear the search.",
      }
    : {
        title: "Your deals will appear here",
        description: "Create a deal to set referral pricing for a merchant's onboarding link.",
      };

  /** MOCK: no endpoint yet, so it changes the list in place. The deal goes
   *  to Deactivated with today as its date, and its link stops being shown.
   *  TODO(integration): the deactivate-deal call, confirmed against
   *  pg-dashboard, then refetch the list. */
  function confirmDeactivate() {
    if (!deactivating) return;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const target = deactivating;
    setDeals((all) =>
      all.map((d) =>
        d.dealId === target.dealId ? { ...d, status: "DEACTIVATED", deactivatedAt: stamp } : d
      )
    );
    setDeactivating(null);
    toast.success("Deal deactivated", {
      description: `${target.name}'s referral link can no longer be used.`,
    });
  }

  function handleRefresh() {
    setIsRefreshing(true);
    window.setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Deals updated");
    }, 600);
  }

  // The tab bar reads and writes the Status chip's own selection: one status
  // picks that tab; none (or several) is All.
  const tabValue = statusFilters.length === 1 ? statusFilters[0]! : "all";
  const tabBar = (
    <UnderlineTabs
      tabs={VIEW_TABS}
      value={tabValue}
      onValueChange={(v) => setStatusFilters(v === "all" ? [] : [v])}
    />
  );

  // A function, not a shared element: desktop and compact both mount it,
  // and each needs its own FilterChipGroup (see McaTransactionTable).
  const renderFilterChips = () => (
    <FilterChipGroup className="flex flex-wrap items-center gap-1.5">
      <StatusFilterChip
        options={DEAL_STATUS_OPTIONS}
        selected={statusFilters}
        onChange={setStatusFilters}
      />
      <DateRangeFilterChip
        chipKey="creation-date"
        label="Creation date"
        value={created}
        onChange={setCreated}
        align="start"
      />
      <StatusFilterChip
        label="Referral type"
        options={REFERRAL_TYPE_OPTIONS}
        selected={referralTypes}
        onChange={setReferralTypes}
      />
    </FilterChipGroup>
  );

  const renderSearch = (className: string) => (
    <RotatingSearchInput
      value={search}
      onSearch={setSearch}
      words={SEARCH_WORDS}
      className={className}
    />
  );

  const refreshButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      leftIcon={
        <Icon name="refresh" className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
      }
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
    >
      Refresh
    </Button>
  );

  const desktopControls = (
    <div className="flex flex-wrap items-center gap-2">
      {renderSearch("w-40 sm:w-56")}
      {renderFilterChips()}
      <div className="ml-auto flex items-center gap-2">
        {refreshButton}
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
          fixedReason="Always shown. A deal row is unreadable without these columns."
        />
      </div>
    </div>
  );

  // The list and the full page swap in one slot, with the morph layer in a
  // second slot that never moves: it lives through the swap it is covering.
  // (Returning the page from its own branch remounted the layer mid-way and
  // replayed the expand from the start.)
  const view =
    pageOpen && openDeal ? (
      // No page-enter fade: the morph layer is what reveals the page.
      <PartnerDealDetailPage
        deal={openDeal}
        onBack={() => setPageOpen(false)}
        onCollapse={collapseToDrawer}
      />
    ) : (
      <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
        <PageHeader
          title="Partner Deals"
          subtitle="Create referral pricing deals for your partners and track their status from creation to activation."
          actions={
            // Same size, icon and casing as Invoice management's "Create
            // invoice" (MidScopedAction: size sm, 14px plus).
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onClick={() => router.push(CREATE_DEAL_PATH)}
            >
              Create deal
            </Button>
          }
        />

        <DataTableCard<Deal>
          className="hidden lg:block"
          tabs={tabBar}
          toolbar={desktopControls}
          columns={columns}
          data={rows}
          isLoading={false}
          rowKey={(row) => row.dealId}
          onRowClick={open}
          emptyTitle={emptyCopy.title}
          emptyDescription={emptyCopy.description}
          emptyState={
            <PlaceholderState
              variant="no-transactions"
              title={emptyCopy.title}
              description={emptyCopy.description}
              className="py-16"
            />
          }
          maxBodyHeight="none"
        />

        <div className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
          <div className="border-b border-border px-4 pt-2">{tabBar}</div>
          {/* Search on its own row; chips and Refresh beneath. No Columns:
              there are no columns to arrange in the card list. */}
          <div className="space-y-2 border-b border-border px-4 py-3">
            {renderSearch("w-full")}
            <div className="flex flex-wrap items-center gap-2">
              {renderFilterChips()}
              <div className="ml-auto">{refreshButton}</div>
            </div>
          </div>
          <DataCardList<Deal>
            bordered={false}
            rows={rows}
            rowKey={(row) => row.dealId}
            isLoading={false}
            renderCard={(row) => <DealCard row={row} onOpen={open} />}
            emptyState={
              <PlaceholderState
                variant="no-transactions"
                size="sm"
                title={emptyCopy.title}
                description={emptyCopy.description}
              />
            }
          />
        </div>

        <ConfirmActionDialog
          open={!!deactivating}
          onOpenChange={(next) => {
            if (!next) setDeactivating(null);
          }}
          title="Deactivate this deal?"
          description={
            deactivating
              ? `${deactivating.name}'s referral link will stop working straight away, and no new business can use it. This can't be undone.`
              : ""
          }
          confirmLabel="Deactivate deal"
          isDestructive
          onConfirm={confirmDeactivate}
        />

        <PartnerDealDrawer
          deal={openDeal}
          open={drawerOpen}
          onOpenChange={(next) => {
            // A user close slides out as normal.
            if (!next) setInstantDrawer(false);
            setDrawerOpen(next);
          }}
          onExpand={expandToPage}
          instant={instantDrawer}
        />
      </div>
    );

  return (
    <>
      {view}
      {morphLayer}
    </>
  );
}
