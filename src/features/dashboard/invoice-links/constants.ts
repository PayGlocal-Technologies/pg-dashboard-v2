import type { FilterChipOption } from "@/components/common/filters/FilterChips";

/**
 * The entitlement the merchant must hold in
 * `merchantEnabledProducts.paymentProducts` before this page shows anything.
 *
 * pg-dashboard's FEATURE_MAP maps page="INVOICE" to this exact key
 * (mca-payment-invoice-links/index.tsx:79-83), and checks it twice: once as a
 * product gate on the account, once per-MID via useFeatureApplicable.
 */
export const INVOICE_LINKS_FEATURE = "INVOICE_LINKS";

/** PAGE_LIMIT from pg-dashboard's mca-payment-invoice-links/constants.ts:19. */
export const INVOICE_LINKS_PAGE_LIMIT = 15;

/** Rows-per-page choices, led by upstream's 15. Same set as dispute management. */
export const INVOICE_LINKS_PAGE_SIZE_OPTIONS = [15, 25, 50, 100] as const;

/** Columns an invoice link row is unreadable without, so they cannot be hidden. */
export const FIXED_COLUMN_KEYS = ["id", "totalAmount", "status"];

/**
 * Status filter options, copied from INVOICE_LINK_TABLE_FILTERS in
 * pg-dashboard/src/features/mca-payment-invoice-links/constants.ts — same
 * eight values, same labels, same order.
 *
 * Deliberately NOT the same set as the badge mapping below: the backend emits
 * statuses the filter does not offer (DRAFT, TRANSACTED, EXHAUSTED…), and the
 * filter offers statuses the badge map has no entry for (PAUSED, VOID…). Both
 * asymmetries exist upstream and are preserved.
 */
export const INVOICE_LINK_STATUS_FILTERS: FilterChipOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "PAUSED", label: "Paused" },
  { value: "ISSUER_DECLINED", label: "Issuer Declined" },
  { value: "RESUMED", label: "Resumed" },
  { value: "DISABLED", label: "Disabled" },
  { value: "VOID", label: "Void" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "PAID", label: "Paid" },
];
