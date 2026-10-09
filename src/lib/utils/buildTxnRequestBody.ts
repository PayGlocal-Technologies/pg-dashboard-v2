import type { TableReqBody, TxnFilterValues } from "@/types/transactions";

// Not @/validators' isValidEmail: that one trims, and this classifier
// feeds the untrimmed searchQuery straight into an exact-match lookup.
// Trimming here would route a padded query to a search that then can't match.
// Worth unifying, but only alongside trimming the value itself.
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
    /**
     * Whether an email-shaped query becomes an exact-match search (default).
     * pg-dashboard does that only where it passes the text as
     * `props.searchQuery` (the transactions tables). The payment links list
     * passes it as a filter (`newFilters.searchQuery`), so there an email is a
     * plain full-text QUERY like any other text: pass false for those.
     */
    emailExactMatch?: boolean;
    selectedMid?: { key: string; value: string[] };
    pageLimit?: number;
    from?: number;
  } = {}
): TableReqBody {
  const { searchQuery, emailExactMatch = true, selectedMid, pageLimit = 15, from = 0 } = opts;

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

  // eBRC IRM statuses (mapping / process), same fieldSearch keys pg-dashboard
  // writes for its own eBRC and IRM Repository tables.
  if (filters.irmMappingStatus?.length) {
    fieldSearch.irmMappingStatus = filters.irmMappingStatus;
  }

  if (filters.irmProcessStatus?.length) {
    fieldSearch.irmProcessStatus = filters.irmProcessStatus;
  }

  // PA order status, same key pg-dashboard's tableRequestbodyBuilder sends.
  if (filters.orderStatus?.length) {
    fieldSearch.orderStatus = filters.orderStatus;
  }

  // Currency filter (MCA; PA sends it here too, field name UNCONFIRMED for PA)
  if (filters.currency?.length) {
    fieldSearch.currency = filters.currency;
  }

  // Generic status filter — the key the invoice/payment/MCA link searches use,
  // as opposed to externalStatus above.
  if (filters.status?.length) {
    fieldSearch.status = filters.status;
  }

  // Country filter (client list) — names, not codes. Same key pg-dashboard's
  // tableRequestbodyBuilder writes for its client-list country dropdown.
  if (filters.country?.length) {
    fieldSearch.country = filters.country;
  }

  // Merchant ID filter (partner / multi-mid scenarios)
  if (selectedMid?.key && selectedMid?.value?.length) {
    fieldSearch[selectedMid.key] = selectedMid.value;
  }

  // Search query: an email is an exact-match search, anything else full-text.
  // Either way the text travels as `queryString`, as pg-dashboard's
  // tableRequestbodyBuilder sends it (an email is never put in fieldSearch);
  // only the searchFilterType below tells the two apart.
  const isEmailSearch = emailExactMatch && !!searchQuery && isEmail(searchQuery);
  if (searchQuery) queryString = searchQuery;

  const { startTime, endTime } = filters;
  const hasFilters = Object.keys(fieldSearch).length > 0;
  const hasTimeRange = !!(startTime && endTime);
  const hasEmail = isEmailSearch;

  // Determine searchFilterType — mirrors pg-dashboard logic
  let searchFilterType = "DEFAULT";

  if (hasEmail) {
    if (hasFilters && hasTimeRange) searchFilterType = "EXACT_MATCH_SEARCH_FILTER_TYPE_TIME_RANGE";
    else if (hasTimeRange) searchFilterType = "EXACT_MATCH_SEARCH_TIME_RANGE";
    else if (hasFilters) searchFilterType = "EXACT_MATCH_SEARCH_FILTER_TYPE";
    else searchFilterType = "EXACT_MATCH_SEARCH";
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
