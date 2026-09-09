"use client";

import { useEffect, useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import { useGet, useMultipleGet, usePostQuery } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import { useResolvedMids } from "@/lib/hooks/useResolvedMids";
import { buildTxnRequestBody } from "@/lib/utils/buildTxnRequestBody";
import { mcaTxnSearchApi } from "@/features/dashboard/mca-transactions/services";
import type {
  McaTransaction,
  McaTransactionsResponse,
} from "@/features/dashboard/mca-transactions/types";
import type { TableReqBody } from "@/types/transactions";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { downloadPresignedFile } from "@/features/dashboard/mca-settlement-report/helper";
import {
  bankHolidayCalendarApi,
  ffmsSettlementDownloadApi,
  settlementDetailApi,
  settlementListApi,
  settlementOverviewApi,
  settlementUpcomingApi,
  type SettlementListParams,
} from "@/features/dashboard/mca-settlement-report/services";
import { formatDateKey } from "@/lib/utils/format";
import {
  computeNextSettlement,
  computeSettlementSchedule,
  diffInDays,
  isHolidayWithinDays,
  type HolidayInfo,
  type NextSettlementInfo,
  type SettlementSchedule,
} from "@/features/dashboard/mca-settlement-report/calendarUtils";
import type {
  FfmsSettlementDownloadResponse,
  HolidayCalendarResponse,
  SettlementDetail,
  SettlementDetailResponse,
  SettlementListResponse,
  SettlementOverviewData,
  SettlementOverviewResponse,
  SettlementRow,
  SettlementUpcomingData,
  SettlementUpcomingResponse,
} from "@/features/dashboard/mca-settlement-report/types";
import {
  mapDetailPaymentToMcaPayment,
  mapSettlementListItemToRow,
} from "@/features/dashboard/mca-settlement-report/helper";

/**
 * The settlement rail these screens are about. Production's BankHolidayCalendar
 * offers a currency picker over ALL_CODES and defaults to BASE, which is "INR";
 * settlements land in INR, so this screen only ever wants that bucket. Not a
 * picker here because the v2 design has none.
 */
const SETTLEMENT_CURRENCY = "INR";

/** How many days ahead of today counts as an "upcoming" holiday for the badge
 *  on the calendar button. Unchanged from what the mock data computed. */
const UPCOMING_HOLIDAY_WINDOW_DAYS = 7;

/**
 * Today as a YYYY-MM-DD key, resolved once on mount.
 *
 * A lazy `useState` initializer, not a bare `new Date()` in the component body:
 * the latter is impure during render (see CLAUDE.md) and would also mint a new
 * query key on every render for anything derived from it. Stable for the life of
 * the mount, which is what the calendar wants — a merchant with the page open
 * across midnight sees the date they opened it with until they navigate.
 */
export function useTodayDateKey(): string {
  const [today] = useState(() => formatDateKey(new Date()));
  return today;
}

/** First and last day of the month `monthOffset` months from `dateKey`'s month.
 *  Explicit-argument Date construction, which is deterministic and therefore
 *  render-safe, unlike an argless `new Date()`. */
function monthBounds(dateKey: string, monthOffset: number): { from: string; to: string } {
  const [year, month] = dateKey.split("-").map(Number);
  const base = new Date(year!, month! - 1 + monthOffset, 1);
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { from: formatDateKey(base), to: formatDateKey(end) };
}

/**
 * How many consecutive months a `lookaheadDays` window starting at `dateKey`
 * spans: 1 for most of the month, 2 once today is close enough to the end that
 * the window runs past it.
 *
 * The endpoint answers one calendar month per request, so this is what decides
 * whether a second request is worth making at all. A T+1 on the 31st has to see
 * the 1st, but a T+1 on the 3rd does not.
 */
function lookaheadMonthCount(dateKey: string, lookaheadDays: number): number {
  const daysLeftInMonth = diffInDays(dateKey, monthBounds(dateKey, 0).to);
  return daysLeftInMonth < lookaheadDays ? 2 : 1;
}

/**
 * Flattens one or more calendar responses into a single holiday list.
 *
 * The response buckets by country code and the same holiday can appear under
 * several countries that share a currency, so entries are deduped by date and
 * sorted, letting callers rely on the order. Takes an array because the
 * multi-month read below has one response per month to merge.
 */
function flattenHolidays(responses: (HolidayCalendarResponse | undefined)[]): HolidayInfo[] {
  const byDate = new Map<string, HolidayInfo>();
  for (const response of responses) {
    for (const entries of Object.values(response?.data?.holidays ?? {})) {
      for (const entry of entries) {
        if (entry.currency !== SETTLEMENT_CURRENCY || !entry.date) continue;
        if (!byDate.has(entry.date)) byDate.set(entry.date, { date: entry.date, name: entry.name });
      }
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Bank holidays in an inclusive YYYY-MM-DD window.
 *
 * The window must lie inside ONE calendar month: /gcc/v1/calendar rejects
 * anything wider with `GL-400-001 "Range must be within a single calendar
 * month."`. That is why pg-dashboard's getBankHolidayParams snaps to a single
 * month's first and last day, and why the multi-month read below asks per
 * month rather than widening this one.
 */
export function useBankHolidays(
  fromDate: string,
  toDate: string
): { holidays: HolidayInfo[]; isLoading: boolean } {
  const isGuestUser = useApp((s) => s.isGuestUser);
  const url = bankHolidayCalendarApi(fromDate, toDate);

  const { data, isPending } = useGet<HolidayCalendarResponse>(
    ["bank-holidays", fromDate, toDate],
    url,
    { enabled: !!url && !isGuestUser }
  );

  const holidays = useMemo(() => flattenHolidays([data]), [data]);

  return { holidays, isLoading: !!url && isPending };
}

/**
 * Bank holidays across `monthCount` consecutive months, starting with the month
 * `dateKey` falls in.
 *
 * One request PER MONTH, in parallel, merged into a single list. A single
 * request spanning the whole span is not an option — the endpoint refuses a
 * range that crosses a month boundary — and asking month by month is what
 * production does anyway, so each month is cached under the same key
 * `useBankHolidays` uses and the calendar grid's own read of a month already
 * fetched here is served from cache.
 */
export function useBankHolidayMonths(
  dateKey: string,
  monthCount: number
): { holidays: HolidayInfo[]; isLoading: boolean } {
  const isGuestUser = useApp((s) => s.isGuestUser);

  const windows = useMemo(
    () => Array.from({ length: monthCount }, (_, offset) => monthBounds(dateKey, offset)),
    [dateKey, monthCount]
  );

  const { results, isLoading } = useMultipleGet<HolidayCalendarResponse>(
    windows.map(({ from, to }) => ({
      queryKey: ["bank-holidays", from, to],
      url: bankHolidayCalendarApi(from, to),
      options: { enabled: !isGuestUser && !!bankHolidayCalendarApi(from, to) },
    }))
  );

  // No useMemo: `results` is a fresh array every render, so a dependency list
  // over it would never hit anyway. flattenHolidays is pure and runs over a few
  // dozen entries, and the React Compiler memoizes the call for us.
  const holidays = flattenHolidays(results.map((result) => result.data));

  return { holidays, isLoading };
}

export interface SettlementCalendarState {
  /** Today, as the grid's "is this cell today" comparison key. */
  today: string;
  holidays: HolidayInfo[];
  /** When the next settlement lands, and how many non-working days pushed it. */
  nextSettlement: NextSettlementInfo;
  /** Drives the amber dot on the Settlement calendar button. */
  hasUpcomingHoliday: boolean;
  /** T+1 from today, with the weekend/holiday pushout resolved. Feeds the
   *  Upcoming settlement card's date and the page's bank-holiday banner. */
  upcomingSchedule: SettlementSchedule;
  isLoading: boolean;
}

/**
 * Everything the settlement screens derive from the holiday calendar: today,
 * the holiday list, the next settlement date, and T+1's pushout.
 *
 * Fetches the current month, and the next one only in the last few days of a
 * month, when the lookahead below actually crosses into it. Nothing here reads
 * further ahead than UPCOMING_HOLIDAY_WINDOW_DAYS: the badge looks 7 days out
 * and the T+1 pushout never walks further, so on all but the last week of a
 * month this is a single request. Paging the calendar grid forward is not this
 * hook's job — the popover fetches whichever month it is showing (see
 * useBankHolidays in SettlementCalendarButton), and each month is cached under
 * the same key either way.
 *
 * The compute* helpers are unchanged — they were always pure functions over a
 * holiday list, which is exactly why swapping the list's source needed no change
 * to them.
 */
export function useSettlementCalendar(): SettlementCalendarState {
  const today = useTodayDateKey();
  const { holidays, isLoading } = useBankHolidayMonths(
    today,
    lookaheadMonthCount(today, UPCOMING_HOLIDAY_WINDOW_DAYS)
  );

  return useMemo(
    () => ({
      today,
      holidays,
      nextSettlement: computeNextSettlement(today, holidays),
      hasUpcomingHoliday: isHolidayWithinDays(today, holidays, UPCOMING_HOLIDAY_WINDOW_DAYS),
      upcomingSchedule: computeSettlementSchedule(today, holidays),
      isLoading,
    }),
    [today, holidays, isLoading]
  );
}

/**
 * Settlement overview for the Total settled card, for the given merchant + one
 * timeframe (week | month | ytd). Refetches when the timeframe toggle changes.
 * `enabled` gates on a resolved merchant id, so callers can pass "" safely.
 *
 * `keepPreviousData` matters here beyond the usual polish, because this one
 * response feeds two cards that answer different questions. `totalSettled` and
 * the chart are scoped to the timeframe; `previousSettlement` is not — it is
 * the last settlement that happened, the same figure whichever tab is active.
 * Without this, switching tabs dropped `data` to undefined until the new
 * response landed, so the Previous settled card fell to ₹0.00 and its
 * RollingNumber counted back up: a card that never changes value appeared to
 * reload on every tab press. Holding the last response keeps it still, and
 * keeps Total settled on its old figure rather than flashing zero.
 */
export function useSettlementOverview(
  merchantId: string,
  timeframe: string
): { overview: SettlementOverviewData | undefined; isLoading: boolean; isError: boolean } {
  const { data, isPending, isError } = useGet<SettlementOverviewResponse>(
    ["settlement-overview", merchantId, timeframe],
    settlementOverviewApi(merchantId, timeframe),
    { enabled: !!merchantId, placeholderData: keepPreviousData }
  );

  return { overview: data?.data, isLoading: !!merchantId && isPending, isError };
}

/**
 * Upcoming settlement headline (amount, transaction count, pending invoices).
 * No date range — always current. `enabled` gates on a resolved merchant id.
 */
export function useSettlementUpcoming(merchantId: string): {
  upcoming: SettlementUpcomingData | undefined;
  isLoading: boolean;
  isError: boolean;
} {
  const { data, isPending, isError } = useGet<SettlementUpcomingResponse>(
    ["settlement-upcoming", merchantId],
    settlementUpcomingApi(merchantId),
    { enabled: !!merchantId }
  );

  return { upcoming: data?.data, isLoading: !!merchantId && isPending, isError };
}

// ── Settlement list and detail ──────────────────────────────────────────────

export interface SettlementListResult {
  rows: SettlementRow[];
  /** Rows matching the filter across ALL pages, not just the one in hand. */
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

/**
 * The settlement list, paged server-side.
 *
 * `keepPreviousData` because this drives a table: without it, stepping to page
 * 2 empties the table to a skeleton and back, which reads as a reload rather
 * than a page turn. The old row set stays on screen until the new one lands.
 *
 * Rows come back mapped onto SettlementRow, with the non-working-day metadata
 * layered on by the caller from the live holiday calendar — the response has no
 * such field and none is asked for, see mapSettlementListItemToRow.
 */
export function useSettlementList(
  merchantId: string,
  params: SettlementListParams
): SettlementListResult {
  const isGuestUser = useApp((s) => s.isGuestUser);
  const url = settlementListApi(merchantId, params);
  const { startDate, endDate, page, limit } = params;

  const { data, isPending, isError, refetch } = useGet<SettlementListResponse>(
    ["settlement-list", merchantId, startDate ?? "", endDate ?? "", page ?? 1, limit ?? 0],
    url,
    { enabled: !!url && !isGuestUser, placeholderData: keepPreviousData }
  );

  // Rows without a settlement date are dropped, not rendered — see
  // mapSettlementListItemToRow. `totalCount` is left as the server reported it:
  // it is the count the pager is built on, and quietly decrementing it here
  // would desynchronise the page numbers from what the endpoint is paging.
  const rows = useMemo(
    () =>
      (data?.data?.settlements ?? [])
        .map((item) => mapSettlementListItemToRow(item, null))
        .filter((row): row is SettlementRow => row !== null),
    [data]
  );

  return {
    rows,
    totalCount: data?.data?.totalCount ?? 0,
    isLoading: !!url && isPending,
    isError,
    refetch: () => void refetch(),
  };
}

/**
 * One settlement in full, keyed by the pair (merchant, date). Settlements have
 * no id of their own: an account settles at most once a day.
 *
 * Returns `detail: null` for a 404 as well as for a merchant/date the account
 * does not own, which the page renders as "Settlement not found" — the same
 * outcome either way, so the caller does not branch on which.
 */
export function useSettlementDetail(
  merchantId: string,
  settlementDate: string
): { detail: SettlementDetail | null; isLoading: boolean; isError: boolean } {
  const isGuestUser = useApp((s) => s.isGuestUser);
  const url = settlementDetailApi(merchantId, settlementDate);

  const { data, isPending, isError } = useGet<SettlementDetailResponse>(
    ["settlement-detail", merchantId, settlementDate],
    url,
    { enabled: !!url && !isGuestUser }
  );

  const detail = useMemo((): SettlementDetail | null => {
    const body = data?.data;
    if (!body) return null;
    return {
      settlement: {
        id: settlementDate,
        merchantId,
        amount: body.netAmount,
        // INR by contract, not returned: settlements always land in INR.
        currency: "INR",
        transactionCount: body.transactionCount,
        date: `${settlementDate}T00:00:00+05:30`,
        // Derived by the caller against the live holiday calendar, not returned.
        paymentReceivedAt: `${settlementDate}T00:00:00+05:30`,
        affectedByNonWorkingDay: false,
      },
      account: body.settlementAccount,
      grossAmount: body.grossAmount,
      gst: body.gstDeduction,
      platformFee: body.deductionAmount,
      discountAmount: body.discountAmount ?? 0,
      offerDiscountAmount: body.offerDiscountAmount ?? 0,
      payments: (body.payments ?? []).map(mapDetailPaymentToMcaPayment),
    };
  }, [data, merchantId, settlementDate]);

  return { detail, isLoading: !!url && isPending, isError };
}

/**
 * The settlement report download, for every surface that offers one: a row in
 * the table, the "Previous settled" card, and the Download Report button on a
 * settlement's detail page. All three ask the same question, so they all come
 * through here rather than each building its own query.
 *
 * Shape is a disabled query plus an explicit trigger, mirroring pg-dashboard's
 * reportDownloadDate + refetch pattern. The endpoint is keyed by settlement
 * DATE: settlements have no id of their own.
 *
 * `merchantId` is per call rather than per hook because a UCIC-scoped list can
 * span merchants, and each row's report has to be asked for against its own.
 */
/**
 * One MCA transaction, by gid.
 *
 * There is no get-by-id endpoint: the only way to reach a single transaction is
 * the same OpenSearch POST the transactions table uses, with the gid as its
 * free-text query (that table's own search matches Transaction ID, so this is
 * the documented behaviour rather than a trick). One row is asked for and the
 * first is taken.
 *
 * Lives here rather than in mca-transactions so wiring the settlement payments
 * table to that feature's drawer needs no change inside it; only the endpoint,
 * the body builder and the row type are borrowed.
 */
export function useMcaTransactionByGid(gid: string | null): {
  transaction: McaTransaction | null;
  isLoading: boolean;
  isError: boolean;
} {
  const isGuestUser = useApp((s) => s.isGuestUser);
  const { urlMid, midFilter } = useResolvedMids("PACB");

  const body = buildTxnRequestBody(
    {},
    { searchQuery: gid ?? undefined, selectedMid: midFilter, pageLimit: 1, from: 0 }
  );

  const { data, isPending, isError } = usePostQuery<McaTransactionsResponse, TableReqBody>(
    ["mca-transaction-by-gid", urlMid, gid ?? ""],
    mcaTxnSearchApi(urlMid),
    body,
    { staleTime: 0 },
    !!gid && !isGuestUser
  );

  // Exact match only. The query is free-text, so a gid that no longer exists
  // could still return a neighbouring row, and showing the wrong transaction
  // is worse than showing none.
  const transaction = (data?.data?.data ?? []).find((row) => row.gid === gid) ?? null;

  return { transaction, isLoading: !!gid && isPending, isError };
}

/** Matches the name the bucket already uses, with the settlement date appended
 *  so successive downloads do not all collide in the browser's folder. */
const SETTLEMENT_REPORT_FILE_PREFIX = "daily_settlement_report";

export function useSettlementReportDownload(): {
  /**
   * Fire a download.
   *
   * `date` must be the bare YYYY-MM-DD settlement date, because it goes into
   * the URL path verbatim. Pass `row.id`, NOT `row.date` — the latter is the
   * display timestamp ("2026-03-16T00:00:00+05:30") and produces a URL the
   * endpoint cannot parse.
   *
   * `merchantId` is the merchant that settlement belongs to.
   */
  download: (date: string, merchantId?: string) => void;
  /** True between the click and the presigned URL resolving. */
  isDownloading: boolean;
} {
  /**
   * The fallback merchant, mirroring pg-dashboard's FfmsReportTable exactly:
   * the selected MID, else the first PACB MID.
   *
   * Deliberately NOT the page's `scopeId`. That resolves to the UCIC id for a
   * multi-MID account with nothing selected, and while the list and overview
   * endpoints accept a UCIC id, this one is per-merchant and would reject it.
   * Callers with a row pass the row's own merchant anyway; this only covers the
   * surfaces that have no row, such as the Previous settled card.
   */
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails?.mid);
  const firstPaCbMid = useApp((s) => s.paCbMids?.[0] ?? "");
  const fallbackMid = selectedMid || firstPaCbMid;
  const [target, setTarget] = useState<{ date: string; merchantId: string } | null>(null);
  const date = target?.date ?? null;
  const mid = target?.merchantId ?? "";

  const { refetch } = usePostQuery<FfmsSettlementDownloadResponse, Record<string, never>>(
    ["settlement-report-download", mid, date ?? ""],
    ffmsSettlementDownloadApi(mid, date ?? ""),
    {},
    undefined,
    false
  );

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    const run = async () => {
      try {
        const res = await refetch();
        if (cancelled) return;
        const link = res.data?.data?.presignedUrl;
        const message = res.data?.message;
        // The endpoint answers one of two ways: a ready presigned URL, or no
        // URL and a `message` explaining why (still generating, or it will be
        // emailed). Surfacing that message matters — without it a click that
        // produced no file looks like a dead button.
        // Named after the settlement it covers, so a folder of these stays
        // tellable apart — the bucket calls every one of them the same thing.
        if (link) await downloadPresignedFile(link, `${SETTLEMENT_REPORT_FILE_PREFIX}_${date}`);
        else if (message) toast.success(message);
        else toast.error("Could not generate the settlement report. Please try again.");
      } catch {
        if (!cancelled) toast.error("Could not download the settlement report. Please try again.");
      } finally {
        // Must run even on failure. Without it `target` stays set, so the
        // button spins forever AND a retry of the same date is a no-op,
        // because the effect only fires when `date` changes.
        // Reset inside the async callback, not the effect body, per CLAUDE.md.
        if (!cancelled) setTarget(null);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [date, refetch]);

  return {
    download: (nextDate: string, merchantId?: string) => {
      if (!nextDate) return;
      setTarget({ date: nextDate, merchantId: merchantId || fallbackMid });
    },
    isDownloading: !!date,
  };
}
