"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTableCard, PageHeader } from "@/components/ui";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { TimeRangeTabs } from "@/components/common/TimeRangeTabs";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import {
  DateFilterChip,
  FilterChipGroup,
  StatusFilterChip,
} from "@/components/common/filters/FilterChips";
import { McaStatCard } from "@/features/dashboard/mca-home/components/McaStatCard";
import { inr } from "@/features/dashboard/partner-home/format";
import { buildPortfolioColumns } from "@/features/dashboard/merchant-portfolio/columns";
import {
  COMPARISON_LABEL,
  PERIOD_OPTIONS,
  portfolioPath,
  summarise,
  type DateRange,
} from "@/features/dashboard/merchant-portfolio/derive";
import { usePortfolioMerchants } from "@/features/dashboard/merchant-portfolio/hooks";
import type {
  PortfolioMerchant,
  PortfolioPeriod,
} from "@/features/dashboard/merchant-portfolio/types";

const PAGE_SIZE = 10;

const PRODUCT_OPTIONS = [
  { value: "PA", label: "Payment Gateway" },
  { value: "MCA", label: "MCA" },
];

/** Live by default; deactivated merchants stay one tab away, history intact. */
const STATUS_TABS = [
  { value: "LIVE", label: "Live" },
  { value: "DEACTIVATED", label: "Deactivated" },
  { value: "all", label: "All" },
] as const;

const PERIOD_NOUN: Record<PortfolioPeriod, string> = {
  month: "this month",
  quarter: "in the last 3 months",
  year: "this year",
  custom: "in this range",
};

/** YYYY-MM-DD for a Date, local time. */
function dateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Partner > Merchant Portfolio: "How are my live merchants performing?"
 * A period-scoped summary, then the portfolio table. A row opens the
 * merchant's full-page portfolio view (its own route, shared with
 * Transaction Overview and Merchant Activation's links). Merchants not yet
 * live belong to Merchant Activation and never appear here.
 */
export function MerchantPortfolioFeature() {
  const router = useRouter();
  const { data: merchants, isLoading, isError } = usePortfolioMerchants();
  const [nowMs] = useState(() => Date.now());

  const searchParams = useSearchParams();
  const [period, setPeriod] = useState<PortfolioPeriod>(() => {
    const p = searchParams.get("period");
    return PERIOD_OPTIONS.some((o) => o.value === p) ? (p as PortfolioPeriod) : "month";
  });
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [statusTab, setStatusTab] = useState<string>("LIVE");

  const custom = useMemo<DateRange | undefined>(
    () =>
      period === "custom" && customRange.from
        ? { from: customRange.from, to: customRange.to || customRange.from }
        : undefined,
    [period, customRange.from, customRange.to]
  );

  const onPeriodChange = (next: PortfolioPeriod) => {
    setPeriod(next);
    // Custom opens on the last 30 days, so it never starts blank.
    if (next === "custom" && !customRange.from) {
      const to = new Date();
      const from = new Date(to.getTime() - 29 * 86_400_000);
      setCustomRange({ from: dateKey(from), to: dateKey(to) });
    }
  };

  const summary = useMemo(() => summarise(merchants, period, custom), [merchants, period, custom]);

  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merchants.filter((m) => {
      if (products.length && !m.products.some((p) => products.includes(p))) return false;
      if (q && !`${m.name} ${m.merchantId} ${m.email}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [merchants, search, products]);
  const rows = statusTab === "all" ? searched : searched.filter((m) => m.status === statusTab);

  const comparison = period === "custom" ? undefined : COMPARISON_LABEL[period];
  const avg = (n: number, d: number) => (d > 0 ? n / d : 0);
  const cards = [
    {
      title: "Live merchants",
      valueLabel: summary.liveMerchants.toLocaleString("en-IN"),
      captionLabel:
        summary.newlyLive > 0
          ? `${summary.newlyLive} went live ${PERIOD_NOUN[period]}`
          : `None went live ${PERIOD_NOUN[period]}`,
      footer: `${merchants.filter((m) => m.status === "DEACTIVATED").length} deactivated`,
    },
    {
      title: "Gross volume",
      valueLabel: inr(summary.totals.grossVolume),
      trendPct: summary.changePct.grossVolume,
      footer: `Avg ${inr(avg(summary.totals.grossVolume, summary.liveMerchants))} per live merchant`,
    },
    {
      title: "Transactions",
      valueLabel: summary.totals.transactions.toLocaleString("en-IN"),
      trendPct: summary.changePct.transactions,
      footer: `Avg ticket ${inr(avg(summary.totals.grossVolume, summary.totals.transactions))}`,
    },
    {
      title: "Commission earned",
      valueLabel: inr(summary.totals.commission),
      trendPct: summary.changePct.commission,
      footer: `${(avg(summary.totals.commission, summary.totals.grossVolume) * 100).toFixed(2)}% of gross volume`,
    },
  ];

  const openMerchant = (m: PortfolioMerchant, tab?: "overview" | "transactions") =>
    router.push(portfolioPath(m.merchantId, tab));

  const narrowed = !!search.trim() || products.length > 0;
  const emptyCopy = narrowed
    ? { title: "No matching merchants", description: "Try a different search, or clear a filter." }
    : {
        title: "Your live merchants will appear here",
        description:
          "Once a merchant you referred goes live, their payments and the commission they earn you show up here.",
      };

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-4">
      <PageHeader
        title="Merchant Portfolio"
        subtitle="View your live merchants, track their payment activity and monitor the business they bring to PayGlocal."
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Portfolio performance
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {period === "custom" && (
              <FilterChipGroup className="flex items-center">
                <DateFilterChip label="Date range" value={customRange} onChange={setCustomRange} />
              </FilterChipGroup>
            )}
            <TimeRangeTabs
              options={PERIOD_OPTIONS}
              value={period}
              onValueChange={onPeriodChange}
              label="Portfolio period"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ footer, ...card }) => (
            <McaStatCard
              key={card.title}
              isLoading={isLoading}
              data={{
                ...card,
                // Only a real comparison shows a trend; otherwise the period.
                ...(card.trendPct === undefined && !card.captionLabel
                  ? {
                      captionLabel:
                        period === "custom"
                          ? "No comparison for a custom range"
                          : "Not enough history to compare",
                    }
                  : {}),
                comparisonLabel: comparison,
                // The card draws no sparkline here (footer takes its place).
                accentColor: "var(--chart-2)",
              }}
              footer={<p className="text-[12px] text-muted-foreground">{footer}</p>}
            />
          ))}
        </div>
      </section>

      <DataTableCard<PortfolioMerchant>
        tabs={
          <UnderlineTabs
            tabs={STATUS_TABS.map((t) => ({
              value: t.value,
              label: (
                <span className="inline-flex items-center gap-1.5">
                  {t.label}
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {t.value === "all"
                      ? searched.length
                      : searched.filter((m) => m.status === t.value).length}
                  </span>
                </span>
              ),
            }))}
            value={statusTab}
            onValueChange={setStatusTab}
          />
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <RotatingSearchInput
              value={search}
              onSearch={setSearch}
              words={["merchant name", "merchant ID", "email"]}
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
            </FilterChipGroup>
          </div>
        }
        errorState={
          isError ? (
            <PlaceholderState
              variant="error"
              title="Couldn't load your portfolio"
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
        columns={buildPortfolioColumns({
          period,
          custom,
          nowMs,
          onViewTransactions: (m) => openMerchant(m, "transactions"),
        })}
        data={rows}
        isLoading={isLoading}
        rowKey={(m) => m.merchantId}
        onRowClick={(m) => openMerchant(m)}
        pagination={{ mode: "client", pageSize: PAGE_SIZE }}
        maxBodyHeight="none"
      />
    </div>
  );
}
