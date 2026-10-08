"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Shimmer } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import { formatMonthYearLabel, formatShortDate } from "@/lib/utils/format";
import {
  buildMonthGrid,
  diffInDays,
  type CalendarCell,
  type HolidayInfo,
} from "@/features/dashboard/settlement-reports/calendarUtils";
import { useBankHolidays } from "@/features/dashboard/settlement-reports/hooks";
import type { SettlementRow } from "@/features/dashboard/settlement-reports/types";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function todayParts(todayKey: string): { year: number; month: number } {
  const [year, month] = todayKey.split("-").map(Number);
  return { year: year!, month: month! - 1 };
}

/** First and last day of the month being viewed, as the inclusive YYYY-MM-DD
 *  window /gcc/v1/calendar takes. Production snaps to whole months the same way
 *  (getBankHolidayParams), so a month is either fully fetched or not at all. */
function monthWindow(year: number, monthIndex: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const month = pad(monthIndex + 1);
  return { from: `${year}-${month}-01`, to: `${year}-${month}-${pad(lastDay)}` };
}

type DayDetail =
  | { kind: "settled"; dateKey: string; amount: number }
  | { kind: "holiday"; dateKey: string; name: string }
  | { kind: "next-settlement"; dateKey: string }
  | { kind: "none"; dateKey: string };

function getDayDetail(
  dateKey: string,
  settledRowByDate: Map<string, SettlementRow>,
  holidayMap: Map<string, string>,
  nextSettlementDate: string
): DayDetail {
  if (dateKey === nextSettlementDate) return { kind: "next-settlement", dateKey };
  const holidayName = holidayMap.get(dateKey);
  if (holidayName) return { kind: "holiday", dateKey, name: holidayName };
  const settledRow = settledRowByDate.get(dateKey);
  if (settledRow) return { kind: "settled", dateKey, amount: settledRow.amount };
  return { kind: "none", dateKey };
}

const DETAIL_ICON: Record<DayDetail["kind"], IconName> = {
  settled: "check-circle",
  holiday: "calendar-days",
  "next-settlement": "arrow-up-right",
  none: "calendar-days",
};

const DETAIL_ICON_CLASSNAME: Record<DayDetail["kind"], string> = {
  settled: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  holiday: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "next-settlement": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  none: "bg-card text-muted-foreground",
};

function detailPrimaryText(detail: DayDetail): string {
  switch (detail.kind) {
    case "settled":
      return "Settled";
    case "holiday":
      return detail.name;
    case "next-settlement":
      return "Next settlement";
    case "none":
      return formatShortDate(detail.dateKey);
  }
}

function detailSecondaryText(detail: DayDetail): string {
  switch (detail.kind) {
    case "settled":
      return `${formatCurrency(detail.amount, "INR")} · ${formatShortDate(detail.dateKey)}`;
    case "holiday":
      return "Bank holiday · settlements paused";
    case "next-settlement":
      return formatShortDate(detail.dateKey);
    case "none":
      return "No settlement activity";
  }
}

interface DayCellProps {
  cell: CalendarCell;
  isSelected: boolean;
  onSelect: (dateKey: string) => void;
  settledRowByDate: Map<string, SettlementRow>;
  holidayMap: Map<string, string>;
  nextSettlementDate: string;
  todayKey: string;
}

function DayCell({
  cell,
  isSelected,
  onSelect,
  settledRowByDate,
  holidayMap,
  nextSettlementDate,
  todayKey,
}: DayCellProps) {
  const detail = getDayDetail(cell.dateKey, settledRowByDate, holidayMap, nextSettlementDate);
  const isToday = cell.dateKey === todayKey;

  // Every day is the same 36px square, so the selected fill and the
  // next-settlement ring are one shape, and the number sits in the same spot
  // in every cell with its marker dot pinned just under it.
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSelect(cell.dateKey)}
      aria-pressed={isSelected}
      className={cn(
        "relative mx-auto flex h-9 min-h-0 w-9 min-w-0 items-center justify-center rounded-lg p-0 text-xs font-normal",
        cell.inCurrentMonth ? "text-foreground" : "text-muted-foreground/40",
        isToday && "font-bold",
        isSelected && "bg-primary/10 font-semibold text-primary hover:bg-primary/10",
        detail.kind === "next-settlement" && "ring-1 ring-inset ring-blue-500"
      )}
    >
      <span className="leading-none">{cell.day}</span>
      <span
        className={cn(
          "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
          detail.kind === "settled" && "bg-emerald-500",
          detail.kind === "holiday" && "bg-amber-500",
          detail.kind === "next-settlement" && "bg-blue-500",
          detail.kind === "none" && "hidden"
        )}
        aria-hidden="true"
      />
    </Button>
  );
}

const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Day of week for a YYYY-MM-DD key, read at local midnight (not UTC, which
 *  would shift the day for anyone west of Greenwich). */
function weekdayOf(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return WEEKDAY_SHORT[new Date(year!, month! - 1, day!).getDay()]!;
}

/**
 * Left column of the popover: every holiday in the month the calendar is
 * showing, as the calendar API returns them (weekends included, since those
 * pause settlements too). A row selects its day, so the calendar and the
 * detail panel under it follow the list. Scrolls inside a column the calendar
 * sets the height of, so a long month never makes the popover taller.
 */
function HolidayList({
  holidays,
  isLoading,
  monthName,
  selectedDateKey,
  onSelect,
}: {
  holidays: HolidayInfo[];
  isLoading: boolean;
  /** The month on screen, e.g. "September". */
  monthName: string;
  selectedDateKey: string;
  onSelect: (dateKey: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border sm:border-t-0 sm:border-r">
      <div className="flex items-baseline justify-between gap-2 px-4 pt-4 pb-2">
        <p className="text-sm font-semibold text-foreground">Holidays in {monthName}</p>
        {!isLoading && holidays.length > 0 && (
          <p className="text-[11px] tabular-nums text-muted-foreground">
            {holidays.length} {holidays.length === 1 ? "day" : "days"}
          </p>
        )}
      </div>

      <div className="max-h-56 min-h-0 flex-1 overflow-y-auto px-2 pb-3 sm:max-h-none">
        {isLoading ? (
          <div className="space-y-1.5 px-2 pt-1">
            {[0, 1, 2, 3].map((i) => (
              <Shimmer key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : holidays.length === 0 ? (
          <p className="px-2 pt-1 text-xs text-muted-foreground">
            No holidays this month. Settlements run on every working day.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {holidays.map((holiday) => {
              const isSelected = holiday.date === selectedDateKey;
              return (
                <li key={holiday.date}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onSelect(holiday.date)}
                    aria-pressed={isSelected}
                    className={cn(
                      "h-auto min-h-0 w-full justify-start gap-3 rounded-lg px-2 py-1.5 text-left font-normal [&>span]:flex [&>span]:w-full [&>span]:min-w-0 [&>span]:items-center [&>span]:gap-3",
                      isSelected && "bg-primary/10 hover:bg-primary/10"
                    )}
                  >
                    <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-500/15 leading-none text-amber-700 dark:text-amber-400">
                      <span className="text-[13px] font-semibold">
                        {Number(holiday.date.slice(8, 10))}
                      </span>
                      <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide">
                        {weekdayOf(holiday.date)}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-foreground">
                        {holiday.name}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        Settlements paused
                      </span>
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

interface SettlementCalendarButtonProps {
  /** Which product's settlements to mark as "settled" on the grid, differs
   * by active product context, see useProductContext.ts. */
  rows: SettlementRow[];
  /** Today, and the next-settlement figures derived from it. Passed in rather
   * than recomputed here because the page already holds them for its own
   * bank-holiday banner (useSettlementCalendar), and both must agree. */
  todayKey: string;
  nextSettlementDate: string;
  nextSettlementReason: string | null;
  nextSettlementSkippedDays: number;
  hasUpcomingHoliday: boolean;
  /** Controlled open state, so something outside the button (the page's
   *  bank-holiday banner) can open the popover. Uncontrolled when omitted. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SettlementCalendarButton({
  rows,
  todayKey,
  nextSettlementDate,
  nextSettlementReason,
  nextSettlementSkippedDays,
  hasUpcomingHoliday,
  open: openProp,
  onOpenChange,
}: SettlementCalendarButtonProps) {
  const { year: todayYear, month: todayMonth } = todayParts(todayKey);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    if (openProp === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const containerRef = useRef<HTMLDivElement>(null);

  // Holidays for the month on screen, refetched as the merchant pages through
  // months. One month at a time, exactly as production's calendar does, and only
  // while the popover is open — this button sits in the page header and is always
  // mounted, so an ungated query would fetch a month nobody is looking at. The
  // amber badge above needs no fetch of its own: hasUpcomingHoliday arrives as a
  // prop from the page's own calendar read.
  const { from: monthFrom, to: monthTo } = monthWindow(viewYear, viewMonth);
  const { holidays: monthHolidays, isLoading: isHolidaysLoading } = useBankHolidays(
    open ? monthFrom : "",
    open ? monthTo : ""
  );
  const holidayMap = useMemo(
    () => new Map(monthHolidays.map((h) => [h.date, h.name])),
    [monthHolidays]
  );

  // Every row IS a settled day now: a settlement only enters the list once it
  // has happened, so there is no in-progress state left to filter out.
  const settledRowByDate = useMemo(
    () => new Map(rows.map((r) => [r.date.slice(0, 10), r])),
    [rows]
  );

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Inline rather than setOpen, which is rebuilt every render.
        if (openProp === undefined) setUncontrolledOpen(false);
        onOpenChange?.(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, openProp, onOpenChange]);

  const cells = buildMonthGrid(viewYear, viewMonth);
  const detail = getDayDetail(selectedDateKey, settledRowByDate, holidayMap, nextSettlementDate);
  const showDelayBanner = nextSettlementSkippedDays > 0;
  const daysUntilNextSettlement = diffInDays(todayKey, nextSettlementDate);

  function goToPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        leftIcon={<Icon name="calendar-days" className="h-3.5 w-3.5" />}
        /* The badge rides in the rightIcon slot, inside the button's own flex
         * row, rather than as an absolutely positioned corner dot. It used to
         * be `absolute -right-1 -top-1`, which put it 4px above the button —
         * and this button sits at the very top of the page container, whose
         * `overflow-x-hidden overflow-y-visible` resolves to `overflow-y: auto`
         * (one axis hidden forces the other to compute to auto, it cannot stay
         * visible). Anything overhanging the top edge is therefore clipped and
         * unreachable, which is why only the top half of the dot ever drew.
         * The popover below is unaffected because it overhangs downward, into
         * scrollable space. */
        rightIcon={
          hasUpcomingHoliday ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          ) : undefined
        }
        className={cn(open && "bg-muted")}
      >
        Settlement calendar
      </Button>

      {open && (
        <div
          className="absolute right-0 z-50 w-[min(37rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
          style={{ top: "calc(100% + 8px)" }}
        >
          {showDelayBanner && (
            <div className="border-b-[0.5px] border-b-[#EF9F27] bg-[#FAEEDA] px-3 py-2.5 dark:border-b-amber-400/60 dark:bg-amber-500/15">
              <div className="flex items-start gap-2">
                <Icon
                  name="alert-triangle"
                  size={14}
                  className="mt-0.5 shrink-0 text-amber-900 dark:text-amber-300"
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-amber-900 dark:text-amber-100">
                    Scheduled for the next working day
                  </p>
                  <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300/90">
                    {nextSettlementReason ? `${nextSettlementReason} · ` : ""}
                    {nextSettlementSkippedDays}{" "}
                    {nextSettlementSkippedDays === 1 ? "non-working day" : "non-working days"}{" "}
                    skipped · Next settlement: {formatShortDate(nextSettlementDate)} · in{" "}
                    {daysUntilNextSettlement} {daysUntilNextSettlement === 1 ? "day" : "days"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Two columns on sm+: the month's holidays on the left, the
              calendar on the right (it sets the height; the list scrolls
              within it). Stacked on phones, calendar first. */}
          <div className="flex flex-col-reverse sm:flex-row">
            <div className="relative sm:flex-1">
              <div className="flex h-full flex-col sm:absolute sm:inset-0">
                <HolidayList
                  holidays={monthHolidays}
                  isLoading={isHolidaysLoading}
                  monthName={new Date(viewYear, viewMonth, 1).toLocaleString("en-US", {
                    month: "long",
                  })}
                  selectedDateKey={selectedDateKey}
                  onSelect={setSelectedDateKey}
                />
              </div>
            </div>
            <div className="p-3 sm:w-[300px] sm:shrink-0">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToPrevMonth}
                  className="h-7 w-7 min-h-0 min-w-0 rounded-lg p-0"
                  aria-label="Previous month"
                >
                  <Icon name="chevron-left" size={14} />
                </Button>
                <p className="text-sm font-semibold text-foreground">
                  {formatMonthYearLabel(viewYear, viewMonth)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={goToNextMonth}
                  className="h-7 w-7 min-h-0 min-w-0 rounded-lg p-0"
                  aria-label="Next month"
                >
                  <Icon name="chevron-right" size={14} />
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-7 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {WEEKDAY_LABELS.map((label, i) => (
                  <span key={`${label}-${i}`}>{label}</span>
                ))}
              </div>

              <div className="mt-1.5 grid grid-cols-7 gap-y-0.5">
                {cells.map((cell) => (
                  <DayCell
                    key={cell.dateKey}
                    cell={cell}
                    isSelected={cell.dateKey === selectedDateKey}
                    onSelect={setSelectedDateKey}
                    settledRowByDate={settledRowByDate}
                    holidayMap={holidayMap}
                    nextSettlementDate={nextSettlementDate}
                    todayKey={todayKey}
                  />
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
                  Settled
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                  Holiday
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
                  Next settlement
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2.5 rounded-[7px] bg-muted p-2.5">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    DETAIL_ICON_CLASSNAME[detail.kind]
                  )}
                >
                  <Icon name={DETAIL_ICON[detail.kind]} size={15} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {detailPrimaryText(detail)}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {detailSecondaryText(detail)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
