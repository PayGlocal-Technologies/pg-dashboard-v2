/**
 * Validation rules and copy for the Invoice Links editor.
 *
 * Every regex, every limit and every message string is verbatim from
 * pg-dashboard/src/features/create-mca-payment-invoice/ (`validationPatterns.ts`,
 * `constants.tsx`, `components/forms/InvoiceDetails.tsx`,
 * `components/InvoiceTable.tsx`). This copy has been through compliance review
 * upstream; changing it is a separate, explicit decision.
 */

export const EXTENDED_ALNUM_PATTERN = /^[a-zA-Z0-9!#$%&^*()_,\-.:;=?:~ ]*$/;
export const EXTENDED_ALNUM_PATTERN_MESSAGE =
  "can only contain letters, numbers, spaces, and ! # $ % & ^ * ( ) _ , - . : ; = ? ~";

export const INVOICE_ITEM_TEXT_PATTERN = /^[A-Za-z0-9_., +:'/&|#@-]*$/;
export const INVOICE_ITEM_TEXT_PATTERN_MESSAGE =
  "can only contain letters, numbers, spaces, and _ . , + : ' / & | # @ -";

/** Upstream's BILLING_SHIPPING_NAME_MAX_LENGTH — the backend splits this into first/last name. */
export const NAME_MAX_LENGTH = 60;
export const EMAIL_MAX_LENGTH = 255;
export const PHONE_MAX_LENGTH = 20;
export const INVOICE_NO_MIN_LENGTH = 3;
export const INVOICE_NO_MAX_LENGTH = 16;
export const ADDRESS_LINE_MAX_LENGTH = 400;
export const CITY_MAX_LENGTH = 60;
export const ZIPCODE_MAX_LENGTH = 10;
export const ITEM_TEXT_MAX_LENGTH = 600;

/** Default calling code when a draft carries none. Upstream falls back to "+91". */
export const DEFAULT_CALLING_CODE = "+91";

/** How many clients the recipient picker lists per search. Typing narrows it. */
export const CLIENT_PICKER_LIMIT = 25;

/** Shared with create-invoice's TEMPLATE_NAME_MAX_LENGTH: one store, one limit. */
export const TEMPLATE_NAME_MAX_LENGTH = 60;

/** Upstream's hardcoded fallback when the currency map has not loaded. */
export const FALLBACK_CURRENCIES = ["USD", "INR", "EUR"];

export const DISCOUNT_TYPE_OPTIONS = [
  { label: "Percentage", value: "percentage" },
  { label: "Fixed", value: "fixed" },
];

/**
 * An amount: digits with at most two decimal places, no sign.
 * Mirrors upstream's amountFormatValidator.
 */
export const AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;
/** Whole numbers only — upstream's numericValidator. */
export const NUMERIC_PATTERN = /^\d+$/;
/** Digits with optional decimals — upstream's numericWithDecimalValidator. */
export const NUMERIC_DECIMAL_PATTERN = /^\d+(\.\d+)?$/;

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Letterhead logo ──────────────────────────────────────────────────────────

/**
 * MIME → the `fileExtension` the logo endpoints are told about.
 *
 * Upstream only ever supports PNG and hardcodes `".png"` in BOTH legs — the
 * POST body and the `x-amz-meta-fileextension` header on the S3 PUT. Adding
 * JPG means deriving it instead, and the two legs MUST agree: the backend
 * builds the object key from leg 1's value and the bucket policy checks leg
 * 2's, so a mismatch is a rejected upload.
 *
 * `image/jpeg` covers both `.jpg` and `.jpeg` filenames, so a canonical value
 * has to be picked for it. `.jpg` is the choice here.
 *
 * OPEN WITH THE BACKEND: there is no source precedent for a non-PNG logo, so
 * neither "does the logo endpoint accept JPG at all" nor "does it want `.jpg`
 * or `.jpeg`" can be answered from pg-dashboard. If JPG uploads are rejected,
 * this map is the first place to look.
 */
export const LOGO_EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
};

/** The `accept` attribute and the validation list, kept as one source. */
export const LOGO_ACCEPTED_MIMES = Object.keys(LOGO_EXTENSION_BY_MIME);
export const LOGO_ACCEPT_ATTR = LOGO_ACCEPTED_MIMES.join(",");

/** Upstream's limit, unchanged. */
export const LOGO_MAX_MB = 100;
