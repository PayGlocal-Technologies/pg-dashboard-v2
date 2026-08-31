import type { BadgeVariant } from "@/components/ui";
import type { FilterChipOption } from "@/components/common/filters/FilterChips";
import type { McaInvoiceRow } from "@/features/dashboard/mca-invoices/types";

export const INVOICES_PAGE_LIMIT = 10;

/** Rotating placeholder hints for the search box. */
export const SEARCH_WORDS = ["Client name", "Business name", "Invoice number"];

/**
 * Status colour, from pg-dashboard's BADGE_MAPPING. Its TagType vocabulary maps
 * onto flux's BadgeVariant as positive→success and negative→danger.
 */
const STATUS_VARIANT: Record<McaInvoiceRow["status"], BadgeVariant> = {
  DRAFT: "warning",
  ACTIVE: "info",
  OUTSTANDING: "danger",
  PAID: "success",
  PAID_OUTSIDE: "success",
};

/**
 * Label, from production's formatStatus(): underscores to spaces, lowercased,
 * first letter capitalised. So PAID_OUTSIDE reads "Paid outside", not
 * "Paid Outside" and not an invented synonym.
 */
export function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function getInvoiceStatusMeta(status: string): { label: string; variant: BadgeVariant } {
  return {
    label: formatStatusLabel(status),
    variant: STATUS_VARIANT[status as McaInvoiceRow["status"]] ?? "muted",
  };
}

/** Recurrence labels, copied from FREQUENCY_TEXT_MAPPING. */
export const FREQUENCY_LABELS: Record<string, string> = {
  EVERY_2_WEEK: "Every Two Weeks",
  EVERY_1_MONTH: "Every One Month",
  EVERY_2_MONTH: "Every Two Months",
  EVERY_1_QUARTER: "Every One Quarter",
};

/** The Status flyout's options, from MCA_INVOICES_FILTERS. */
export const INVOICE_STATUS_FILTERS: FilterChipOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "OUTSTANDING", label: "Outstanding" },
  { value: "PAID", label: "Paid" },
  { value: "PAID_OUTSIDE", label: "Paid Outside" },
];

/**
 * View tabs.
 *
 * Production drives these from a CDN-hosted tag config
 * (cdn.<env>.../mca-invoice/mca-invoice-dash.json), which is not readable
 * outside the VPC, so these are derived from production's own status
 * vocabulary instead. "Recurring" is the one tab that filters on `type` rather
 * than status, and it is also what reveals the Frequency column, exactly as
 * production keys that column off `selectedTag === "recurring"`.
 *
 * Swap this for the real config when the JSON is reachable; the shape it needs
 * is { key, label, filters } per tag.
 */
export const INVOICE_VIEW_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "active", label: "Active" },
  { value: "outstanding", label: "Outstanding" },
  { value: "paid", label: "Paid" },
  { value: "recurring", label: "Recurring" },
] as const;

export type InvoiceViewTab = (typeof INVOICE_VIEW_TABS)[number]["value"];

/** Status set each tab pins. "all" and "recurring" impose no status filter. */
export const TAB_STATUS_FILTERS: Record<InvoiceViewTab, string[]> = {
  all: [],
  draft: ["DRAFT"],
  active: ["ACTIVE"],
  outstanding: ["OUTSTANDING"],
  paid: ["PAID", "PAID_OUTSIDE"],
  recurring: [],
};

/**
 * Tabs that pin a status set, in the order they should be matched against the
 * current filters. "all" and "recurring" are excluded because neither pins a
 * status: their empty arrays would match any unfiltered view and shadow the
 * real answer.
 */
export const STATUS_PINNED_TABS = INVOICE_VIEW_TABS.filter(
  (tab) => TAB_STATUS_FILTERS[tab.value].length > 0
);

/** Columns the table is meaningless without, so they cannot be hidden. */
export const FIXED_COLUMN_KEYS = ["invoiceNumber", "totalAmount", "status"];

/**
 * The summary's range picker, from pg-dashboard's own options. Values are day
 * counts, so each one maps straight onto the Date chip's "Last N days" mode.
 */
export const ALL_TIME_RANGE_VALUE = "ALL_TIME";
/** Not selectable: it only labels the picker when the Date chip holds a range
 *  the picker's own options cannot express (an absolute range, or a "Last …"
 *  value that is not one of the day counts below). */
export const CUSTOM_RANGE_VALUE = "CUSTOM";

export const SUMMARY_RANGE_OPTIONS = [
  { value: ALL_TIME_RANGE_VALUE, label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

/** Day counts the picker can display, i.e. every option bar "All time". */
export const SUMMARY_RANGE_DAYS = SUMMARY_RANGE_OPTIONS.map((o) => Number(o.value)).filter(
  (n) => !Number.isNaN(n)
);
