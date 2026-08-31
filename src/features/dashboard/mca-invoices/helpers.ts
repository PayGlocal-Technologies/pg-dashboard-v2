import {
  EMPTY_RELATIVE_RANGE,
  relativeRangeToEpochMs,
  toEndOfDayMs,
  toStartOfDayMs,
  type RelativeRangeValue,
} from "@/components/common/filters/FilterChips";
import {
  ALL_TIME_RANGE_VALUE,
  CUSTOM_RANGE_VALUE,
  SUMMARY_RANGE_DAYS,
} from "@/features/dashboard/mca-invoices/constants";
import type {
  InvoiceDateFilter,
  InvoiceFilterValues,
  InvoiceSearchBody,
} from "@/features/dashboard/mca-invoices/types";

/**
 * Builds the OpenSearch body for POST /mca-invoice/{mid}/search.
 *
 * The searchFilterType ladder is the same one pg-dashboard's
 * tableRequestbodyBuilder derives, reduced to the combinations this table can
 * actually produce: there is no email or phone exact-match path here, and no
 * fieldOrSearch, so the EXACT_MATCH_* and *_OR_* branches are unreachable and
 * omitted rather than carried as dead code.
 *
 * Invoice-specific details worth noting:
 *  - the MID filter key is `mid`. The transactions search uses `merchantId`;
 *    using that here silently returns everything.
 *  - free-text search becomes `queryString`, which is what production's
 *    "Client Name" filter input maps onto (newFilters.mcaInvoices → queryString).
 */
export function buildInvoiceRequestBody(
  filters: InvoiceFilterValues,
  opts: {
    mids: string[];
    searchQuery?: string;
    pageLimit: number;
    from: number;
  }
): InvoiceSearchBody {
  const { mids, searchQuery, pageLimit, from } = opts;

  const fieldSearch: Record<string, string | string[]> = {};

  if (mids.length > 0) fieldSearch.mid = mids;
  if (filters.status?.length) fieldSearch.status = filters.status;
  if (filters.type?.length) fieldSearch.type = filters.type;

  const queryString = searchQuery?.trim() ? searchQuery.trim() : undefined;

  const { startTime, endTime } = filters;
  const hasFilters = Object.keys(fieldSearch).length > 0;
  const hasTimeRange = !!(startTime && endTime);

  let searchFilterType = "DEFAULT";
  if (queryString && hasFilters && hasTimeRange) searchFilterType = "QUERY_FILTER_TYPE_TIME_RANGE";
  else if (queryString && hasTimeRange) searchFilterType = "QUERY_TIME_RANGE";
  else if (queryString && hasFilters) searchFilterType = "QUERY_FILTER_TYPE";
  else if (queryString) searchFilterType = "QUERY";
  else if (hasFilters && hasTimeRange) searchFilterType = "FILTER_TYPE_TIME_RANGE";
  else if (hasTimeRange) searchFilterType = "DEFAULT_TIME_RANGE";
  else if (hasFilters) searchFilterType = "FILTER_TYPE";

  return {
    pageLimit,
    from,
    searchFilterType,
    ...(queryString && { queryString }),
    ...(hasFilters && { fieldSearch }),
    ...(hasTimeRange && { startTime, endTime }),
  };
}

// ─── The Date filter, shared by the summary's range picker and the chip ───────

export const EMPTY_INVOICE_DATE_FILTER: InvoiceDateFilter = {
  range: { from: "", to: "" },
  relative: EMPTY_RELATIVE_RANGE,
  window: null,
};

/**
 * The whole-day count a relative range represents, or null when it isn't a
 * whole number of days ("last 6 hours", "last 2 weeks 3 days"). Only a plain
 * day count can be shown in the summary's picker.
 */
export function relativeRangeDays(value: RelativeRangeValue): number | null {
  if (value.weeks || value.hours || value.minutes) return null;
  const days = parseInt(value.days || "", 10);
  return Number.isNaN(days) || days <= 0 ? null : days;
}

/** Which of the summary picker's options describes the current Date filter. */
export function summaryRangeValue(filter: InvoiceDateFilter): string {
  const days = relativeRangeDays(filter.relative);
  if (days !== null && SUMMARY_RANGE_DAYS.includes(days)) return String(days);
  if (filter.window || (filter.range.from && filter.range.to)) return CUSTOM_RANGE_VALUE;
  return ALL_TIME_RANGE_VALUE;
}

/**
 * A Date filter for "last `days` days", as the summary's picker means it.
 *
 * Reads the clock, so call it from an event handler and never during render:
 * "last 7 days" is counted back from now, and now moves.
 */
export function relativeDaysDateFilter(days: number): InvoiceDateFilter {
  const relative: RelativeRangeValue = { ...EMPTY_RELATIVE_RANGE, days: String(days) };
  return { range: { from: "", to: "" }, relative, window: relativeRangeToEpochMs(relative) };
}

/** Epoch millis at the end of the local day containing `now`. */
export function endOfDayMs(now: Date): number {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return end.getTime();
}

/** The filter's bounds as the invoice search body wants them: epoch millis,
 *  or undefined when that end is open. */
export function dateFilterToEpochMs(filter: InvoiceDateFilter): {
  startTime?: number;
  endTime?: number;
} {
  return {
    startTime:
      filter.window?.startTime ??
      (filter.range.from ? toStartOfDayMs(filter.range.from) : undefined),
    endTime:
      filter.window?.endTime ?? (filter.range.to ? toEndOfDayMs(filter.range.to) : undefined),
  };
}

/**
 * The same bounds as the summary endpoint wants them: epoch SECONDS, with an
 * unset start meaning 0 ("all time") and an unset end falling back to
 * `defaultEndMs` — the end of today, passed in rather than read here so the
 * value stays stable across renders (it is part of the summary's query key).
 */
export function summaryWindowSeconds(
  filter: InvoiceDateFilter,
  defaultEndMs: number
): { start: number; end: number } {
  const { startTime, endTime } = dateFilterToEpochMs(filter);
  return {
    start: startTime === undefined ? 0 : Math.floor(startTime / 1000),
    end: Math.floor((endTime ?? defaultEndMs) / 1000),
  };
}
