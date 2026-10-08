import {
  STATIC_LINK_BASE_FIELDS,
  STATIC_LINK_DEFAULT_FIELD_TYPE,
  STATIC_LINK_HANDLE_MAX,
  STATIC_LINK_HANDLE_MIN,
  STATIC_LINK_RESERVED_HANDLES,
} from "@/features/dashboard/static-link/constants";
import type {
  StaticLinkCollectedField,
  StaticLinkDisplayField,
  StaticLinkDisplayFieldInput,
  StaticLinkProductData,
  StaticLinkResponse,
  StaticLinkSearchResponse,
  StaticLinkSearchRow,
} from "@/features/dashboard/static-link/types";

// Ported from pg-dashboard's src/features/static-link/helper.ts.

/** The link under `data.productData`, or null when there is none yet. */
export function readStaticLink(response?: StaticLinkResponse | null): StaticLinkProductData | null {
  const productData = response?.data?.productData;
  return productData?.productId ? productData : null;
}

/**
 * Drops the scheme for display only: `https://buy.example/@x` reads as
 * `buy.example/@x`. Copying always uses the untouched server value.
 */
export function toDisplayLink(shareableLink?: string | null): string {
  return (shareableLink ?? "").replace(/^https?:\/\//i, "");
}

/**
 * The merchant's own switch is on. LIVE is the only "on" position it can
 * produce; the platform's own gate is not readable from here.
 */
export function isSwitchedOn(link?: StaticLinkProductData | null): boolean {
  return link?.status === "LIVE";
}

/**
 * Still with PayGlocal: provisioned but never published, or paused by ops.
 * Nothing the merchant does from here resolves it.
 */
export function isAwaitingPlatform(link?: StaticLinkProductData | null): boolean {
  return link?.status === "DRAFT" || link?.status === "PAUSED";
}

/** The type a write has to restate for a stored field, address keys excepted. */
function toFieldType(stored: StaticLinkDisplayField): StaticLinkCollectedField["fieldType"] {
  if (stored.fieldType) return stored.fieldType;
  const base = STATIC_LINK_BASE_FIELDS.find((field) => field.fieldKey === stored.fieldKey);
  // A base key keeps its own answer, including the deliberate null on the two
  // address keys. Anything else is a merchant's own business-identity field.
  if (base) return base.fieldType;
  return STATIC_LINK_DEFAULT_FIELD_TYPE;
}

/**
 * The fields this link actually collects: whichever base keys the server
 * returned (in the checkout's order, under this dashboard's labels), then any
 * business-identity field the merchant already has (`GST` and the like).
 *
 * A base key the response does not carry is not shown: the checkout does not
 * ask for it, and the field set is the server's, not the merchant's to extend.
 */
export function toCollectedFields(link?: StaticLinkProductData | null): StaticLinkCollectedField[] {
  const stored = link?.displayFields ?? [];
  const storedByKey = new Map(stored.map((field) => [field.fieldKey, field]));

  const baseRows = STATIC_LINK_BASE_FIELDS.filter((base) => storedByKey.has(base.fieldKey)).map(
    (base) => {
      const match = storedByKey.get(base.fieldKey);
      return {
        fieldKey: base.fieldKey,
        label: base.label,
        fieldType: match ? toFieldType(match) : base.fieldType,
        // Locked fields are mandatory whatever the merchant's own flag says.
        required: Boolean(match?.adminLocked) || (match ? !match.optional : false),
        platformLocked: Boolean(match?.adminLocked),
      };
    }
  );

  const customRows = stored
    .filter((field) => !STATIC_LINK_BASE_FIELDS.some((base) => base.fieldKey === field.fieldKey))
    .map((field) => ({
      fieldKey: field.fieldKey,
      label: field.label?.trim() || field.fieldKey,
      fieldType: toFieldType(field),
      required: Boolean(field.adminLocked) || !field.optional,
      platformLocked: Boolean(field.adminLocked),
    }));

  return [...baseRows, ...customRows];
}

/**
 * The merge body for the fields whose required state actually changed, empty
 * when nothing moved (the caller then skips the save). Locked fields are never
 * sent, and a type is sent only where the contract allows one.
 */
export function buildDisplayFieldsRequest(
  fields: StaticLinkCollectedField[],
  requiredKeys: string[]
): StaticLinkDisplayFieldInput[] {
  return fields
    .filter((field) => !field.platformLocked)
    .filter((field) => field.required !== requiredKeys.includes(field.fieldKey))
    .map((field) => ({
      fieldKey: field.fieldKey,
      label: field.label,
      ...(field.fieldType ? { fieldType: field.fieldType } : {}),
      optional: !requiredKeys.includes(field.fieldKey),
    }));
}

/**
 * The handle as the server will store it: lowercased, everything
 * non-alphanumeric dropped (its own sanitizing before the availability check).
 */
export function sanitizeStaticLinkHandle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Why this handle cannot be used, or null when it looks usable. Local checks
 * only: whether it is taken comes back as an error on the activation call.
 */
export function validateStaticLinkHandle(value: string): string | null {
  const handle = sanitizeStaticLinkHandle(value);
  if (!handle) return "Enter a link name.";
  if (handle.length < STATIC_LINK_HANDLE_MIN) {
    return `Use at least ${STATIC_LINK_HANDLE_MIN} characters.`;
  }
  if (handle.length > STATIC_LINK_HANDLE_MAX) {
    return `Use at most ${STATIC_LINK_HANDLE_MAX} characters.`;
  }
  if (STATIC_LINK_RESERVED_HANDLES.includes(handle)) return "That name is reserved.";
  return null;
}

/** The merchant may still choose their own handle: the link exists, unlocked. */
export function canCustomizeStaticLinkHandle(link: StaticLinkProductData | null): boolean {
  return Boolean(link) && !link?.handleLocked;
}

/** The merchant's link as the search summarises it; the first row wins. */
export function readStaticLinkRow(
  response?: StaticLinkSearchResponse | null
): StaticLinkSearchRow | null {
  const items = response?.data?.data?.items;
  if (!Array.isArray(items)) return null;
  return items.find((row) => row?.productId) ?? null;
}

/**
 * The search row as the screen's `link`, for the window before activation
 * (the get-by-id read 404s on a DRAFT). `handleLocked` follows the status: the
 * handle locks the moment the link first goes live.
 */
export function toLinkFromSearchRow(
  row: StaticLinkSearchRow | null,
  merchantId: string
): StaticLinkProductData | null {
  if (!row) return null;
  return {
    productId: row.productId,
    merchantId,
    status: row.status,
    shareableLink: row.link,
    currency: null,
    displayFields: null,
    handleLocked: row.status !== "DRAFT",
    creationTime: row.formattedCreationTime,
    lastUpdatedTime: row.formattedUpdationTime,
  };
}

/**
 * Splits a shareable link into the fixed part and the handle
 * (`buy.example/@` + `acme`), for the handle editor. An empty handle when the
 * link is missing or shaped differently, rather than a guessed prefix.
 */
export function splitShareableLink(shareableLink?: string | null): {
  prefix: string;
  handle: string;
} {
  const link = toDisplayLink(shareableLink ?? "");
  const at = link.lastIndexOf("@");
  if (at === -1) return { prefix: link ? `${link}/@` : "", handle: "" };
  return { prefix: link.slice(0, at + 1), handle: link.slice(at + 1) };
}

/** The link's host (`buy.example`), for the How it works illustration. */
export function staticLinkHost(shareableLink?: string | null): string {
  return toDisplayLink(shareableLink).split("/")[0] ?? "";
}
