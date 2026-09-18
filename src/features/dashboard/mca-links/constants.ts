import type { FilterChipOption } from "@/components/common/filters/FilterChips";
import type { McaLinkStatus } from "@/features/dashboard/mca-links/types";

/** Same page size as the MCA Transactions table, so both paginate identically. */
export const MCA_LINKS_PAGE_LIMIT = 15;

/** Options in the Status filter chip's checkbox list. */
export const MCA_LINK_STATUS_FILTERS: FilterChipOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "DISABLED", label: "Disabled" },
  { value: "EXPIRED", label: "Expired" },
];

/**
 * Tab bar. Mirrors MCA Transactions' tabs: an underline-style shortcut onto
 * the same status filter state the Status chip drives, not a separate
 * filtering axis. "All" clears the status filter entirely.
 */
export const MCA_LINK_VIEW_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active Links" },
  { value: "disabled", label: "Disabled Links" },
] as const;

export const ACTIVE_LINK_STATUSES: McaLinkStatus[] = ["ACTIVE"];
export const DISABLED_LINK_STATUSES: McaLinkStatus[] = ["DISABLED"];
