import { formatDateStamp } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import {
  MANDATE_PERMISSIONS,
  MANDATE_STATUS_META,
} from "@/features/dashboard/manage-mandates/constants";
import type {
  Mandate,
  MandateListRequest,
  MandateSiData,
} from "@/features/dashboard/manage-mandates/types";
import type { UseNewPermissionsFn } from "@/hooks/useNewPermissions";

// pg-dashboard's isValidEmail test for the search box: an email is sent as an
// exact match, anything else as a full-text query.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The `/search/mandate` body, as pg-dashboard's
 * `buildRequestBody(filters, "MANAGE_MANDATES", { selectedMid: { key: "mid" },
 * searchQuery })` builds it. The MID filter is always present, so only the
 * branches of its searchFilterType ladder that have filters are reachable.
 * Null when there is no MID to ask about.
 */
export function buildMandateListBody({
  mids,
  statuses,
  search,
  startTime,
  endTime,
  pageLimit,
  from,
}: {
  mids: string[];
  statuses: string[];
  search: string;
  startTime?: number;
  endTime?: number;
  pageLimit: number;
  from: number;
}): MandateListRequest | null {
  if (mids.length === 0) return null;
  const query = search.trim();
  const isEmail = EMAIL_RE.test(query);
  const hasTimeRange = !!(startTime && endTime);

  const searchFilterType = query
    ? `${isEmail ? "EXACT_MATCH_SEARCH" : "QUERY"}_FILTER_TYPE${hasTimeRange ? "_TIME_RANGE" : ""}`
    : hasTimeRange
      ? "FILTER_TYPE_TIME_RANGE"
      : "FILTER_TYPE";

  return {
    pageLimit,
    from,
    searchFilterType,
    fieldOrSearch: {},
    fieldSearch: { ...(statuses.length > 0 && { status: statuses }), mid: mids },
    ...(query && { queryString: query }),
    ...(hasTimeRange && { startTime, endTime }),
  };
}

/**
 * The export body. pg-dashboard's ReportDownload sends only a date window
 * (`buildRequestBody({ date }, "")`), never the table's filters: the MID is in
 * the path. Same shape the MCA Transactions export sends.
 */
export function buildMandateReportBody(startTime?: number, endTime?: number): MandateListRequest {
  const hasTimeRange = !!(startTime && endTime);
  return {
    pageLimit: 15,
    from: 0,
    fieldOrSearch: {},
    ...(hasTimeRange && { startTime, endTime }),
    searchFilterType: hasTimeRange ? "DEFAULT_TIME_RANGE" : "DEFAULT",
  };
}

/** "YYYYMMDD" → a local date. flux's parser would read the digits as epoch ms. */
function parseCompactDate(value: string | null | undefined): Date | null {
  const match = value?.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCompactDate(value: string | null | undefined): string {
  const date = parseCompactDate(value);
  return date ? formatDateStamp(date) : "—";
}

/** A Date picker value ("YYYY-MM-DD") → the "YYYYMMDD" the pause call takes. */
export function toCompactDate(isoDate: string): string {
  return isoDate.replaceAll("-", "");
}

export function getMandateStatusMeta(status: string) {
  return (
    MANDATE_STATUS_META[status?.toUpperCase()] ?? {
      label: status ? status.charAt(0) + status.slice(1).toLowerCase() : "Unknown",
      variant: "muted" as const,
    }
  );
}

/**
 * The SI's ceiling: `maxAmount`, else `amount`, as pg-dashboard reads it, in
 * the initiating transaction's currency.
 */
export function formatMandateAmount(row: Mandate): string {
  const raw = row.maxAmount || row.amount;
  const value = parseFloat(raw ?? "");
  if (Number.isNaN(value)) return raw || "—";
  return row.initiateTxnCurrency ? formatCurrency(value, row.initiateTxnCurrency) : raw!;
}

export interface MandateActionAvailability {
  pause: boolean;
  activate: boolean;
  disable: boolean;
}

/**
 * Which actions a row offers, pg-dashboard's rules exactly: Pause on an ACTIVE
 * mandate and Activate on a PAUSED one, both only with the PayGlocal scheduler
 * on for the MID; Disable on either. Each also needs its own permission.
 */
export function getMandateActions(
  row: Mandate,
  access: UseNewPermissionsFn,
  schedulerEnabled: boolean
): MandateActionAvailability {
  return {
    pause: row.status === "ACTIVE" && schedulerEnabled && access(MANDATE_PERMISSIONS.pause),
    activate: row.status === "PAUSED" && schedulerEnabled && access(MANDATE_PERMISSIONS.activate),
    disable:
      (row.status === "ACTIVE" || row.status === "PAUSED") && access(MANDATE_PERMISSIONS.disable),
  };
}

/** "dueCollectionDate" → "Due collection date". */
function labelFor(key: string): string {
  const words = key.replace(/([A-Z])/g, " $1").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** A history entry's SI fields that have a value, labelled, dates made readable. */
export function siDataRows(siData: MandateSiData | null): { label: string; value: string }[] {
  return Object.entries(siData ?? {})
    .filter(([, value]) => value !== null && value !== "")
    .map(([key, value]) => ({
      label: labelFor(key),
      value:
        /Date$/.test(key) && parseCompactDate(String(value))
          ? formatCompactDate(String(value))
          : String(value),
    }));
}
