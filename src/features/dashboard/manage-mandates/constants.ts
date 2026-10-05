import type { BadgeTrailIcon, BadgeVariant } from "@payglocal_ui/flux-ui";

/** The product and MID feature key pg-dashboard gates the page on. */
export const MANAGE_MANDATES_FEATURE = "MANAGE_MANDATES";

export const MANDATES_PAGE_LIMIT = 15;

export const MANAGE_MANDATES_PAGE_SUBTITLE =
  "Recurring payment mandates your customers have set up, with their schedules and status";

/** pg-dashboard's EmptyEnableProduct copy for this product. */
export const MANAGE_MANDATES_NOT_ENABLED = {
  title: "Manage your Mandates",
  description:
    "Manage your Mandates with ease. View, Activate, and Deactivate your Mandates with just a few clicks.",
};

/** pg-dashboard's own rotating hints for this search box. */
export const MANDATE_SEARCH_HINTS = ["Mandate ID", "SI ID", "Mandate Status", "Initiate GID"];

/** The Status filter's options, pg-dashboard's set and order. */
export const MANDATE_STATUS_FILTERS = [
  { value: "ACTIVE", label: "Active" },
  { value: "EXHAUSTED", label: "Exhausted" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "PAUSED", label: "Paused" },
  { value: "FAILED", label: "Failed" },
];

type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

/** pg-dashboard's badge mapping: Active positive, Paused warning, the rest negative. */
export const MANDATE_STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { label: "Active", variant: "success", trailIcon: "check" },
  PAUSED: { label: "Paused", variant: "warning" },
  EXHAUSTED: { label: "Exhausted", variant: "danger" },
  INACTIVE: { label: "Inactive", variant: "danger" },
  FAILED: { label: "Failed", variant: "danger", trailIcon: "x" },
};

/** The permissions pg-dashboard checks per action. */
export const MANDATE_PERMISSIONS = {
  pause: ["pauseMandate"],
  activate: ["activateMandate"],
  disable: ["disableMandate"],
  report: ["ampMandateResultsMerchantContextReport"],
};

/** Columns a mandate row is unreadable without; the Columns picker can't hide them. */
export const MANDATE_FIXED_COLUMNS = ["maskedMandateId", "mandateStatus"];

/** Where Contact us points when the product isn't enabled. */
export const MANDATES_SUPPORT_EMAIL = "merchant.support@payglocal.in";
