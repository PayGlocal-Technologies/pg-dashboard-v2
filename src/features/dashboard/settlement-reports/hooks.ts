"use client";

import { useMemo, useState } from "react";
import { useGet } from "@/lib/api/hooks";
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
 * Bank holidays in an inclusive YYYY-MM-DD window.
 *
 * Endpoint and month-snapped window are pg-dashboard's; the flattening is ours,
 * because the response buckets by country code and the same holiday can appear
 * under several countries that share a currency. Deduped by date so a day is
 * marked once on the grid, and sorted so callers can rely on the order.
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

  const holidays = useMemo(() => {
    const byCountry = data?.data?.holidays ?? {};
    const byDate = new Map<string, HolidayInfo>();
    for (const entries of Object.values(byCountry)) {
      for (const entry of entries) {
        if (entry.currency !== SETTLEMENT_CURRENCY || !entry.date) continue;
        if (!byDate.has(entry.date)) byDate.set(entry.date, { date: entry.date, name: entry.name });
      }
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  return { holidays, isLoading: !!url && isPending };
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
 * Window is today's month through the next two, which is what the two consumers
 * between them need: the banner and the Upcoming settlement card only look a few
 * days ahead, and the calendar's own grid fetches whichever month it is showing
 * separately (see useBankHolidays in SettlementCalendarButton). Three months in
 * one request rather than one, because a T+1 late in December has to see January.
 *
 * The compute* helpers are unchanged — they were always pure functions over a
 * holiday list, which is exactly why swapping the list's source needed no change
 * to them.
 */
export function useSettlementCalendar(): SettlementCalendarState {
  const today = useTodayDateKey();
  const { from } = monthBounds(today, 0);
  const { to } = monthBounds(today, 2);
  const { holidays, isLoading } = useBankHolidays(from, to);

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
 */
export function useSettlementOverview(
  merchantId: string,
  timeframe: string
): { overview: SettlementOverviewData | undefined; isLoading: boolean; isError: boolean } {
  const { data, isPending, isError } = useGet<SettlementOverviewResponse>(
    ["settlement-overview", merchantId, timeframe],
    settlementOverviewApi(merchantId, timeframe),
    { enabled: !!merchantId }
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
