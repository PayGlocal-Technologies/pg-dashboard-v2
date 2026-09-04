"use client";

import { useMemo, useState } from "react";
import { keepPreviousData } from "@tanstack/react-query";
import { useGet, useMultipleGet } from "@/lib/api/hooks";
import { useApp } from "@/stores/useApp";
import {
  bankHolidayCalendarApi,
  settlementOverviewApi,
  settlementUpcomingApi,
} from "@/features/dashboard/settlement-reports/services";
import { formatDateKey } from "@/lib/utils/format";
import {
  computeNextSettlement,
  computeSettlementSchedule,
  diffInDays,
  isHolidayWithinDays,
  type HolidayInfo,
  type NextSettlementInfo,
  type SettlementSchedule,
} from "@/features/dashboard/settlement-reports/calendarUtils";
import type {
  HolidayCalendarResponse,
  SettlementOverviewData,
  SettlementOverviewResponse,
  SettlementUpcomingData,
  SettlementUpcomingResponse,
} from "@/features/dashboard/settlement-reports/types";

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
