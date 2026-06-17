import type { TableReqBody, TxnFilterValues } from "@/features/dashboard/transactions/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const isEmail = (v: string) => EMAIL_RE.test(v);

/**
 * Builds the OpenSearch request body for both PA and MCA transaction tables.
 * Mirrors the searchFilterType logic from pg-dashboard's tableRequestbodyBuilder.
 */
export function buildTxnRequestBody(
  filters: TxnFilterValues,
  opts: {
    searchQuery?: string;
    selectedMid?: { key: string; value: string[] };
    pageLimit?: number;
    from?: number;
  } = {}
): TableReqBody {
  const { searchQuery, selectedMid, pageLimit = 15, from = 0 } = opts;

  const fieldSearch: Record<string, string | string[]> = {};
  let queryString: string | undefined;

  // Status filter
  if (filters.externalStatus?.length) {
    fieldSearch.externalStatus = filters.externalStatus;
  }

  // Country filter (PA)
  if (filters.iso2Code?.length) {
    fieldSearch.iso2Code = filters.iso2Code;
  }

  // Payment instrument filter (PA)
  if (filters.paymentInstrument?.length) {
    fieldSearch.paymentInstrument = filters.paymentInstrument;
  }

  // Currency filter (MCA)
  if (filters.currency?.length) {
    fieldSearch.currency = filters.currency;
  }

  // Merchant ID filter (partner / multi-mid scenarios)
  if (selectedMid?.key && selectedMid?.value?.length) {
    fieldSearch[selectedMid.key] = selectedMid.value;
  }

  // Search query: email detection → exact-match, else full-text
  if (searchQuery) {
    if (isEmail(searchQuery)) {
      fieldSearch.encEmailId = searchQuery;
    } else {
      queryString = searchQuery;
    }
  }

  const { startTime, endTime } = filters;
  const hasFilters = Object.keys(fieldSearch).length > 0;
  const hasTimeRange = !!(startTime && endTime);
  const hasEmail = !!fieldSearch.encEmailId;

  // Determine searchFilterType — mirrors pg-dashboard logic
  let searchFilterType = "DEFAULT";

  if (hasEmail) {
    if (hasFilters && hasTimeRange) searchFilterType = "EXACT_MATCH_SEARCH_FILTER_TYPE_TIME_RANGE";
    else if (hasTimeRange)          searchFilterType = "EXACT_MATCH_SEARCH_TIME_RANGE";
    else if (hasFilters)            searchFilterType = "EXACT_MATCH_SEARCH_FILTER_TYPE";
    else                            searchFilterType = "EXACT_MATCH_SEARCH";
  } else if (queryString && hasFilters && hasTimeRange) {
    searchFilterType = "QUERY_FILTER_TYPE_TIME_RANGE";
  } else if (queryString && hasTimeRange) {
    searchFilterType = "QUERY_TIME_RANGE";
  } else if (queryString && hasFilters) {
    searchFilterType = "QUERY_FILTER_TYPE";
  } else if (queryString) {
    searchFilterType = "QUERY";
  } else if (hasFilters && hasTimeRange) {
    searchFilterType = "FILTER_TYPE_TIME_RANGE";
  } else if (hasTimeRange) {
    searchFilterType = "DEFAULT_TIME_RANGE";
  } else if (hasFilters) {
    searchFilterType = "FILTER_TYPE";
  }

  return {
    pageLimit,
    from,
    searchFilterType,
    ...(queryString && { queryString }),
    ...(hasFilters && { fieldSearch }),
    ...(hasTimeRange && { startTime, endTime }),
  };
}
