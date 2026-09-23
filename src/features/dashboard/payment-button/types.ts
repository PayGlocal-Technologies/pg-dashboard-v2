/**
 * A payment button's lifecycle state, as the design names it.
 *
 * pg-dashboard's list endpoint (`/search/wqr`) only ever returns ACTIVE or
 * INACTIVE in `merchantProductDataStatus`. DRAFT has no backend equivalent yet,
 * and INACTIVE is what this page calls DISABLED — see mapWqrStatus when the
 * endpoint is wired.
 */
export type PaymentButtonStatus = "ACTIVE" | "DISABLED" | "DRAFT";

/** Fixed: the button always charges `amount`. Customer: the payer types it. */
export type PaymentButtonAmountType = "FIXED" | "CUSTOMER_DECIDES";

/** One row of the Payment Button table. */
export interface PaymentButton {
  /** Stable row id — mirrors the `gid` every other record on the dashboard is keyed by. */
  gid: string;
  /** The MID the button belongs to; every per-button endpoint is addressed by it. */
  mid: string;
  /** The button's public id (`productId` in the list response), e.g. `pl_TOIAYILU`. */
  buttonId: string;
  /** Merchant-given name. Not a column, but what the search box matches first. */
  title: string;
  /** The text on the button itself, e.g. "Pay Now". */
  label: string;
  amountType: PaymentButtonAmountType;
  /** Decimal string. Null when `amountType` is CUSTOMER_DECIDES. */
  amount: string | null;
  currency: string;
  status: PaymentButtonStatus;
  /** Null for a draft, which has never been live to take a payment. */
  successfulPayments: number | null;
  /** Total collected, in `currency`. Null for a draft, as above. */
  revenue: string | null;
  /** API timestamp, rendered through formatTimestamp. */
  createdAt: string;
}

/**
 * pg-dashboard's list row, verbatim (`WqrProductEntry`). Kept here so the
 * mapping to PaymentButton is written against the real contract once the
 * endpoint is wired.
 */
export interface WqrProductEntry {
  mid: string;
  productId: string;
  merchantProductDataStatus: string;
  merchantProductDataSubType: string;
  formattedCreationTime: string;
  formattedExpiryDate: string;
  formattedStartDate: string;
}

export interface PaymentButtonListResponse {
  data: {
    headers?: string[];
    data?: WqrProductEntry[];
    totalCount?: number;
  };
}

/** What the create form collects from the payer, one checkbox each. */
export interface PaymentButtonCollectFields {
  name: boolean;
  email: boolean;
  phone: boolean;
  billingAddress: boolean;
}

export type PaymentButtonTheme = "BRAND" | "DARK" | "LIGHT" | "OUTLINE";
export type PaymentButtonRadius = "SHARP" | "ROUNDED" | "PILL";
export type PaymentButtonSize = "SMALL" | "MEDIUM" | "LARGE";

/** How the embedded button draws. `color` is a hex string as typed. */
export interface PaymentButtonAppearance {
  theme: PaymentButtonTheme;
  color: string;
  radius: PaymentButtonRadius;
  size: PaymentButtonSize;
}

/** The merchant's own contact details, always offered to the payer on the payment page. */
export interface PaymentButtonContact {
  email: string;
  /** ISO2, which is what CountrySelect stores; the dial code derives from it. */
  phoneCountry: string;
  phoneNumber: string;
}

export type PaymentButtonCustomFieldType =
  "SINGLE_LINE" | "ALPHABETS" | "ALPHANUMERIC" | "NUMBER" | "EMAIL" | "PHONE";

/** One merchant-defined field the payer fills in on the payment page. */
export interface PaymentButtonCustomField {
  /** Client-side key for the list; never sent. */
  id: string;
  type: PaymentButtonCustomFieldType;
  label: string;
  hasDefault: boolean;
  defaultValue: string;
  optional: boolean;
}

/** The create/edit form's values. */
export interface PaymentButtonFormValues {
  label: string;
  amountType: PaymentButtonAmountType;
  currency: string;
  /** Decimal string. Ignored while `amountType` is CUSTOMER_DECIDES. */
  amount: string;
  collect: PaymentButtonCollectFields;
  customFieldsEnabled: boolean;
  customFields: PaymentButtonCustomField[];
  contact: PaymentButtonContact;
  appearance: PaymentButtonAppearance;
}

/** `GET /v2/merchants/{mid}/currency`, verbatim from pg-dashboard. */
export interface CurrencyEnableResponse {
  data: {
    currencyEnable: Record<
      string,
      { currencyName: string; currencySymbol: string; currencyExponent: string }
    >;
  };
}

/**
 * `GET /v1/merchants/{mid}/profile`, as pg-dashboard reads it: `merchantUrl`
 * off the top level of the response, not under `data`.
 */
export interface MerchantProfileResponse {
  merchantUrl?: string;
}

/** What create (and download) return: the embed script's coordinates. */
export interface PaymentButtonScript {
  pbScriptSrcUrl?: string;
  pbId?: string;
  pbScriptId?: string;
}

export interface CreatePaymentButtonResponse {
  data?: PaymentButtonScript;
}

/**
 * `POST /v1/merchants/{mid}/payment-button`, plain JSON. Exactly the fields
 * pg-dashboard's EditPaymentButton form submits: currency, the read-only
 * website, and the two required-field switches it renders (it never sends
 * customerName, though the type allows it).
 */
export interface CreatePaymentButtonBody {
  iso3CurrencyCode: string;
  webDomain: string;
  pbRequiredFields: {
    customerPhoneNumber: boolean;
    customerEmailId: boolean;
  };
}
