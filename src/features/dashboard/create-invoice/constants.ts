import type {
  InvoiceBrandingStyle,
  RecurringType,
} from "@/features/dashboard/create-invoice/types";

/**
 * Production's wizard steps. The flat editor does not render them, but the
 * server persists `currentStep` on every draft and pg-dashboard reopens drafts
 * at whichever one it names, so the vocabulary has to stay identical.
 * Order matters: deriveCurrentStep() walks it.
 */
export const INVOICE_STEPS = ["BILLER", "CLIENT", "ITEMS", "BANK", "OTHER", "DATE"] as const;

/** Line-item kind. Values copied from SKU_TYPE_OPTIONS in pg-dashboard. */
export const LINE_ITEM_TYPE_OPTIONS = [
  { label: "Good", value: "GOOD" },
  { label: "Service", value: "SERVICE" },
] as const;

/**
 * Nova offers GST as labelled chips; the API stores a bare percentage on each
 * line item. "None" is the empty string rather than "0" so an untaxed item
 * round-trips as absent rather than as an explicit zero rate.
 */
export const GST_RATE_OPTIONS = [
  { label: "None", value: "" },
  { label: "5% GST", value: "5" },
  { label: "12% GST", value: "12" },
  { label: "18% GST", value: "18" },
  { label: "28% GST", value: "28" },
] as const;

/** Due-date presets from Nova's chip. Local only: the API stores a date. */
export const DUE_TERM_OPTIONS = [
  { id: "today", label: "Today", days: 0 },
  { id: "tomorrow", label: "Tomorrow", days: 1 },
  { id: "days_7", label: "7 days", days: 7 },
  { id: "days_14", label: "14 days", days: 14 },
  { id: "days_30", label: "30 days", days: 30 },
  { id: "days_45", label: "45 days", days: 45 },
  { id: "days_60", label: "60 days", days: 60 },
  { id: "days_90", label: "90 days", days: 90 },
] as const;

/**
 * The backend enum, not Nova's. Nova offers weekly/monthly/quarterly/yearly,
 * none of which the API accepts, and the API has two-week and two-month cycles
 * Nova has no option for. Extending the enum is a backend change; until then
 * the UI can only offer what the server will store.
 */
export const RECURRING_OPTIONS: { label: string; value: RecurringType }[] = [
  { label: "Every 2 weeks", value: "EVERY_2_WEEK" },
  { label: "Every 1 month", value: "EVERY_1_MONTH" },
  { label: "Every 2 months", value: "EVERY_2_MONTH" },
  { label: "Every 1 quarter", value: "EVERY_1_QUARTER" },
];

export const DISCOUNT_TYPE_OPTIONS = [
  { label: "%", value: "percentage" },
  { label: "Flat", value: "fixed" },
] as const;

/**
 * Legal attestation gating invoice generation, copied verbatim from
 * pg-dashboard's DateDetails step. Two variants: linking to a transaction
 * additionally authorises attaching the document to it.
 */
export const CONSENT_TEXT = {
  standard:
    "By proceeding with this action, you confirm and acknowledge that all information submitted for invoice generation is accurate and complete.",
  linked:
    "By proceeding with this action, you authorize the platform to attach the generated invoice to the selected transaction and also confirm that all information submitted for invoice generation is accurate and complete.",
  expanded:
    "PayGlocal Technologies Private Limited acts only as a technology platform and does not review, validate or verify the accuracy, completeness, or legality of any information that you submit, nor does it ensure compliance with any tax or regulatory requirements. All invoices generated through this platform are created solely based on the information you provide and are intended exclusively for your internal records and communication with your customers.",
} as const;

/** Address fields a client must have before an invoice can be raised for them. */
export const REQUIRED_ADDRESS_KEYS = [
  "streetAddress1",
  "city",
  "state",
  "country",
  "zipcode",
] as const;

/** How long the editor waits after the last keystroke before saving the draft. */
export const AUTOSAVE_DEBOUNCE_MS = 1200;

// ─── Branding ─────────────────────────────────────────────────────────────────

/**
 * The document layout the server's generate-invoice actually renders.
 *
 * The other five styles below exist in the editor and its preview but the
 * renderer does not know about them yet, so the picker badges them and this
 * constant is the single place that fact is encoded. When the renderer accepts a
 * layout id, delete this constant and the badge that reads it.
 */
export const RENDERER_LAYOUT_ID = "classic";

/**
 * Invoice themes, ported from Nova (lib/mock-data/invoice-create.ts).
 *
 * `classic` is deliberately first and is what a fresh invoice gets: it is the
 * one layout the server can produce, so the default never diverges from the
 * document a customer receives.
 */
export const INVOICE_BRANDING_STYLES: InvoiceBrandingStyle[] = [
  {
    id: "style_classic",
    name: "Classic",
    layout: "classic",
    defaultPrimaryColor: "#0061E3",
    defaultAccentColor: "#0061E3",
  },
  {
    id: "style_minimal_mono",
    name: "Minimal Mono",
    layout: "minimal-mono",
    defaultPrimaryColor: "#1F2937",
    defaultAccentColor: "#9CA3AF",
  },
  {
    id: "style_bold_sidebar",
    name: "Bold Sidebar",
    layout: "bold-sidebar",
    defaultPrimaryColor: "#1E3A8A",
    defaultAccentColor: "#C2410C",
    isNew: true,
  },
  {
    id: "style_playful_border",
    name: "Playful Border",
    layout: "playful-border",
    defaultPrimaryColor: "#3730A3",
    defaultAccentColor: "#EAB308",
    isNew: true,
  },
  {
    id: "style_y2k_bold",
    name: "Y2K Bold",
    layout: "y2k-bold",
    defaultPrimaryColor: "#0F0F0F",
    defaultAccentColor: "#EC4899",
    isNew: true,
  },
  {
    id: "style_geometric_modern",
    name: "Geometric Modern",
    layout: "geometric-modern",
    defaultPrimaryColor: "#4C4499",
    defaultAccentColor: "#A3E635",
  },
];

export const DEFAULT_BRANDING_STYLE = INVOICE_BRANDING_STYLES[0]!;

/**
 * Swatches offered beside the hex field in the colour picker.
 *
 * flux has no colour-input component and a native `<input type="color">` is
 * exactly the bare interactive element CLAUDE.md's UI rule forbids, so the
 * picker is swatches plus a validated hex field. Raised as a design-system gap
 * rather than bypassed: a flux `<ColorInput>` would replace both halves.
 */
export const BRAND_COLOR_SWATCHES = [
  "#0061E3",
  "#1E3A8A",
  "#3730A3",
  "#4C4499",
  "#0F766E",
  "#15803D",
  "#B45309",
  "#BE123C",
  "#0F0F0F",
  "#4B5563",
] as const;

// ─── Templates ────────────────────────────────────────────────────────────────

/** Longest a merchant-chosen template name may be. */
export const TEMPLATE_NAME_MAX_LENGTH = 60;
