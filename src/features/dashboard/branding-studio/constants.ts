import type {
  BrandFont,
  BrandingSettings,
  CornerStyle,
  PayButtonLabel,
  PreviewSurface,
} from "@/features/dashboard/branding-studio/types";

/** PayGlocal blue, the brand and accent every merchant starts from. */
export const DEFAULT_BRAND_COLOR = "#0061E3";

export const DEFAULT_BRANDING: BrandingSettings = {
  logoUrl: null,
  brandColor: DEFAULT_BRAND_COLOR,
  accentColor: DEFAULT_BRAND_COLOR,
  corners: "ROUNDED",
  font: "WORK_SANS",
  buttonLabel: "NONE",
};

export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_ACCEPT = "image/png,image/jpeg";

export const CORNER_OPTIONS: { value: CornerStyle; label: string }[] = [
  { value: "SHARP", label: "Sharp" },
  { value: "ROUNDED", label: "Rounded" },
  { value: "PILL", label: "Pill" },
];

export const FONT_OPTIONS: { value: BrandFont; label: string }[] = [
  { value: "WORK_SANS", label: "Work Sans" },
  { value: "INTER", label: "Inter" },
  { value: "ROBOTO", label: "Roboto" },
  { value: "POPPINS", label: "Poppins" },
  { value: "SYSTEM_UI", label: "System UI" },
];

export const BUTTON_LABEL_OPTIONS: { value: PayButtonLabel; label: string }[] = [
  { value: "NONE", label: "None (default)" },
  { value: "BUY", label: "Buy" },
  { value: "CHECKOUT", label: "Checkout" },
  { value: "PAY", label: "Pay" },
  { value: "SUBSCRIBE", label: "Subscribe" },
  { value: "DONATE", label: "Donate" },
];

export const PREVIEW_SURFACES: { value: PreviewSurface; label: string }[] = [
  { value: "CHECKOUT", label: "Checkout page" },
  { value: "PAYMENT_PAGE", label: "Payment page" },
  { value: "EMAIL", label: "Email" },
];

export const BRANDING_SAVED_MESSAGE =
  "Branding saved. It applies to all checkouts, links, pages and emails from now on.";

/**
 * What the previews are filled with. Every name, address and number is made
 * up for the illustration; none is merchant or customer data.
 */
export const PREVIEW_CONTENT = {
  merchant: "Acme Corp",
  amount: 19616,
  customerName: "Ananya Rao",
  customerEmail: "customer@example.com",
  purpose: "For ASUS ZEN laptop XX2345",
  issuedTo: "accounts@acmecorp.in",
  linkExpiry: "28 Mar '26, 03:59 AM",
  billingAddress: "221B Baker Street, Bengaluru 560001, India",
  product: "Acme Pro, Annual Plan",
  productDescription:
    "Full access to Acme Pro for 12 months, including premium support and all upcoming feature updates.",
  contactEmail: "billing@acmecorp.com",
  contactPhone: "+91 98765 43210",
  contactWebsite: "www.acmecorp.com",
  pageAmount: "1200",
  pagePhone: "98765 43210",
} as const;
