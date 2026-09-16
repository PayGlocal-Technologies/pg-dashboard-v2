import {
  EMPTY_RELATIVE_RANGE,
  toEndOfDayMs,
  toStartOfDayMs,
} from "@/components/common/filters/FilterChips";
import {
  ALL_TIME_RANGE_VALUE,
  type SummaryRange,
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

// ─── The table's Date filter ──────────────────────────────────────────────────
// Owned by the table alone. The summary's range is its own state and its own
// arithmetic, further down.

export const EMPTY_INVOICE_DATE_FILTER: InvoiceDateFilter = {
  range: { from: "", to: "" },
  relative: EMPTY_RELATIVE_RANGE,
  window: null,
};

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

/** Milliseconds in a day, for the summary's day-count ranges. */
const MS_PER_DAY = 86_400_000;

/**
 * The summary's window, in the epoch SECONDS its endpoint wants.
 *
 * "All time" is a start of 0. Everything else counts `range` days back from the
 * end of today. `endMs` is passed in rather than read here so it stays stable
 * across renders: it is part of the summary's react-query key, and a
 * second-resolution "now" would mint a fresh key on every render and never hit
 * the cache.
 */
export function summaryWindowSeconds(
  range: SummaryRange,
  endMs: number
): { start: number; end: number } {
  const end = Math.floor(endMs / 1000);
  if (range === ALL_TIME_RANGE_VALUE) return { start: 0, end };

  const days = Number(range);
  return { start: Math.floor((endMs - days * MS_PER_DAY) / 1000), end };
}
