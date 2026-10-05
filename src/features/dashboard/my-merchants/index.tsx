"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useReducedMotion } from "framer-motion";
import { Button, DataTableCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { FilterChipGroup, StatusFilterChip } from "@/components/common/filters/FilterChips";
import {
  DrawerExpandMorph,
  drawerRect,
  elementRect,
  type DrawerMorph,
} from "@/components/common/DrawerExpandMorph";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
import { buildMerchantColumns } from "@/features/dashboard/my-merchants/columns";
import {
  MerchantDrawer,
  MerchantDrawerBody,
  MERCHANT_DRAWER_WIDTH_PX,
} from "@/features/dashboard/my-merchants/components/MerchantDrawer";
import { MerchantDetailPage } from "@/features/dashboard/my-merchants/components/MerchantDetailPage";
import { lifecycleStatus, needsAttention } from "@/features/dashboard/my-merchants/derive";
import { usePartnerMerchants } from "@/features/dashboard/my-merchants/hooks";
import type { PartnerMerchant } from "@/features/dashboard/my-merchants/types";

const PAGE_SIZE = 10;

/**
 * The list's views. Lifecycle statuses plus "Needs attention", which is not
 * a status: it is every merchant the partner can do something about right
 * now, whatever stage they are at. Invited merchants sit under Onboarding.
 * Assisted onboarding is a mode, so it is a filter, not a tab.
 */
const TABS: { value: string; label: string; match: (m: PartnerMerchant) => boolean }[] = [
  { value: "all", label: "All", match: () => true },
  { value: "attention", label: "Needs attention", match: needsAttention },
  {
    value: "onboarding",
    label: "Onboarding",
    match: (m) => ["INVITED", "ONBOARDING"].includes(lifecycleStatus(m)),
  },
  {
    value: "under-review",
    label: "Under review",
    match: (m) => lifecycleStatus(m) === "UNDER_REVIEW",
  },
  { value: "live", label: "Live", match: (m) => lifecycleStatus(m) === "LIVE" },
  { value: "rejected", label: "Rejected", match: (m) => lifecycleStatus(m) === "REJECTED" },
  {
    value: "deactivated",
    label: "Deactivated",
    match: (m) => lifecycleStatus(m) === "DEACTIVATED",
  },
];

const PRODUCT_OPTIONS = [
  { value: "PG", label: "Payment Gateway" },
  { value: "MCA", label: "MCA" },
];

const MODE_OPTIONS = [
  { value: "self", label: "Self-serve" },
  { value: "assisted", label: "Assisted" },
];

function setScrollTop(el: HTMLElement, value: number): void {
  el.scrollTop = value;
}

/**
 * Partner > Merchants. The list answers "who needs my attention?"; a row
 * opens a quick drawer ("what's happening?"); View full details opens the
 * merchant workspace in place of the list, with the same drawer-to-page
 * hand-off as MCA and PA Transactions. Back returns to the list as it was.
 */
export function MyMerchantsFeature() {
  const { data: merchants, isLoading, isError } = usePartnerMerchants();
  // Captured once, for "6 days" and "Yesterday" (no Date.now() in render).
  const [nowMs] = useState(() => Date.now());

  // ?status=live etc. from the partner dashboard's links. Read once.
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(() => {
    const requested = searchParams.get("status");
    return TABS.some((t) => t.value === requested) ? requested! : "all";
  });
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [modes, setModes] = useState<string[]>([]);

  const filterKey = JSON.stringify([tab, search, products, modes]);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });

  const baseRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merchants
      .filter((m) => {
        if (q) {
          const haystack = [m.name, m.businessName, m.email, m.phone, m.onboardingId]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        if (products.length && !m.products.some((p) => products.includes(p))) return false;
        if (modes.length && !modes.includes(m.assisted ? "assisted" : "self")) return false;
        return true;
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [merchants, search, products, modes]);

  const activeTab = TABS.find((t) => t.value === tab) ?? TABS[0]!;
  const rows = baseRows.filter(activeTab.match);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(pageState.key === filterKey ? pageState.page : 1, pageCount);
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── Drawer, then the full page in place ──────────────────────────────────
  const contentEl = useContentAreaElement();
  const reduceMotion = useReducedMotion();
  const slotRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<PartnerMerchant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pageOpen, setPageOpen] = useState(false);
  const [morph, setMorph] = useState<DrawerMorph | null>(null);
  const [instantDrawer, setInstantDrawer] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  const openDrawer = (m: PartnerMerchant) => {
    setSelected(m);
    setInstantDrawer(false);
    setDrawerOpen(true);
  };
  const onDrawerOpenChange = (open: boolean) => {
    if (!open) setInstantDrawer(false);
    setDrawerOpen(open);
  };
  const showPage = () => {
    setPageOpen(true);
    if (contentEl) setScrollTop(contentEl, 0);
  };
  const hidePage = () => setPageOpen(false);
  const expandToPage = () => {
    if (contentEl) setScrollPosition(contentEl.scrollTop);
    if (reduceMotion) {
      setDrawerOpen(false);
      showPage();
      return;
    }
    const slot = elementRect(slotRef.current);
    setInstantDrawer(true);
    setMorph({
      kind: "expand",
      from: drawerRect(MERCHANT_DRAWER_WIDTH_PX),
      to: elementRect(contentEl),
      page: {
        top: slot.top + (contentEl ? contentEl.scrollTop : window.scrollY),
        left: slot.left,
        width: slot.width,
      },
    });
    setDrawerOpen(false);
  };
  const collapseToDrawer = () => {
    if (reduceMotion) {
      hidePage();
      setDrawerOpen(true);
      return;
    }
    const slot = elementRect(slotRef.current);
    setInstantDrawer(true);
    setMorph({
      kind: "collapse",
      from: elementRect(contentEl),
      to: drawerRect(MERCHANT_DRAWER_WIDTH_PX),
      page: { top: slot.top, left: slot.left, width: slot.width },
    });
  };
  const backToList = () => {
    hidePage();
    setSelected(null);
  };
  useEffect(() => {
    if (!pageOpen && contentEl) setScrollTop(contentEl, scrollPosition);
  }, [pageOpen, contentEl, scrollPosition]);

  const hasFilters = !!search.trim() || products.length > 0 || modes.length > 0 || tab !== "all";
  const emptyCopy =
    tab === "attention" && !search.trim() && !products.length && !modes.length
      ? {
          title: "Nothing needs your attention",
          description: "Every merchant is either moving along or waiting on PayGlocal.",
        }
      : hasFilters
        ? {
            title: "No matching merchants",
            description: "Try a different search, or clear a filter.",
          }
        : {
            title: "Your merchants will appear here",
            description: "Share your referral link, and each merchant who signs up shows up here.",
          };

  const tabBar = (
    <UnderlineTabs
      tabs={TABS.map((t) => ({
        value: t.value,
        label: (
          <span className="inline-flex items-center gap-1.5">
            {t.label}
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {baseRows.filter(t.match).length}
            </span>
          </span>
        ),
      }))}
      value={tab}
      onValueChange={setTab}
    />
  );

  return (
    <>
      <div ref={slotRef} className="page-enter mx-auto max-w-[1400px] space-y-4">
        {pageOpen && selected ? (
          <MerchantDetailPage
            merchant={selected}
            nowMs={nowMs}
            onBack={backToList}
            onCollapse={collapseToDrawer}
          />
        ) : (
          <>
            <PageHeader
              title="Merchant Activation"
              subtitle="Merchants you referred, from invite to live"
            />
            <DataTableCard<PartnerMerchant>
              tabs={tabBar}
              toolbar={
                <div className="flex flex-wrap items-center gap-2">
                  <RotatingSearchInput
                    value={search}
                    onSearch={setSearch}
                    words={["merchant name", "email", "onboarding ID"]}
                    className="w-40 sm:w-56"
                  />
                  <div className="hidden h-5 w-px bg-border sm:block" />
                  <FilterChipGroup className="flex flex-wrap items-center gap-1.5">
                    <StatusFilterChip
                      label="Product"
                      options={PRODUCT_OPTIONS}
                      selected={products}
                      onChange={setProducts}
                    />
                    <StatusFilterChip
                      label="Onboarding mode"
                      options={MODE_OPTIONS}
                      selected={modes}
                      onChange={setModes}
                    />
                  </FilterChipGroup>
                </div>
              }
              errorState={
                isError ? (
                  <PlaceholderState
                    variant="error"
                    title="Couldn't load merchants"
                    description="Something went wrong while fetching your merchants."
                    className="py-14"
                  />
                ) : undefined
              }
              emptyState={
                <PlaceholderState
                  variant="no-data"
                  title={emptyCopy.title}
                  description={emptyCopy.description}
                  className="py-14"
                />
              }
              emptyTitle={emptyCopy.title}
              emptyDescription={emptyCopy.description}
              columns={buildMerchantColumns(nowMs)}
              data={pageRows}
              isLoading={isLoading}
              rowKey={(m) => m.onboardingId}
              onRowClick={openDrawer}
              pagination={{
                mode: "page",
                page,
                pageSize: PAGE_SIZE,
                total: rows.length,
                onPageChange: (next) => setPageState({ key: filterKey, page: next }),
              }}
              maxBodyHeight="none"
              rowAction={(m) => (
                <Button
                  variant="outline"
                  size="sm"
                  rightIcon={<Icon name="chevron-right" className="h-2.5 w-2.5" />}
                  className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap shadow-none opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                  onClick={() => openDrawer(m)}
                >
                  View details
                </Button>
              )}
            />
          </>
        )}
      </div>

      <MerchantDrawer
        merchant={selected}
        open={drawerOpen}
        onOpenChange={onDrawerOpenChange}
        onExpand={expandToPage}
        nowMs={nowMs}
        instant={instantDrawer}
      />
      {morph && selected && (
        <DrawerExpandMorph
          key={morph.kind}
          morph={morph}
          drawerWidthPx={MERCHANT_DRAWER_WIDTH_PX}
          drawerContent={<MerchantDrawerBody merchant={selected} nowMs={nowMs} />}
          pageContent={
            <MerchantDetailPage
              merchant={selected}
              nowMs={nowMs}
              onBack={() => {}}
              onCollapse={() => {}}
            />
          }
          onCovered={hidePage}
          onArrive={morph.kind === "expand" ? showPage : () => setDrawerOpen(true)}
          onDone={() => setMorph(null)}
        />
      )}
    </>
  );
}
