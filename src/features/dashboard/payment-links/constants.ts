export interface FilterOption {
  value: string;
  label: string;
}

/** PAGE_LIMIT from pg-dashboard's mca-payment-invoice-links/constants.ts:19. */
export const PAYMENT_LINKS_PAGE_LIMIT = 15;

// ── Status tabs ──────────────────────────────────────────────────────────────
// The backend's values, from pg-dashboard's PAYMENT_LINK_TABLE_FILTERS
// (mca-payment-invoice-links/constants.ts), sent as `fieldSearch.status`.
// "Paid" is TRANSACTED and "Deactivated" is DISABLED on the wire.
export const PAYMENT_LINK_STATUS_FILTERS: FilterOption[] = [
  { value: "All", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "AUTHORIZED", label: "Authorized" },
  { value: "TRANSACTED", label: "Paid" },
  { value: "EXPIRED", label: "Expired" },
  { value: "DISABLED", label: "Deactivated" },
];

/** The tab the table opens on: the links that can still be paid. */
export const PAYMENT_LINK_DEFAULT_STATUS = "ACTIVE";

/** Always shown in the column editor: a link row is unreadable without them. */
export const FIXED_COLUMN_KEYS = ["amount", "status", "paymentLinkUrl"];
