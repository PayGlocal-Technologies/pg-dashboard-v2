import type {
  InvoiceTheme,
  RecurringType,
  ThemeMetadata,
  ThemePaletteOption,
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
 * What a fresh invoice looks like, and what the server falls back to when the
 * create body omits `themeMetadata` entirely. Kept identical to that default on
 * purpose: an invoice saved before this feature existed and one saved with the
 * panel untouched must render the same way.
 */
export const DEFAULT_THEME_METADATA: ThemeMetadata = {
  theme: "CLASSIC",
  color: "SLATE",
  accent: "AMBER",
};

/**
 * Everything visual this app knows about the server's themes, keyed by the enum
 * name the invoice stores.
 *
 * The server owns the vocabulary and sends a bare list of names; this table only
 * says what each one is called and which layout draws it. That split is what
 * lets the backend add a seventh theme without a frontend release — `themeFor`
 * renders an unknown name through the Classic layout under a title-cased label
 * rather than dropping it.
 *
 * MODERN maps to the geometric-modern layout and MINIMAL to minimal-mono: the
 * two names the server uses are shorter than the two layout ids Nova shipped,
 * and these are the pairings the layouts were designed against.
 */
export const INVOICE_THEMES: Record<string, InvoiceTheme> = {
  CLASSIC: { name: "CLASSIC", label: "Classic", layout: "classic" },
  MODERN: { name: "MODERN", label: "Modern", layout: "geometric-modern" },
  MINIMAL: { name: "MINIMAL", label: "Minimal", layout: "minimal-mono" },
  BOLD_SIDEBAR: {
    name: "BOLD_SIDEBAR",
    label: "Bold Sidebar",
    layout: "bold-sidebar",
    isNew: true,
  },
  PLAYFUL_BORDER: {
    name: "PLAYFUL_BORDER",
    label: "Playful Border",
    layout: "playful-border",
    isNew: true,
  },
  Y2K_BOLD: { name: "Y2K_BOLD", label: "Y2K Bold", layout: "y2k-bold", isNew: true },
};

/**
 * The palette, as it stands if GET /themes cannot be reached.
 *
 * Deliberately a fallback and not a source of truth: the hexes belong to the
 * renderer, so the endpoint's values always win. Without this, a themes outage
 * would leave the preview with no colour to draw at all — and the invoice would
 * still save and render correctly server-side, since only NAMES go on the wire.
 * Ordered as the endpoint returns them, so the swatch rows do not reshuffle when
 * the real list lands.
 */
export const FALLBACK_THEME_NAMES = Object.keys(INVOICE_THEMES);

export const FALLBACK_THEME_COLORS: ThemePaletteOption[] = [
  { name: "SLATE", hex: "#475569" },
  { name: "NAVY", hex: "#1E3A5F" },
  { name: "FOREST", hex: "#166534" },
  { name: "MAROON", hex: "#7F1D1D" },
  { name: "CHARCOAL", hex: "#27272A" },
];

export const FALLBACK_THEME_ACCENTS: ThemePaletteOption[] = [
  { name: "AMBER", hex: "#B45309" },
  { name: "TEAL", hex: "#0F766E" },
  { name: "CRIMSON", hex: "#B91C1C" },
  { name: "INDIGO", hex: "#4338CA" },
];

/** Drawn for a colour name neither the endpoint nor the table above knows. */
export const UNKNOWN_COLOR_HEX = "#475569";

// ─── Templates ────────────────────────────────────────────────────────────────

/** Longest a merchant-chosen template name may be. */
export const TEMPLATE_NAME_MAX_LENGTH = 60;
