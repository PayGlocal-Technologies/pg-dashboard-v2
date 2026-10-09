import type { StatusMeta } from "@/features/dashboard/pa-transactions/status/types";
import type {
  CbExternalDrawerViewStatus,
  CbLevel,
  CbSortKey,
  DisplayStatus,
  DisputeBucket,
} from "@/features/dashboard/dispute-management/types";

/** The entitlement a merchant (and each selected MID) must carry. */
export const DISPUTE_FEATURE = "DISPUTE";

/**
 * Roles that see the page without the DISPUTE product (pg-dashboard
 * chargebacks/index.tsx:14-21). A substring test on `profile.role`, as there.
 */
export const PRODUCT_GUARD_BYPASS_ROLES = [
  "GLOCAL",
  "TRANSACTING_ADMIN",
  "CUSTOM",
  "AGGREGATOR",
  "PORTFOLIO",
  "RESELLER",
];

/** Roles whose list request carries no `merchantId` scope: the backend scopes them (ChargebacksTable.tsx:88-93). */
export const UNSCOPED_ROLES = ["AGGREGATOR", "RESELLER", "PORTFOLIO", "CUSTOM"];

/** pg-dashboard pages this list at 15. */
export const PAGE_LIMIT = 15;
export const PAGE_SIZE_OPTIONS = [15, 25, 50, 100];

/**
 * The list's tabs, in the design's order, each sent as the bucket
 * pg-dashboard's tab of the same meaning sends (CHARGEBACK_TABS).
 */
export const DISPUTE_STATUS_SEGMENTS = [
  { value: "ACTION_REQUIRED", label: "Action required" },
  { value: "ALL_CHARGEBACKS", label: "All disputes" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
] as const satisfies readonly { value: DisputeBucket; label: string }[];

export const DEFAULT_DISPUTE_TAB: DisputeBucket = "ACTION_REQUIRED";

/** A search always runs across every bucket, so it lands here (ChargebacksTable.tsx:430-443). */
export const ALL_DISPUTES_TAB: DisputeBucket = "ALL_CHARGEBACKS";

/** Tabs whose cases still await a response: the date column is Respond by (CB_RESPOND_BY_TABS). */
export const RESPOND_BY_TABS: DisputeBucket[] = ["ACTION_REQUIRED", "ALL_CHARGEBACKS", "UNDER_REVIEW"];

/** Tabs where every row has one status, so the Status column and filter are left out (columns.tsx:308). */
export const SINGLE_STATUS_TABS: DisputeBucket[] = ["UNDER_REVIEW", "WON", "LOST"];

/** CB_EXTERNAL_DISPLAY_STATUS_FILTER: the Status filter's options on each tab. */
export const STATUS_FILTER_BY_TAB: Record<DisputeBucket, DisplayStatus[]> = {
  ACTION_REQUIRED: ["ACTION_REQUIRED", "UPLOAD_DOC", "INSUFFICIENT_DOC"],
  UNDER_REVIEW: ["UNDER_REVIEW"],
  ALL_CHARGEBACKS: [
    "ACTION_REQUIRED",
    "UPLOAD_DOC",
    "UNDER_REVIEW",
    "INSUFFICIENT_DOC",
    "MERCHANT",
    "CUSTOMER",
    "REFUNDED",
  ],
  WON: ["MERCHANT"],
  LOST: ["CUSTOMER"],
};

/**
 * The status chip, pg-dashboard's CB_DISPLAY_STATUS_MAPPER in the design's
 * chip vocabulary (Won / Lost where the two mean the same thing).
 */
export const DISPLAY_STATUS_META: Record<DisplayStatus, StatusMeta> = {
  ACTION_REQUIRED: {
    label: "Action required",
    variant: "warning",
    tooltip: "Accept or contest before the deadline",
  },
  UPLOAD_DOC: {
    label: "Upload documents",
    variant: "warning",
    tooltip: "Upload your supporting evidence and submit it before the deadline",
  },
  UNDER_REVIEW: { label: "Under review", variant: "info", trailIcon: "clock" },
  INSUFFICIENT_DOC: {
    label: "Insufficient documents",
    variant: "danger",
    trailIcon: "alert",
    tooltip: "PayGlocal needs more documents before the dispute can continue",
  },
  MERCHANT: {
    label: "Won",
    variant: "success",
    trailIcon: "check",
    tooltip: "Resolved in your favour. The disputed amount stays with you.",
  },
  CUSTOMER: {
    label: "Lost",
    variant: "danger",
    trailIcon: "x",
    tooltip: "Resolved in the customer's favour.",
  },
  CLOSED: { label: "Dispute closed", variant: "muted", trailIcon: "check" },
  WITHDRAWN: { label: "Dispute withdrawn", variant: "muted", trailIcon: "check" },
  REFUNDED: { label: "Refunded", variant: "success", trailIcon: "check" },
};

/**
 * The stage chip (CB_LEVEL_MAPPER). Both compliance levels read
 * "Pre-Compliance" on the chip; `filterLabel` tells them apart in the
 * Stage filter. `chevrons` is the design's escalation mark.
 */
export const CB_LEVEL_META: Record<
  CbLevel,
  {
    label: string;
    filterLabel?: string;
    variant: "secondary" | "warning" | "error";
    chevrons: 0 | 1 | 2;
    description: string;
  }
> = {
  CHARGEBACK: {
    label: "Dispute",
    variant: "secondary",
    chevrons: 0,
    description: "The first round. Accept, or contest with evidence before the deadline.",
  },
  PRE_ARBITRATION_COMPLIANCE: {
    label: "Pre-Compliance",
    filterLabel: "Pre-Compliance (Pre-Arb)",
    variant: "warning",
    chevrons: 1,
    description:
      "The bank or the customer disagreed with the first outcome. Accept, or submit additional evidence.",
  },
  PRE_ARBITRATION: {
    label: "Pre-Arbitration",
    variant: "warning",
    chevrons: 1,
    description:
      "The customer's bank escalated after reviewing your evidence. Accept, or submit additional evidence.",
  },
  ARBITRATION_COMPLIANCE: {
    label: "Pre-Compliance",
    filterLabel: "Pre-Compliance (Arb)",
    variant: "warning",
    chevrons: 1,
    description: "The last review before arbitration. Accept, or submit additional evidence.",
  },
  ARBITRATION: {
    label: "Arbitration",
    variant: "error",
    chevrons: 2,
    description:
      "The final stage. Withdraw, or let the bank decide; losing can carry an arbitration fee.",
  },
};

/** Both compliance levels reuse the pre-arbitration merchant screens. */
export const PRE_ARB_SCREEN_LEVELS: CbLevel[] = [
  "PRE_ARBITRATION_COMPLIANCE",
  "PRE_ARBITRATION",
  "ARBITRATION_COMPLIANCE",
];

/** A closed case shows "Closed on" where an open one shows "Respond by". */
export const CLOSED_EXTERNAL_STATUSES: CbExternalDrawerViewStatus[] = [
  "DISPUTE_CLOSED",
  "DISPUTE_CLOSED_MERCHANT_FAV",
  "DISPUTE_CLOSED_CUSTOMER_FAV",
  "NO_RESPONSE",
  "DISPUTE_RESOLVED_BY_REFUND",
];

/** CB_EMPTY_TAB_MAPPING: a tab with no disputes at all (no filter or search). */
export const EMPTY_TAB_COPY: Record<DisputeBucket, { title: string; description: string }> = {
  ACTION_REQUIRED: {
    title: "No disputes need action right now",
    description:
      "You don’t have any open disputes now. If a customer raises one, it will appear here and we’ll notify you so you can review and respond on time.",
  },
  UNDER_REVIEW: {
    title: "No disputes under review",
    description:
      "There are no disputes being reviewed right now. When a dispute moves into review stage, you’ll see it here.",
  },
  ALL_CHARGEBACKS: {
    title: "No disputes to show",
    description:
      "You don’t have any disputes yet. If a customer raises a dispute, it will appear here across all stages.",
  },
  WON: {
    title: "No disputes won yet",
    description:
      "You don’t have any disputes that you’ve won recently. Disputes that have been closed in your favour will appear here.",
  },
  LOST: {
    title: "No disputes lost yet",
    description:
      "You haven’t lost any disputes so far. When a dispute is closed in the customer’s favour, it will appear here.",
  },
};

/** CB_SORT_KEY_MAPPER: sortable column → `cbSearchTimeRange`. */
export const CB_SORT_KEY: Record<string, CbSortKey> = {
  respondBy: "DUE_DATE",
  disputedOn: "CREATION_TIME",
  completedOn: "COMPLETION_TIME",
};

/** pg-dashboard's merchant default: soonest deadline first. */
export const DEFAULT_SORT: { key: CbSortKey | null; isAscOrder: boolean | undefined } = {
  key: "DUE_DATE",
  isAscOrder: true,
};

/** The search box's rotating hints: pg-dashboard's four, plus email (an exact match). */
export const SEARCH_WORDS = ["dispute ID", "amount", "order ID", "reason code", "customer email"];

/** The identifier, amount and status: a row is unreadable without them. */
export const FIXED_COLUMN_KEYS = ["cbId", "amount", "status"];

/** localStorage key for the first-dispute notice, as pg-dashboard names it. */
export const FIRST_TIME_STORAGE_KEY = "disputeManagement";

export const OUTSIDE_STANDARD_REASON =
  "The customer provided a reason that falls outside standard dispute categories";

export const CHARGEBACK_SUPPORT_EMAIL = "chargeback@payglocal.in";

/** Upload rules from CbUploadDocsDrawer. */
export const UPLOAD_ACCEPT = ".pdf,.jpg,.jpeg,.png,.txt,.docx,.zip";
export const UPLOAD_MAX_MB = 10;

/** pg-dashboard's CONTENT_TYPE_MAPPING, for the S3 PUT Content-Type. */
export const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  txt: "text/plain",
  csv: "text/csv;charset=utf-8;",
};

/** pg-dashboard's payment method codes, as v2's own payment-method cells name them. */
export const PAYMENT_INSTRUMENT_BY_METHOD: Record<string, string> = {
  CARD: "CARD",
  INB: "NETBANKING",
  UPI: "UPI",
  PAYMENT_ACCOUNT: "PAYMENT_ACCOUNT_APPLE_PAY",
};

// ── Metrics (mock) ────────────────────────────────────────────────────────────

/**
 * The Metrics section's period control, scoped to the stat cards only, not
 * the table. MOCK: the section reads mockRows.ts (see types.ts).
 */
export const DISPUTE_TIMEFRAMES = [
  { value: "today", label: "Today" },
  { value: "1w", label: "1W" },
  { value: "1m", label: "1M" },
  { value: "3m", label: "3M" },
  { value: "ytd", label: "YTD" },
] as const;

export type DisputeTimeframe = (typeof DISPUTE_TIMEFRAMES)[number]["value"];

/** The mock rows' reason labels, for the Top reasons card (mock). */
export const DISPUTE_REASONS = [
  "Fraudulent",
  "Product not received",
  "Duplicate charge",
  "Subscription cancelled",
  "Other reason",
] as const;

// ── How it works ──────────────────────────────────────────────────────────────

/** HowDoesItWorkDrawer's copy, verbatim. */
export const HOW_IT_WORKS = {
  whatIs:
    "A dispute happens when a customer contacts their bank to question or reverse a card payment. The bank reviews the case and asks for a response from the merchant before making a decision.",
  reasons: [
    "Customer doesn’t recognize the transaction",
    "Product or service wasn’t delivered as expected",
    "Charge was marked as fraudulent",
    "A refund was expected but not received",
  ],
  levelsIntro:
    "A dispute can move through multiple review stages. Each stage increases risk, fees, and urgency.",
  levels: [
    {
      level: "CHARGEBACK" as CbLevel,
      title: "Dispute (Initial Stage)",
      points: ["First review by the customer’s bank", "Lowest risk and lowest fees"],
    },
    {
      level: "PRE_ARBITRATION_COMPLIANCE" as CbLevel,
      title: "Pre-Compliance (Pre-Arb)",
      points: [
        "If bank or customer disagrees with the initial outcome",
        "Higher risk, additional fees may apply",
      ],
    },
    {
      level: "PRE_ARBITRATION" as CbLevel,
      title: "Pre-Arbitration",
      points: [
        "If bank or customer disagrees with the initial outcome",
        "Higher risk, additional fees may apply",
      ],
    },
    {
      level: "ARBITRATION_COMPLIANCE" as CbLevel,
      title: "Pre-Compliance (Arb)",
      points: [
        "If bank or customer disagrees with the initial outcome",
        "Higher risk, additional fees may apply",
      ],
    },
    {
      level: "ARBITRATION" as CbLevel,
      title: "Arbitration (Final Stage)",
      points: [
        "Final decision made by customer’s bank",
        "Highest risk, involves highest fees",
        "Outcome is final, no escalations beyond this stage",
      ],
    },
  ],
  options: [
    { title: "Contest the dispute", description: "Submit documents to prove the claim is valid" },
    { title: "Accept the dispute", description: "Refund the full amount and close the case" },
    {
      title: "Accept partially",
      description: "Refund part of the amount and contest the remaining balance",
    },
  ],
  important: [
    "Disputes have strict response deadlines",
    "Fees may apply as the dispute escalates",
    "A dispute may move through multiple stages",
    "Decisions at the arbitration stage are final",
  ],
  tip: "If you’re unsure or don’t have strong supporting documents, accepting the dispute may be the safer option.",
};
