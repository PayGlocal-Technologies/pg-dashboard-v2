// Settlement-calendar domain logic only: the T+1 working-day math, the holiday
// rules, and the month grid.
//
// Date formatting is not here. The date-key primitives (parseDateKey /
// formatDateKey) and every "YYYY-MM-DD" display helper live in
// @/lib/utils/format alongside the app's other date formatting, because they are
// not calendar-specific — the payment-links duration filter needs them too, and
// used to import them from this file to get them.
import { formatDateKey, parseDateKey } from "@/lib/utils/format";

export interface HolidayInfo {
  /** YYYY-MM-DD */
  date: string;
  name: string;
}

export interface NextSettlementInfo {
  /** YYYY-MM-DD */
  date: string;
  skippedDays: number;
  reason: string | null;
}

export interface CalendarCell {
  /** YYYY-MM-DD */
  dateKey: string;
  day: number;
  inCurrentMonth: boolean;
}

export type NonWorkingDayReason = "weekend" | "holiday";

/** T+1 settlement math, working-day aware. Weekends and bank holidays never
 * count as a settlement day, see computeSettlementSchedule() below. */
export interface SettlementSchedule {
  /** YYYY-MM-DD, the first genuine working day at or after payment date + 1. */
  settlementDate: string;
  affectedByNonWorkingDay: boolean;
  /** Why the raw T+1 candidate got pushed out, null when unaffected. A
   * holiday landing on the weekend-adjusted business day takes priority over
   * an already-crossed weekend, that's the day the merchant actually needs
   * explained (see e.g. a Friday payment pushed to Tuesday by a Monday
   * holiday, the intervening Sat/Sun is not itself the reason). */
  nonWorkingDayReason: NonWorkingDayReason | null;
  /** YYYY-MM-DD of the single non-working day to call out in the UI. */
  nonWorkingDayDate: string | null;
  /** Holiday name, only set when nonWorkingDayReason === "holiday". */
  nonWorkingDayName: string | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

export function diffInDays(fromKey: string, toKey: string): number {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * T+1 settlement math. Walks forward from `paymentDateKey + 1`, treating both
 * weekends and bank holidays as non-working days, banks don't move money on
 * either. Only the single non-working day the merchant actually needs
 * explained is reported back: a holiday found while resolving a
 * weekend-adjusted business day overrides an already-crossed weekend, since
 * that's the day that changed the outcome (see the module-level doc comment
 * on SettlementSchedule for the worked Friday/Monday-holiday example).
 */
export function computeSettlementSchedule(
  paymentDateKey: string,
  holidays: HolidayInfo[]
): SettlementSchedule {
  const holidayMap = new Map(holidays.map((h) => [h.date, h.name]));

  let candidate = addDays(paymentDateKey, 1);
  let nonWorkingDayDate: string | null = null;
  let nonWorkingDayReason: NonWorkingDayReason | null = null;
  let nonWorkingDayName: string | null = null;

  while (true) {
    const date = parseDateKey(candidate);

    if (isWeekend(date)) {
      if (!nonWorkingDayReason) {
        nonWorkingDayDate = candidate;
        nonWorkingDayReason = "weekend";
      }
      candidate = addDays(candidate, 1);
      continue;
    }

    const holidayName = holidayMap.get(candidate);
    if (holidayName) {
      if (nonWorkingDayReason !== "holiday") {
        nonWorkingDayDate = candidate;
        nonWorkingDayReason = "holiday";
        nonWorkingDayName = holidayName;
      }
      candidate = addDays(candidate, 1);
      continue;
    }

    break;
  }

  return {
    settlementDate: candidate,
    affectedByNonWorkingDay: nonWorkingDayReason !== null,
    nonWorkingDayReason,
    nonWorkingDayDate,
    nonWorkingDayName,
  };
}

/** Walks forward from the day after `todayKey` to the next working day,
 * weekends included, used by the settlement calendar widget's "next
 * settlement" marker. Thin wrapper over computeSettlementSchedule() that
 * keeps its older, narrower return shape. */
export function computeNextSettlement(
  todayKey: string,
  holidays: HolidayInfo[]
): NextSettlementInfo {
  const schedule = computeSettlementSchedule(todayKey, holidays);
  const reason =
    schedule.nonWorkingDayReason === "holiday"
      ? schedule.nonWorkingDayName
      : schedule.nonWorkingDayReason === "weekend"
        ? "the weekend"
        : null;

  return {
    date: schedule.settlementDate,
    skippedDays: schedule.affectedByNonWorkingDay ? 1 : 0,
    reason,
  };
}

export function isHolidayWithinDays(
  todayKey: string,
  holidays: HolidayInfo[],
  withinDays: number
): boolean {
  return holidays.some((h) => {
    const diff = diffInDays(todayKey, h.date);
    return diff >= 0 && diff <= withinDays;
  });
}

/** Always returns 42 cells (6 full weeks) so the grid height stays constant across months. */
export function buildMonthGrid(year: number, monthIndex: number): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, monthIndex, 0).getDate();

  const cells: CalendarCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    cells.push({
      dateKey: formatDateKey(new Date(year, monthIndex - 1, day)),
      day,
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      dateKey: formatDateKey(new Date(year, monthIndex, day)),
      day,
      inCurrentMonth: true,
    });
  }

  const trailingCount = 42 - cells.length;
  for (let day = 1; day <= trailingCount; day++) {
    cells.push({
      dateKey: formatDateKey(new Date(year, monthIndex + 1, day)),
      day,
      inCurrentMonth: false,
    });
  }

  return cells;
}
