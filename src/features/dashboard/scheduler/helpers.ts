import { formatCurrency } from "@/lib/utils/format";
import { SCHEDULER_STATUS_META } from "@/features/dashboard/scheduler/constants";
import type { SchedulerListRequest } from "@/features/dashboard/scheduler/types";

/** A local date as "YYYY-MM-DD". */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * pg-dashboard's default window: yesterday through today. Reads the clock, so
 * call it from an event handler or a lazy state initializer, never in render.
 */
export function defaultSchedulerRange(): { from: string; to: string } {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return { from: toIsoDate(yesterday), to: toIsoDate(today) };
}

/** "YYYY-MM-DD" plus `days`, as pg-dashboard widens the report's end date. */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return toIsoDate(new Date(y, m - 1, d + days));
}

/** The list body, field for field as pg-dashboard's SchedulerTable builds it. */
export function buildSchedulerListBody({
  from,
  to,
  status,
  pageLimit,
  exclusiveStartKey,
}: {
  from: string;
  to: string;
  status: string;
  pageLimit: number;
  exclusiveStartKey: object | null;
}): SchedulerListRequest {
  return {
    scheduledDataType: "STANDING_INSTRUCTION",
    schedulerViewFilterType: status ? "DATE_RANGE_STATUS" : "DATE_RANGE",
    startDate: from,
    endDate: to,
    scheduledDataStatus: status || null,
    pageLimit,
    exclusiveStartKey,
  };
}

/**
 * The report body: the same window and status, from the first page, with the
 * end date pushed a day later, which is what pg-dashboard sends so the last
 * day of the window is included.
 */
export function buildSchedulerReportBody(args: {
  from: string;
  to: string;
  status: string;
  pageLimit: number;
}): SchedulerListRequest {
  return {
    ...buildSchedulerListBody({ ...args, exclusiveStartKey: null }),
    endDate: addDays(args.to, 1),
  };
}

export function getSchedulerStatusMeta(status: string) {
  return (
    SCHEDULER_STATUS_META[status?.toUpperCase()] ?? {
      label: status ? status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " ") : "—",
      variant: "muted" as const,
    }
  );
}

/** pg-dashboard's AmountRenderer: the amount in its currency, INR by default. */
export function formatSchedulerAmount(amount: string, currency: string): string {
  const value = Number(amount);
  return Number.isNaN(value) ? amount || "—" : formatCurrency(value, currency || "INR");
}
