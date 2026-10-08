// Ported from pg-dashboard's src/features/static-link/types.ts (the API
// contract), trimmed to what this screen reads and writes.

/**
 * The link's own lifecycle. Only LIVE takes payments, and only while the
 * platform-level gate (which a merchant session cannot see) is open too.
 * DRAFT and PAUSED are set by PayGlocal; the merchant's switch moves the link
 * between LIVE and DISABLED and nothing else.
 */
export type StaticLinkStatus = "DRAFT" | "LIVE" | "DISABLED" | "PAUSED";

/**
 * What a display field renders as at checkout. The two address keys carry no
 * type at all: they drive a structured address builder instead.
 */
export type StaticLinkFieldType =
  "SINGLE_LINE_TEXT" | "ALPHABETS" | "ALPHANUMERIC" | "NUMBER" | "EMAIL" | "PHONE_NUMBER";

/** The five keys every link has. */
export type StaticLinkBaseFieldKey =
  "NAME" | "EMAIL" | "MOBILE" | "BILLING_ADDRESS" | "SHIPPING_ADDRESS";

/**
 * One field collected at checkout, as the view endpoint returns it.
 *
 * `optional` is the merchant's own copy; the customer-facing state is
 * `mandatory = !(platformOptional && merchantOptional)`, and a merchant session
 * cannot read the platform's copy. `adminLocked` (pinned mandatory by
 * PayGlocal) is read on its own and is authoritative; absent reads as unlocked.
 */
export interface StaticLinkDisplayField {
  fieldKey: string;
  label: string | null;
  fieldType: StaticLinkFieldType | null;
  defaultValue: string | null;
  optional: boolean;
  adminLocked?: boolean;
  minValue: string | null;
  maxValue: string | null;
}

/** The link itself, under `data.productData`. */
export interface StaticLinkProductData {
  /** The handle in the public URL (`.../@{productId}`), not an internal id. */
  productId: string;
  merchantId: string;
  status: StaticLinkStatus;
  /** The exact URL to share. Server-issued: never build it locally. */
  shareableLink: string | null;
  currency: string | null;
  displayFields: StaticLinkDisplayField[] | null;
  /**
   * Whether the handle can no longer be customized: false until the link has
   * ever gone live, permanently true afterwards.
   */
  handleLocked: boolean;
  creationTime: string | null;
  lastUpdatedTime: string | null;
}

export interface StaticLinkResponse {
  data?: { productData?: StaticLinkProductData } | null;
}

/** Body of `PUT .../{productId}/config`: merged by `fieldKey`. */
export interface StaticLinkDisplayFieldsRequest {
  displayFields: StaticLinkDisplayFieldInput[];
}

/** One entry of the `displayFields` merge. */
export interface StaticLinkDisplayFieldInput {
  fieldKey: string;
  label?: string;
  /** Required for every field except the two address keys. */
  fieldType?: StaticLinkFieldType;
  optional: boolean;
  minValue?: string;
  maxValue?: string;
}

/**
 * Body of `PUT .../{productId}/status`. `handle` is read only on the call that
 * first sets `enabled: true` while `handleLocked` is false; a successful rename
 * replaces `productId`.
 */
export interface StaticLinkStatusRequest {
  enabled: boolean;
  handle?: string;
}

/** One of the five always-present keys, with the copy and type the UI needs. */
export interface StaticLinkBaseField {
  fieldKey: StaticLinkBaseFieldKey;
  label: string;
  /** Null for the two address keys, which take no type on a write. */
  fieldType: StaticLinkFieldType | null;
}

/** One row of the "Details to collect" panel. */
export interface StaticLinkCollectedField {
  fieldKey: string;
  label: string;
  fieldType: StaticLinkFieldType | null;
  /** The merchant's own copy inverted (`!optional`), or locked. */
  required: boolean;
  /** Pinned mandatory by PayGlocal: shown ticked and disabled. */
  platformLocked: boolean;
}

/**
 * One row of `POST .../STATIC_LINK/search`: a flat summary, read for its
 * `productId` (and, while the link is a DRAFT, shown as the link).
 */
export interface StaticLinkSearchRow {
  productId: string;
  status: StaticLinkStatus;
  /** The hosted URL. Null on a draft the server has not minted one for. */
  link: string | null;
  formattedCreationTime: string | null;
  formattedUpdationTime: string | null;
}

/** Doubly nested, as the no-code search endpoints send it: `data.data.items`. */
export interface StaticLinkSearchResponse {
  data?: { data?: { items?: StaticLinkSearchRow[]; totalCount?: number } } | null;
}
