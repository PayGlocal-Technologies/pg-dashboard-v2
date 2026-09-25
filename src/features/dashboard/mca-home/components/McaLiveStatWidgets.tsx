"use client";

import { useState } from "react";
import { useScopeId } from "@/lib/hooks/useScopeId";
import { formatCurrencyShort } from "@/lib/utils/format";
import { McaStatCard } from "@/features/dashboard/mca-home/components/McaStatCard";
import { useInvoiceSummary } from "@/features/dashboard/mca-invoices/hooks";
import { useCurrencySplit, useDocumentPending } from "@/features/dashboard/mca-transactions/hooks";
import { useSettlementUpcoming } from "@/features/dashboard/settlement-reports/hooks";

/**
 * The dashboard's stat widgets, each read from an endpoint the app already
 * calls elsewhere, so a widget and the page it summarises can never disagree.
 *
 * No trend or sparkline on any of them: none of these endpoints returns a
 * prior period or a series (spec 4.6 asks for one batch call that would), and
 * a stat card draws neither rather than inventing one.
 */

/** Same all-time window the Invoices page's summary opens on, so the counts
 *  here match that page's donut on arrival. End bucketed to the end of the
 *  local day, as there, so the query key is stable across renders. */
function useAllTimeWindow(): { start: number; end: number } {
  const [range] = useState(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start: 0, end: Math.floor(end.getTime() / 1000) };
  });
  return range;
}

function buildLast30Range(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  const iso = (d: Date): string => d.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

/** Collected but not yet invoiced: the same document-pending figure, and the
 *  same year-to-date window, as the Transactions page's Outstanding amount. */
export function OutstandingAmountWidget() {
  const { documentPending, isLoading } = useDocumentPending("ytd");
  const count = documentPending?.count ?? 0;
  return (
    <McaStatCard
      isLoading={isLoading}
      data={{
        title: "Outstanding amount",
        valueLabel: documentPending
          ? formatCurrencyShort(documentPending.amount, documentPending.reportingCurrency)
          : "—",
        captionLabel: `${count} transaction${count === 1 ? "" : "s"} awaiting an invoice`,
        accentColor: "var(--chart-3)",
      }}
    />
  );
}

export function ActiveInvoicesWidget() {
  const { scopeId } = useScopeId("PACB");
  const { summary, isLoading } = useInvoiceSummary(scopeId, useAllTimeWindow());
  return (
    <McaStatCard
      isLoading={isLoading}
      data={{
        title: "Active invoices",
        valueLabel: summary ? summary.totalActive.toLocaleString("en-IN") : "—",
        captionLabel: "Generated, awaiting payment",
        accentColor: "var(--chart-1)",
      }}
    />
  );
}

/** get-invoice-summary's `totalOutstanding`: unpaid invoices past their due
 *  date, which is what the Invoices page labels "Outstanding invoices". */
export function OverdueInvoicesWidget() {
  const { scopeId } = useScopeId("PACB");
  const { summary, isLoading } = useInvoiceSummary(scopeId, useAllTimeWindow());
  return (
    <McaStatCard
      isLoading={isLoading}
      data={{
        title: "Overdue invoices",
        valueLabel: summary ? summary.totalOutstanding.toLocaleString("en-IN") : "—",
        captionLabel: "Unpaid past their due date",
        accentColor: "var(--chart-3)",
      }}
    />
  );
}

export function NextSettlementWidget() {
  const { scopeId } = useScopeId("PACB");
  const { upcoming, isLoading } = useSettlementUpcoming(scopeId);
  const count = upcoming?.transactionCount ?? 0;
  return (
    <McaStatCard
      isLoading={isLoading}
      data={{
        title: "Next settlement",
        valueLabel: upcoming ? formatCurrencyShort(upcoming.amount, upcoming.currency) : "—",
        captionLabel: `${count} transaction${count === 1 ? "" : "s"}`,
        accentColor: "var(--chart-1)",
      }}
    />
  );
}

/** Largest slice of the last 30 days' currency split, the same window and
 *  endpoint the Currency Split widget draws. */
export function TopCurrencyWidget() {
  const [range] = useState(buildLast30Range);
  const { split, isLoading } = useCurrencySplit(range.startDate, range.endDate);
  const top = [...(split?.slices ?? [])]
    .filter((slice) => slice.currency !== "OTHER")
    .sort((a, b) => b.amountPct - a.amountPct)[0];
  return (
    <McaStatCard
      isLoading={isLoading}
      data={{
        title: "Top currency",
        valueLabel: top?.currency ?? "—",
        captionLabel: top
          ? `${top.amountPct}% of received volume, last 30 days`
          : "No payments in the last 30 days",
        accentColor: "var(--chart-1)",
      }}
    />
  );
}
