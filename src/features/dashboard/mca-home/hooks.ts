"use client";

import { useMemo } from "react";
import { useGet } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import {
  clientAnalyticsApi,
  mcaNeedsAttentionApi,
  mcaRevenueTrendByMidApi,
  mcaRevenueTrendByUcicApi,
  mcaTopClientsByMidApi,
  mcaTopClientsByUcicApi,
} from "@/features/dashboard/mca-home/services";
import type {
  ClientAnalyticsRecord,
  ClientAnalyticsResponse,
  NeedsAttentionInvoice,
  NeedsAttentionResponse,
  RevenueTrendData,
  RevenueTrendResponse,
  TopClientRow,
  TopClientsResponse,
} from "@/features/dashboard/mca-home/types";

/**
 * Window the Client analytics card reads. The card has no date picker, so this
 * is fixed at the value production's own Client Insights select defaults to
 * ("30"). If the design later grows a picker, pass the value through instead of
 * changing this.
 */
const CLIENT_ANALYTICS_DAYS = "30";

/**
 * How many rows the card renders. The card is a fixed-height panel beside the
 * revenue chart, and the endpoint returns the merchant's whole client book, so
 * the list is capped here rather than letting the card grow to whatever came
 * back. Matches the number of rows the card was designed against.
 */
const CLIENT_ANALYTICS_ROW_LIMIT = 5;

export interface ClientAnalyticsRow {
  name: string;
  amount: number;
}

/** Decimal strings, defensively — an unparseable amount sorts last rather than
 *  poisoning the whole list with NaN. */
function toAmount(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Sums one client's rows across several MIDs, keeping the first spelling of the
 * client's name it sees. Reproduces pg-dashboard's mergePacbClientRows
 * (features/dashboard/components/ClientWiseInsights.tsx): a multi-MID merchant
 * invoicing the same client from two MIDs should see one row, not two.
 */
function mergeRowsAcrossMids(
  byMid: Record<string, ClientAnalyticsRecord[]>,
  mids: string[]
): ClientAnalyticsRow[] {
  const totals = new Map<string, number>();
  for (const mid of mids) {
    for (const record of byMid[mid] ?? []) {
      if (!record.client) continue;
      totals.set(record.client, (totals.get(record.client) ?? 0) + toAmount(record.totalAmount));
    }
  }
  return [...totals.entries()].map(([name, amount]) => ({ name, amount }));
}

/**
 * Top clients by amount received, for the MCA dashboard's Client analytics card.
 *
 * Scoped to the merchant's PACB MIDs: the endpoint returns a map keyed by
 * merchant id covering the whole session, so picking the right keys out of it is
 * the only scoping there is. A partner user carries their MID in the path
 * elsewhere and has exactly one here, hence the urlMid branch.
 *
 * Sorted descending and capped, so the card's bar widths stay meaningful (they
 * are scaled against the top row) and its height stays fixed.
 */
export function useMcaClientAnalytics(): {
  rows: ClientAnalyticsRow[];
  /** The window these rows cover, in days. Returned rather than kept private so
   *  the card can name the period it is showing without a second constant that
   *  could drift from the one the query actually used. */
  days: string;
  isLoading: boolean;
  isError: boolean;
} {
  const { urlMid, midFilter, isReady } = useResolvedMids("PACB");
  const isGuestUser = useApp((s) => s.isGuestUser);

  const mids = useMemo(
    () => (urlMid ? [urlMid] : (midFilter?.value ?? [])),
    [urlMid, midFilter?.value]
  );

  const { data, isPending, isError } = useGet<ClientAnalyticsResponse>(
    ["mca-client-analytics", CLIENT_ANALYTICS_DAYS, mids.join(",")],
    clientAnalyticsApi(CLIENT_ANALYTICS_DAYS),
    { enabled: isReady && mids.length > 0 && !isGuestUser }
  );

  const rows = useMemo(() => {
    if (!data?.data) return [];
    return mergeRowsAcrossMids(data.data, mids)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, CLIENT_ANALYTICS_ROW_LIMIT);
  }, [data, mids]);

  return {
    rows,
    days: CLIENT_ANALYTICS_DAYS,
    isLoading: isReady && mids.length > 0 && isPending,
    isError,
  };
}

/**
 * Revenue trend behind McaRevenueCard. Scoped like useMcaOverview: a selected
 * MID uses the per-merchant endpoint, otherwise the UCIC roll-up.
 *
 * NOT consumed by the card yet — the card still renders mock. This is the wiring
 * kept ready so switching to live data is a one-line source swap once the mock
 * has been eyeballed. Empty dates default the window on the backend.
 */
export function useRevenueTrend(
  startDate: string,
  endDate: string
): { trend: RevenueTrendData | undefined; isLoading: boolean; isError: boolean } {
  const { urlMid, isReady } = useResolvedMids("PACB");
  const profile = useApp((s) => s.profile);
  const ucicId = profile?.ucicId ?? "";
  const scopeId = urlMid || ucicId;
  const url = urlMid
    ? mcaRevenueTrendByMidApi(urlMid, startDate, endDate)
    : mcaRevenueTrendByUcicApi(ucicId, startDate, endDate);

  const { data, isPending, isError } = useGet<RevenueTrendResponse>(
    ["mca-revenue-trend", scopeId, startDate, endDate],
    url,
    { enabled: isReady && !!scopeId }
  );

  return { trend: data?.data, isLoading: isReady && !!scopeId && isPending, isError };
}

/**
 * Top clients by amount over a date range, scoped like useMcaOverview. Backs the
 * Client analytics list. Rows carry their own `barPct`, so the card renders the
 * bar directly instead of deriving it.
 */
export function useTopClients(
  startDate: string,
  endDate: string,
  limit = 5
): {
  clients: TopClientRow[];
  reportingCurrency: string | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { urlMid, isReady } = useResolvedMids("PACB");
  const profile = useApp((s) => s.profile);
  const ucicId = profile?.ucicId ?? "";
  const scopeId = urlMid || ucicId;
  const url = urlMid
    ? mcaTopClientsByMidApi(urlMid, startDate, endDate, limit)
    : mcaTopClientsByUcicApi(ucicId, startDate, endDate, limit);

  const { data, isPending, isError } = useGet<TopClientsResponse>(
    ["mca-top-clients", scopeId, startDate, endDate, limit],
    url,
    { enabled: isReady && !!scopeId }
  );

  return {
    clients: data?.data?.rows ?? [],
    reportingCurrency: data?.data?.reportingCurrency,
    isLoading: isReady && !!scopeId && isPending,
    isError,
  };
}

/**
 * Invoices needing attention (overdue / due soon) for the dashboard's Needs
 * attention panel. Merchant-scoped in the path — a selected MID, else the UCIC
 * roll-up — mirroring useRevenueTrend/useTopClients above.
 *
 * Asked for without a `limit`, deliberately: the card previews the first couple
 * of rows but names the total, and a limited response cannot be trusted to
 * report a total beyond what it returned. One unlimited query serves both the
 * card and its "View all" drawer — same key, so they share a single request and
 * the drawer opens against data already in hand rather than fetching again.
 *
 * Rows are returned in the order the endpoint gave them (overdue first, then
 * due soon, each by due date). Nothing here re-sorts or regroups them.
 */
export function useNeedsAttention(): {
  invoices: NeedsAttentionInvoice[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
} {
  const { urlMid, isReady } = useResolvedMids("PACB");
  const profile = useApp((s) => s.profile);
  const ucicId = profile?.ucicId ?? "";
  const scopeId = urlMid || ucicId;
  const enabled = isReady && !!scopeId;

  const { data, isPending, isError } = useGet<NeedsAttentionResponse>(
    ["mca-needs-attention", scopeId],
    mcaNeedsAttentionApi(scopeId),
    { enabled }
  );

  return {
    invoices: data?.data?.data ?? [],
    totalCount: data?.data?.totalCount ?? 0,
    isLoading: enabled && isPending,
    isError,
  };
}
