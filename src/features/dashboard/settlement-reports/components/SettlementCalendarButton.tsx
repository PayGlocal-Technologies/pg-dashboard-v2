"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import {
  buildMonthGrid,
  diffInDays,
  formatMonthLabel,
  formatShortDate,
  type CalendarCell,
} from "@/features/dashboard/settlement-reports/calendarUtils";
import {
  bankHolidays,
  hasUpcomingHoliday,
  nextSettlementInfo,
  SETTLEMENT_CALENDAR_TODAY,
} from "@/features/dashboard/settlement-reports/mock-data";
import { isSettlementComplete } from "@/features/dashboard/settlement-reports/columns";
import type { SettlementRow } from "@/features/dashboard/settlement-reports/types";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function todayParts(): { year: number; month: number } {
  const [year, month] = SETTLEMENT_CALENDAR_TODAY.split("-").map(Number);
  return { year: year!, month: month! - 1 };
}

const holidayMap = new Map(bankHolidays.map((h) => [h.date, h.name]));

type DayDetail =
  | { kind: "settled"; dateKey: string; amount: number }
  | { kind: "holiday"; dateKey: string; name: string }
  | { kind: "next-settlement"; dateKey: string }
  | { kind: "none"; dateKey: string };

function getDayDetail(dateKey: string, settledRowByDate: Map<string, SettlementRow>): DayDetail {
  if (dateKey === nextSettlementInfo.date) return { kind: "next-settlement", dateKey };
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
  none: "bg-muted text-muted-foreground",
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
}

function DayCell({ cell, isSelected, onSelect, settledRowByDate }: DayCellProps) {
  const detail = getDayDetail(cell.dateKey, settledRowByDate);
  const isToday = cell.dateKey === SETTLEMENT_CALENDAR_TODAY;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => onSelect(cell.dateKey)}
      className={cn(
        "h-auto min-h-0 w-full gap-0 rounded-md p-0 py-1 font-normal",
        !cell.inCurrentMonth && "text-muted-foreground/40",
        cell.inCurrentMonth && "text-foreground",
        isSelected && "bg-primary/10 hover:bg-primary/10",
        detail.kind === "next-settlement" && "ring-1 ring-inset ring-blue-500"
      )}
    >
      <span className="flex flex-col items-center gap-0.5">
        <span className={cn("text-xs", isToday && "font-bold")}>{cell.day}</span>
        <span
          className={cn(
            "h-1 w-1 rounded-full",
            detail.kind === "settled" && "bg-emerald-500",
            detail.kind === "holiday" && "bg-amber-500",
            detail.kind === "next-settlement" && "bg-blue-500",
            detail.kind === "none" && "bg-transparent"
          )}
          aria-hidden="true"
        />
      </span>
    </Button>
  );
}

interface SettlementCalendarButtonProps {
  /** Which product's settlements to mark as "settled" on the grid, differs
   * by active product context, see useProductContext.ts. */
  rows: SettlementRow[];
}

export function SettlementCalendarButton({ rows }: SettlementCalendarButtonProps) {
  const { year: todayYear, month: todayMonth } = todayParts();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(todayYear);
  const [viewMonth, setViewMonth] = useState(todayMonth);
  const [selectedDateKey, setSelectedDateKey] = useState(SETTLEMENT_CALENDAR_TODAY);
  const containerRef = useRef<HTMLDivElement>(null);

  const settledRowByDate = useMemo(
    () => new Map(rows.filter((r) => isSettlementComplete(r.status)).map((r) => [r.date.slice(0, 10), r])),
    [rows]
  );

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  const cells = buildMonthGrid(viewYear, viewMonth);
  const detail = getDayDetail(selectedDateKey, settledRowByDate);
  const showDelayBanner = nextSettlementInfo.skippedDays > 0;
  const daysUntilNextSettlement = diffInDays(SETTLEMENT_CALENDAR_TODAY, nextSettlementInfo.date);

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
        onClick={() => setOpen((o) => !o)}
        leftIcon={<Icon name="calendar-days" className="h-3.5 w-3.5" />}
        className={cn("relative", open && "bg-muted")}
      >
        Settlement calendar
        {hasUpcomingHoliday && (
          <span
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-500"
            aria-hidden="true"
          />
        )}
      </Button>

      {open && (
        <div
          className="absolute right-0 z-50 w-[300px] overflow-hidden rounded-xl border border-border bg-card shadow-lg"
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
                    {nextSettlementInfo.reason ? `${nextSettlementInfo.reason} · ` : ""}
                    Next settlement: {formatShortDate(nextSettlementInfo.date)} · in {daysUntilNextSettlement} days
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="p-3">
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={goToPrevMonth}
                className="h-6 w-6 min-h-0 min-w-0 rounded-md p-0"
                aria-label="Previous month"
              >
                <Icon name="chevron-left" size={14} />
              </Button>
              <p className="text-sm font-semibold text-foreground">
                {formatMonthLabel(viewYear, viewMonth)}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={goToNextMonth}
                className="h-6 w-6 min-h-0 min-w-0 rounded-md p-0"
                aria-label="Next month"
              >
                <Icon name="chevron-right" size={14} />
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-7 text-center text-[10px] font-medium uppercase text-muted-foreground">
              {WEEKDAY_LABELS.map((label, i) => (
                <span key={`${label}-${i}`}>{label}</span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-y-1">
              {cells.map((cell) => (
                <DayCell
                  key={cell.dateKey}
                  cell={cell}
                  isSelected={cell.dateKey === selectedDateKey}
                  onSelect={setSelectedDateKey}
                  settledRowByDate={settledRowByDate}
                />
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-emerald-500" aria-hidden="true" />
                Settled
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-amber-500" aria-hidden="true" />
                Holiday
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-blue-500" aria-hidden="true" />
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
      )}
    </div>
  );
}
