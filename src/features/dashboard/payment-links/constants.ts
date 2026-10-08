export interface FilterOption {
  value: string;
  label: string;
}

export const PAYMENT_LINKS_PAGE_LIMIT = 10;

// ── Status pills shown in the filter bar ─────────────────────────────────────
export const PAYMENT_LINK_STATUS_FILTERS: FilterOption[] = [
  { value: "All", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "PAID", label: "Paid" },
  { value: "EXPIRED", label: "Expired" },
  { value: "DEACTIVATED", label: "Deactivated" },
];

/** The tab the table opens on: the links that can still be paid. */
export const PAYMENT_LINK_DEFAULT_STATUS = "ACTIVE";
