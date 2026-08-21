import type {
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
