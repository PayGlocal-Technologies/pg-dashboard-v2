/**
 * Pure time-window logic behind ReportDownloadDrawer: the date presets, which
 * preset (if any) a range matches, whether a window is complete, and the
 * plain-language summary of a relative window.
 *
 * Every date here is a local-time calendar day (midnight in the browser's
 * timezone), the same assumption toStartOfDayMs/toEndOfDayMs make when the
 * drawer turns the chosen days into request timestamps.
 */

import type { RelativeRangeValue } from "@/components/common/filters/FilterChips";

export type ReportWindowMode = "dateRange" | "relative";

export type DatePresetId = "today" | "yesterday" | "last7" | "last30" | "thisMonth" | "lastMonth";

export const DATE_PRESETS: { id: DatePresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
];

/** Each sets one unit and clears the other three. */
export const RELATIVE_PRESETS: { label: string; value: RelativeRangeValue }[] = [
  { label: "15 min", value: { weeks: "0", days: "0", hours: "0", minutes: "15" } },
  { label: "1 hour", value: { weeks: "0", days: "0", hours: "1", minutes: "0" } },
  { label: "24 hours", value: { weeks: "0", days: "0", hours: "24", minutes: "0" } },
  { label: "7 days", value: { weeks: "0", days: "7", hours: "0", minutes: "0" } },
];

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Midnight (local) on the given date's calendar day. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** `YYYY-MM-DD` for a local calendar day. */
export function toYmd(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** A `YYYY-MM-DD` string as a local calendar day, or undefined when empty or
 *  malformed. */
export function fromYmd(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** "1 Sep 2026" */
export function formatDayLabel(date: Date): string {
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

export function getPresetRange(presetId: DatePresetId, today: Date): { start: Date; end: Date } {
  const t = startOfDay(today);
  switch (presetId) {
    case "today":
      return { start: t, end: t };
    case "yesterday": {
      const y = addDays(t, -1);
      return { start: y, end: y };
    }
    case "last7":
      return { start: addDays(t, -6), end: t };
    case "last30":
      return { start: addDays(t, -29), end: t };
    case "thisMonth":
      return { start: new Date(t.getFullYear(), t.getMonth(), 1), end: t };
    case "lastMonth":
      return {
        start: new Date(t.getFullYear(), t.getMonth() - 1, 1),
        // Day 0 of this month is the last day of the previous one.
        end: new Date(t.getFullYear(), t.getMonth(), 0),
      };
  }
}

/** The preset whose days exactly match this range, or null. */
export function matchPreset(
  start: Date | undefined,
  end: Date | undefined,
  today: Date
): DatePresetId | null {
  if (!start || !end) return null;
  const hit = DATE_PRESETS.find(({ id }) => {
    const range = getPresetRange(id, today);
    return sameDay(range.start, start) && sameDay(range.end, end);
  });
  return hit?.id ?? null;
}

/** Whole-number value of one relative unit; anything unparseable is 0. */
function unit(value: string | undefined): number {
  const n = parseInt(value || "0", 10);
  return Number.isNaN(n) ? 0 : n;
}

export function isWindowValid(
  mode: ReportWindowMode,
  values: { start?: Date; end?: Date; relative: RelativeRangeValue }
): boolean {
  if (mode === "dateRange") {
    return !!values.start && !!values.end && values.end.getTime() >= values.start.getTime();
  }
  const { weeks, days, hours, minutes } = values.relative;
  return [weeks, days, hours, minutes].some((v) => unit(v) > 0);
}

/** "3 days", "1 week and 3 days", "1 week, 2 days and 4 hours". Zero units
 *  are left out; empty string when every unit is zero. */
export function formatRelativeSummary(value: RelativeRangeValue): string {
  const parts = (
    [
      [value.weeks, "week"],
      [value.days, "day"],
      [value.hours, "hour"],
      [value.minutes, "minute"],
    ] as const
  )
    .map(([v, name]) => ({ n: unit(v), name }))
    .filter(({ n }) => n > 0)
    .map(({ n, name }) => `${n} ${name}${n === 1 ? "" : "s"}`);

  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

/** Whether two relative values name the same span (used for the active chip). */
export function sameRelative(a: RelativeRangeValue, b: RelativeRangeValue): boolean {
  return (
    unit(a.weeks) === unit(b.weeks) &&
    unit(a.days) === unit(b.days) &&
    unit(a.hours) === unit(b.hours) &&
    unit(a.minutes) === unit(b.minutes)
  );
}
