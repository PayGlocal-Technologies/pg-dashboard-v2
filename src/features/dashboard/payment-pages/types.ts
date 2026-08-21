export type PaymentPageStatus = "LIVE" | "PAUSED" | "DRAFT";

export interface PaymentPageRow {
  id: string;
  /** Product / page name shown in the first column. */
  product: string;
  /** Fixed price in `currency`, or null when the payer chooses ("Customer decides"). */
  amount: number | null;
  currency: string;
  status: PaymentPageStatus;
  /** ISO date string */
  createdAt: string;
  /** Hosted page URL, e.g. pay.payglocal.in/acme/books */
  link: string;
}

// ── Create-page builder ──────────────────────────────────────────────────────

export type AmountType = "fixed" | "customer";

export interface PaymentPageProduct {
  id: string;
  title: string;
  description: string;
  /** Object/data URL of the uploaded cover image, if any. */
  coverImage?: string;
}

/** Form state for the "Create a new payment page" builder. Every field feeds
 * the live preview (PaymentPagePreview). */
export interface PaymentPageBuilderValues {
  businessName: string;
  /** URL segment for the business, e.g. "acme-inc". */
  pageHandle: string;
  /** URL segment for this page, e.g. "your-page". */
  pageSlug: string;
  /** Products shown under "What are you selling". */
  products: PaymentPageProduct[];
  amountType: AmountType;
  currency: string;
  /** Raw price string (empty until entered). */
  price: string;
  collectEmail: boolean;
  collectPhone: boolean;
  collectBilling: boolean;
  // Advanced options
  addCustomFields: boolean;
  customFields: CustomField[];
  showContactUs: boolean;
  supportEmail: string;
  supportPhoneCountry: string;
  supportPhone: string;
  website: string;
}

export type PreviewDevice = "desktop" | "mobile";

export type CustomFieldType =
  | "single_line"
  | "alphabets"
  | "alphanumeric"
  | "number"
  | "email"
  | "phone";

export interface CustomField {
  type: CustomFieldType;
  label: string;
  hasDefault: boolean;
  defaultValue: string;
  optional: boolean;
}
