import type {
  CustomField,
  CustomFieldType,
  PaymentPageBuilderValues,
  PaymentPageProduct,
  PaymentPageStatus,
} from "@/features/dashboard/payment-pages/types";

export interface FilterOption {
  value: string;
  label: string;
}

export const PAYMENT_PAGES_PAGE_LIMIT = 10;

// ── Status tabs shown above the filter bar ───────────────────────────────────
export const PAYMENT_PAGE_STATUS_FILTERS: FilterOption[] = [
  { value: "All", label: "All" },
  { value: "LIVE", label: "Live" },
  { value: "PAUSED", label: "Paused" },
  { value: "DRAFT", label: "Draft" },
];

// ── Status chip options (the "+ Status" multi-select filter) ─────────────────
export const PAYMENT_PAGE_STATUS_OPTIONS: { value: PaymentPageStatus; label: string }[] = [
  { value: "LIVE", label: "Live" },
  { value: "PAUSED", label: "Paused" },
  { value: "DRAFT", label: "Draft" },
];

// ── Create-page builder ──────────────────────────────────────────────────────

// Shared currency symbol lookup (also used by the list Amount column).
export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  AED: "د.إ",
  SGD: "S$",
};

export const BUILDER_CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

// Currency → ISO2 country code for the flag CDN (static.payglocal.in/images/flags).
export const CURRENCY_ISO2: Record<string, string> = {
  INR: "in",
  USD: "us",
  EUR: "eu",
  GBP: "gb",
  AED: "ae",
  SGD: "sg",
};

// Recent products shown in the "Add a product" modal search list.
export const PAYMENT_PAGE_RECENT_PRODUCTS: PaymentPageProduct[] = [
  { id: "books", title: "Books", description: "A curated set of books, ready to ship." },
  {
    id: "consulting",
    title: "1:1 Consulting session",
    description: "A 45-minute strategy call.",
  },
  {
    id: "support",
    title: "Support our work",
    description: "A one-time donation to support the project.",
  },
];

export const AMOUNT_TYPE_OPTIONS: { value: PaymentPageBuilderValues["amountType"]; label: string }[] =
  [
    { value: "fixed", label: "Fixed Amount" },
    { value: "customer", label: "Customer decides" },
  ];

// Seeded so the live preview matches the reference design out of the box; every
// field is editable and the preview updates as the merchant types.
export const PAYMENT_PAGE_BUILDER_DEFAULTS: PaymentPageBuilderValues = {
  businessName: "Acme Inc.",
  pageHandle: "acme-inc",
  pageSlug: "your-page",
  products: [],
  amountType: "fixed",
  currency: "INR",
  price: "",
  collectEmail: true,
  collectPhone: true,
  collectBilling: false,
  addCustomFields: false,
  customFields: [],
  showContactUs: true,
  supportEmail: "support@acme-inc.com",
  supportPhoneCountry: "+91 (IN)",
  supportPhone: "9876543210",
  website: "acme-inc.com",
};

// Dial-code options for the Contact us phone field.
export const PHONE_COUNTRY_OPTIONS = ["+91 (IN)", "+1 (US)", "+44 (UK)", "+65 (SG)", "+971 (AE)"];

// Custom field type options (Advanced options → Add custom fields).
export const CUSTOM_FIELD_TYPE_OPTIONS: { value: CustomFieldType; label: string }[] = [
  { value: "single_line", label: "Single Line Text" },
  { value: "alphabets", label: "Alphabets" },
  { value: "alphanumeric", label: "Alphanumeric" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone No." },
];

export const EMPTY_CUSTOM_FIELD: CustomField = {
  type: "single_line",
  label: "",
  hasDefault: false,
  defaultValue: "",
  optional: false,
};
