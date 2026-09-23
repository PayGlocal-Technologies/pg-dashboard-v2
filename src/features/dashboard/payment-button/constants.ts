import type { IconName } from "@/components/icon";
import type { FilterChipOption } from "@/components/common/filters/FilterChips";
import type {
  PaymentButtonAmountType,
  PaymentButtonCollectFields,
  PaymentButtonCustomField,
  PaymentButtonCustomFieldType,
  PaymentButtonFormValues,
  PaymentButtonRadius,
  PaymentButtonSize,
  PaymentButtonStatus,
  PaymentButtonTheme,
} from "@/features/dashboard/payment-button/types";

/** Supporting line under the page title. */
export const PAYMENT_BUTTON_PAGE_SUBTITLE =
  "Embeddable buttons that collect payments from any website";

/** Rows per page — pg-dashboard's payment button table asks for 15. */
export const PAYMENT_BUTTON_PAGE_LIMIT = 15;

/**
 * Tab bar. Same arrangement as MCA Links: an underline-style shortcut onto the
 * same status filter the Status chip drives, not a separate filtering axis.
 * "All" clears the status filter entirely.
 */
export const PAYMENT_BUTTON_VIEW_TABS = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "DISABLED", label: "Disabled" },
  { value: "DRAFT", label: "Draft" },
] as const;

export type PaymentButtonViewTab = (typeof PAYMENT_BUTTON_VIEW_TABS)[number]["value"];

/** Options in the Status filter chip's checkbox list. */
export const PAYMENT_BUTTON_STATUS_FILTERS: FilterChipOption[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "DISABLED", label: "Disabled" },
  { value: "DRAFT", label: "Draft" },
];

export const PAYMENT_BUTTON_STATUS_LABEL: Record<PaymentButtonStatus, string> = {
  ACTIVE: "Active",
  DISABLED: "Disabled",
  DRAFT: "Draft",
};

/** What the Amount cell reads when the payer chooses the amount. */
export const CUSTOMER_DECIDES_LABEL = "Customer decides";

/** The search box's placeholder hints, rendered as "Search by " + hint. */
export const PAYMENT_BUTTON_SEARCH_HINTS = ["button title", "button ID"];

export const PAYMENT_BUTTON_SEARCH_ARIA_LABEL = "Search payment buttons by title or button ID";

/** The Amount select's options, each with the glyph its trigger shows. */
export const PAYMENT_BUTTON_AMOUNT_TYPES: {
  value: PaymentButtonAmountType;
  label: string;
  icon: IconName;
}[] = [
  { value: "FIXED", label: "Fixed Amount", icon: "indian-rupee" },
  { value: "CUSTOMER_DECIDES", label: "Customer Decides", icon: "type" },
];

/** The payer details the button can ask for, in the order the form lists them. */
export const PAYMENT_BUTTON_COLLECT_FIELDS: {
  key: keyof PaymentButtonCollectFields;
  label: string;
  icon: IconName;
}[] = [
  { key: "name", label: "Name", icon: "user" },
  { key: "email", label: "Email", icon: "mail" },
  { key: "phone", label: "Phone", icon: "phone" },
  { key: "billingAddress", label: "Billing address", icon: "map-pin" },
];

/** Fallback when the MID's enabled currencies haven't loaded (or failed to). */
export const DEFAULT_BUTTON_CURRENCY = "INR";

/** Custom field types, in the design's order. */
export const PAYMENT_BUTTON_CUSTOM_FIELD_TYPES: {
  value: PaymentButtonCustomFieldType;
  label: string;
}[] = [
  { value: "SINGLE_LINE", label: "Single Line Text" },
  { value: "ALPHABETS", label: "Alphabets" },
  { value: "ALPHANUMERIC", label: "Alphanumeric" },
  { value: "NUMBER", label: "Number" },
  { value: "EMAIL", label: "Email" },
  { value: "PHONE", label: "Phone No." },
];

/** Upper bound on custom fields, so the payment page stays a form, not a survey. */
export const MAX_CUSTOM_FIELDS = 5;

/** A blank custom field. `id` is passed in: minting one reads randomness, which
 *  belongs in the event handler that adds the field, not in render. */
export function emptyCustomField(id: string): PaymentButtonCustomField {
  return {
    id,
    type: "SINGLE_LINE",
    label: "",
    hasDefault: false,
    defaultValue: "",
    optional: false,
  };
}

export const DEFAULT_VALUE_HINT =
  "Pre-fills the field on the payment page. The customer can still change it.";

/** The brand colour a new button starts on: PayGlocal's own primary. */
export const DEFAULT_BUTTON_COLOR = "#0061E3";

export const EMPTY_PAYMENT_BUTTON_FORM: PaymentButtonFormValues = {
  label: "Pay Now",
  amountType: "CUSTOMER_DECIDES",
  currency: DEFAULT_BUTTON_CURRENCY,
  amount: "",
  collect: { name: true, email: true, phone: true, billingAddress: false },
  customFieldsEnabled: false,
  customFields: [emptyCustomField("custom-field-1")],
  contact: { email: "", phoneCountry: "IN", phoneNumber: "" },
  appearance: { theme: "BRAND", color: DEFAULT_BUTTON_COLOR, radius: "ROUNDED", size: "MEDIUM" },
};

export const PAYMENT_BUTTON_THEME_OPTIONS: { value: PaymentButtonTheme; label: string }[] = [
  { value: "BRAND", label: "Brand Color" },
  { value: "DARK", label: "Dark" },
  { value: "LIGHT", label: "Light" },
  { value: "OUTLINE", label: "Outline" },
];

export const PAYMENT_BUTTON_RADIUS_OPTIONS: { value: PaymentButtonRadius; label: string }[] = [
  { value: "SHARP", label: "Sharp" },
  { value: "ROUNDED", label: "Rounded" },
  { value: "PILL", label: "Pill" },
];

export const PAYMENT_BUTTON_SIZE_OPTIONS: { value: PaymentButtonSize; label: string }[] = [
  { value: "SMALL", label: "Small" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LARGE", label: "Large" },
];

/** What the Add custom fields info tip says. */
export const CUSTOM_FIELDS_HINT =
  "Ask the customer for extra details on the payment page, such as an order reference.";

/**
 * The stand-in product the preview renders the button under. It is the
 * merchant's own website that hosts the button, so the preview can only ever
 * show an illustrative product; the badge says so.
 */
export const PREVIEW_DEMO_PRODUCT = {
  name: "Monstera Deliciosa Planter",
  description:
    "A statement Monstera deliciosa potted in a matte ceramic planter, bringing lush, low-maintenance greenery to any room.",
};

/** Shown in the preview when no merchant website is on file. */
export const PREVIEW_FALLBACK_DOMAIN = "yourwebsite.com";

/**
 * The embed script the Get code snippet points at, as the design draws it.
 * UNVERIFIED: pg-dashboard never hardcodes this; it takes `pbScriptSrcUrl`
 * from the create/download response. Swap for that value once a button exists.
 */
export const PAYMENT_BUTTON_SCRIPT_SRC = "https://checkout.payglocal.in/v1/payment-button.js";

/** Stands in for the button id in the snippet until the create call issues one. */
export const BUTTON_ID_PLACEHOLDER = "<assigned on create>";

/** The `data-collect-fields` token for each payer detail. */
export const COLLECT_FIELD_TOKEN: Record<keyof PaymentButtonCollectFields, string> = {
  name: "name",
  email: "email",
  phone: "phone",
  billingAddress: "billing_address",
};

export const EMBED_CODE_COPIED_MESSAGE = "Embed code copied";
