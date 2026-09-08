import { formatDate } from "@/lib/utils/format";
import {
  DEFAULT_THEME_METADATA,
  DUE_TERM_OPTIONS,
  INVOICE_STEPS,
  INVOICE_THEMES,
  REQUIRED_ADDRESS_KEYS,
} from "@/features/dashboard/create-invoice/constants";
import type {
  ClientData,
  InvoiceCreatePayload,
  InvoiceData,
  InvoiceFormState,
  InvoiceTheme,
  LineItemDraft,
  ThemeMetadata,
} from "@/features/dashboard/create-invoice/types";
import type {
  ApiInvoiceTemplate,
  InvoiceTemplate,
  InvoiceTemplateSnapshot,
  TemplateWriteBody,
} from "@/features/dashboard/invoice-templates/types";

// ─── Totals ───────────────────────────────────────────────────────────────────
// Ported verbatim from pg-dashboard/src/features/create-invoice/helpers.ts.
//
// Read this before changing anything: per-item GST is folded INTO the subtotal,
// then the invoice-level discount comes off that gross figure, then the
// invoice-level tax is applied to what remains. Nova computes it differently
// (tax-exclusive subtotal, tax added at the end) and produces different numbers
// from the same inputs. Production's arithmetic wins because the server
// re-derives the same figures when it renders the PDF — diverge here and the
// on-screen total stops matching the document the customer receives.

export const getAmount = (rate: string, qty: string, gstRate: string): number => {
  const rateNum = Number(rate);
  const qtyNum = Number(qty);
  const gstNum = Number(gstRate) || 0;

  const baseAmount = rateNum * qtyNum;
  const gstAmount = (baseAmount * gstNum) / 100;
  const amount = baseAmount + gstAmount || 0;
  return Number(amount.toFixed(2));
};

export const getSubtotal = (items: LineItemDraft[] | undefined): string => {
  const subtotal = items
    ? items.reduce(
        (acc, item) =>
          acc + getAmount(item.unitPrice || "0", item.quantity || "0", item.gstRate || "0"),
        0
      )
    : 0;
  return subtotal.toFixed(2);
};

export const getDiscountAmount = (
  discountValue: string,
  discountType: string,
  items: LineItemDraft[] | undefined
): string => {
  if (discountType === "percentage") {
    const discountPercent = Number(discountValue) || 0;
    const subtotal = getSubtotal(items);
    return ((discountPercent / 100) * Number(subtotal)).toFixed(2);
  }
  return discountValue ? Number(discountValue).toFixed(2) : "0.00";
};

export const getTaxAmount = (
  taxValue: string,
  discountValue: string,
  discountType: string,
  items: LineItemDraft[] | undefined
): string => {
  const taxPercent = Number(taxValue) || 0;
  const subtotal = getSubtotal(items);
  const discountAmount = getDiscountAmount(discountValue, discountType, items);
  return ((taxPercent / 100) * (Number(subtotal) - Number(discountAmount))).toFixed(2);
};

export const getTotalAmount = (
  items: LineItemDraft[],
  taxAmount: string,
  discountAmount: string
): string => {
  const subtotal = getSubtotal(items);
  const tax = Number(taxAmount) || 0;
  const discount = Number(discountAmount) || 0;
  return (Number(subtotal) - discount + tax).toFixed(2);
};

/** Every derived money figure the editor and preview need, from one call. */
export interface InvoiceTotals {
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  total: string;
}

export const getInvoiceTotals = (form: InvoiceFormState): InvoiceTotals => {
  const subtotal = getSubtotal(form.lineItems);
  const discountAmount = getDiscountAmount(form.discountValue, form.discountType, form.lineItems);
  const taxAmount = getTaxAmount(
    form.taxValue,
    form.discountValue,
    form.discountType,
    form.lineItems
  );
  const total = getTotalAmount(form.lineItems, taxAmount, discountAmount);

  return { subtotal, discountAmount, taxAmount, total };
};

// ─── Line-item validity ───────────────────────────────────────────────────────

/** Production's ITEMS gate: description, type, unit price and quantity all set. */
export const isLineItemComplete = (item: LineItemDraft): boolean =>
  !!item.description?.trim() &&
  !!item.unitPrice?.trim() &&
  !!item.quantity?.trim() &&
  !!item.type?.trim();

export const hasCompleteLineItems = (items: LineItemDraft[]): boolean =>
  items.length > 0 && items.every(isLineItemComplete);

// ─── Resume point ─────────────────────────────────────────────────────────────

/**
 * The flat editor has no wizard, but the server still persists `currentStep` and
 * pg-dashboard still uses it to decide which step to reopen a draft on. Rather
 * than pinning a constant and making every draft reopen in the wrong place over
 * there, derive the first section that is still incomplete, in production's own
 * step order. A draft saved here therefore resumes sensibly in either app.
 */
export const deriveCurrentStep = (form: InvoiceFormState): string => {
  if (!form.clientId) return "CLIENT";
  if (!hasCompleteLineItems(form.lineItems)) return "ITEMS";
  if (!form.accountNo) return "BANK";
  // OTHER holds notes / LUT / logo / signature, all optional, so it is never
  // the blocking step — production lets you page straight through it.
  if (!form.invoiceNumber || !form.invoiceDate || !form.dueDate || !form.userCreateConsent) {
    return "DATE";
  }
  return INVOICE_STEPS[INVOICE_STEPS.length - 1];
};

// ─── Form state → wire payload ────────────────────────────────────────────────

export interface BuildPayloadArgs {
  form: InvoiceFormState;
  /** The effective theme trio: the merchant's override, or the invoice's own. */
  branding: ThemeMetadata;
  /** The template this invoice descends from. `null` detaches it. */
  templateId: string | null;
  /** Last document the server sent back; unspecified fields are preserved. */
  invoiceDetails: Partial<InvoiceData> | undefined;
  invoiceId: string;
  gid: string;
  /** ?clientId= seed, only used before the draft has a client of its own. */
  clientIdParam: string;
}

/**
 * Builds the full document for POST /mca-invoice/{mid}/create.
 *
 * Production assembles this incrementally, one step's slice per request (see
 * stepPayloadBuilders in pg-dashboard's helpers.ts). The flat editor has every
 * field at once, so it sends the union of all six slices. Field names, types
 * and the `{...invoiceDetails}` spread are kept identical to production so the
 * server sees a payload it already understands.
 */
export const toInvoicePayload = ({
  form,
  branding,
  templateId,
  invoiceDetails,
  invoiceId,
  gid,
  clientIdParam,
}: BuildPayloadArgs): InvoiceCreatePayload => {
  const { subtotal, discountAmount, taxAmount, total } = getInvoiceTotals(form);

  // Production keeps totalPrice on each draft row and posts the rows verbatim,
  // strings and all. Computing it here instead of holding it in state keeps the
  // editing state minimal while putting the identical shape on the wire.
  const lineItems = form.lineItems.map((item) => ({
    key: item.key,
    type: item.type,
    description: item.description,
    hsn: item.hsn,
    gstRate: item.gstRate,
    unitPrice: item.unitPrice,
    quantity: item.quantity,
    totalPrice: getAmount(item.unitPrice || "0", item.quantity || "0", item.gstRate || "0").toFixed(
      2
    ),
    saveAsSku: item.saveAsSku ?? false,
  }));

  // The previous response is spread first so server-owned fields we do not edit
  // (status, mid, autoGenerated, the Zoho sync block) survive the round trip.
  // Its wire-shaped lineItems/discount/tax are dropped, because the
  // request-shaped versions built below must win.
  const {
    lineItems: _prevItems,
    discount: _prevDiscount,
    tax: _prevTax,
    ...carried
  } = invoiceDetails ?? {};

  return {
    ...carried,
    id: invoiceId || undefined,

    // BILLER
    clientId: form.clientId || clientIdParam || undefined,
    gid: gid || undefined,

    // ITEMS
    lineItems,
    currency: form.currency,
    memo: form.memo,
    totalAmount: Number(total),
    subTotal: Number(subtotal),
    discount: {
      discountName: form.discountName || undefined,
      value: form.discountValue || undefined,
      type: form.discountType,
      discountAmount,
    },
    tax: {
      taxName: form.taxName || undefined,
      value: form.taxValue || undefined,
      taxAmount,
    },

    // BANK
    accountNo: form.accountNo || invoiceDetails?.accountNo,

    // OTHER
    notes: form.notes,
    lut: form.lut,
    logoEnabled: form.logoEnabled,
    signatureEnabled: form.signatureEnabled,
    // Three enum names, never the hexes beside them on screen: the renderer
    // owns what each name is worth. Always sent rather than omitted-when-default
    // so that switching *back* to Classic is a change the server records, not a
    // field it stops seeing.
    themeMetadata: branding,
    // Explicitly null rather than omitted when there is no link: `...carried`
    // above spreads the previous response, so leaving it out would re-assert a
    // template the merchant has just detached from.
    templateId,

    // DATE
    invoiceNumber: form.invoiceNumber,
    invoiceDate: form.invoiceDate,
    dueDate: form.dueDate,
    type: form.isRecurring ? "RECURRING" : "DEFAULT",
    recurringType: form.isRecurring
      ? (form.recurringType as InvoiceData["recurringType"])
      : undefined,
    recurringStartDate: form.isRecurring ? form.recurringStartDate : undefined,
    userCreateConsent: form.userCreateConsent,
    userLinkConsent: gid ? form.userCreateConsent : false,

    currentStep: deriveCurrentStep(form),
  };
};

// ─── Wire payload → form state ────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/**
 * Recovers which due-term chip produced a stored due date.
 *
 * The server keeps only the resolved date, never the term that generated it, so
 * this used to report "custom" for every reopened draft. That was not merely
 * cosmetic once templates existed: a template captures the *term*, so applying
 * one, letting it autosave, reopening it and saving it as a template again
 * downgraded "30 days" to "custom" — and "custom" is treated as no term at all,
 * because a date somebody picked by hand for one invoice is not reusable. The
 * reusable part of the template therefore evaporated after one round trip.
 *
 * Comparing the two dates recovers it exactly, since every preset is a whole
 * number of days from the issue date. A gap matching no preset really is custom.
 */
export const dueTermForDates = (invoiceDate: string, dueDate: string): string | null => {
  if (!dueDate) return null;
  if (!invoiceDate) return "custom";

  const from = Date.parse(`${invoiceDate}T00:00:00`);
  const to = Date.parse(`${dueDate}T00:00:00`);
  if (Number.isNaN(from) || Number.isNaN(to)) return "custom";

  const days = Math.round((to - from) / MS_PER_DAY);
  return DUE_TERM_OPTIONS.find((option) => option.days === days)?.id ?? "custom";
};

/** Rehydrates the editor from a draft the server returned. */
export const toFormState = (
  invoice: InvoiceData,
  fallback: InvoiceFormState
): InvoiceFormState => ({
  ...fallback,
  invoiceNumber: invoice.invoiceNumber || fallback.invoiceNumber,
  invoiceDate: invoice.invoiceDate || fallback.invoiceDate,
  dueDate: invoice.dueDate || "",
  dueTermId: dueTermForDates(invoice.invoiceDate || fallback.invoiceDate, invoice.dueDate || ""),

  clientId: invoice.clientId || "",
  currency: invoice.currency || fallback.currency,
  lineItems: (invoice.lineItems || []).map((item, index) => ({
    key: String(index),
    type: item.type || "",
    description: item.description || "",
    hsn: item.hsn || item.sac || "",
    gstRate: item.gstRate ? String(item.gstRate) : "",
    unitPrice: item.unitPrice ? String(item.unitPrice) : "",
    quantity: item.quantity ? String(item.quantity) : "",
    saveAsSku: false,
  })),

  discountName: invoice.discount?.discountName || "",
  discountValue: invoice.discount?.value || "",
  discountType: invoice.discount?.type === "fixed" ? "fixed" : "percentage",
  taxName: invoice.tax?.taxName || "",
  taxValue: invoice.tax?.value || "",

  accountNo: invoice.accountNo || "",

  memo: invoice.memo || "",
  notes: invoice.notes || "",
  lut: invoice.lut || "",

  logoEnabled: invoice.logoEnabled ?? false,
  signatureEnabled: invoice.signatureEnabled ?? false,

  isRecurring: invoice.type === "RECURRING",
  recurringType: invoice.recurringType || "",
  recurringStartDate: invoice.recurringStartDate || "",

  // Consent is re-collected every session: it is a per-submission attestation,
  // not a stored preference.
  userCreateConsent: false,
});

// ─── Client validation ────────────────────────────────────────────────────────

/** True when any address field an invoice needs is missing or blank. */
export const clientHasIncompleteAddress = (client: ClientData): boolean => {
  const address = client.address ?? {};
  return REQUIRED_ADDRESS_KEYS.some((key) => {
    const value = address[key];
    return value == null || value.trim() === "";
  });
};

export type ClientIssue =
  | { kind: "none" }
  | { kind: "not-selected" }
  | { kind: "incomplete-address"; clientId: string }
  | { kind: "remitter-mismatch"; clientName: string; remitterName: string };

/**
 * The two hard gates production puts on the selected client, kept together so
 * the Bill-to card and the generate action cannot drift apart:
 *
 *  1. The address must be complete, otherwise the invoice has nobody to bill.
 *  2. When linking to a transaction, the client's name must match the remitter
 *     on it — a mismatched pair would attach the wrong document to a payment.
 */
export const validateSelectedClient = (
  clientId: string,
  clients: ClientData[],
  remitterName: string | null | undefined
): ClientIssue => {
  if (!clientId) return { kind: "not-selected" };

  const selected = clients.find((client) => client.id === clientId);
  // Not in the list yet (just created, list still refetching): nothing to judge.
  if (!selected) return { kind: "none" };

  if (clientHasIncompleteAddress(selected)) {
    return { kind: "incomplete-address", clientId };
  }

  if (remitterName && selected.name?.toLowerCase() !== remitterName.toLowerCase()) {
    return {
      kind: "remitter-mismatch",
      clientName: selected.name ?? "",
      remitterName,
    };
  }

  return { kind: "none" };
};

// ─── Themes ───────────────────────────────────────────────────────────────────

/**
 * What to draw for a theme name.
 *
 * The server owns the vocabulary, so a name this build has never heard of is a
 * normal outcome rather than an error: it renders through the Classic layout
 * under a title-cased version of its own name, which is legible enough to pick
 * from a grid. That is what lets the backend ship a seventh theme ahead of the
 * frontend that describes it.
 */
export const themeFor = (name: string): InvoiceTheme =>
  INVOICE_THEMES[name] ?? {
    name,
    label: name
      .toLowerCase()
      .split("_")
      .map((word) => (word ? word[0]!.toUpperCase() + word.slice(1) : word))
      .join(" "),
    layout: "classic",
  };

/**
 * A complete theme trio out of a partial or missing one.
 *
 * Used for both sources the editor resolves branding from: the invoice's own
 * `themeMetadata`, absent on drafts that predate the feature, and a template
 * snapshot saved before it, which holds the old hex-based fields and none of
 * these three. Both cases mean "the server's default", which is what this
 * returns rather than letting `undefined` reach the wire.
 */
export const brandingFrom = (source: Partial<ThemeMetadata> | null | undefined): ThemeMetadata => ({
  theme: source?.theme || DEFAULT_THEME_METADATA.theme,
  color: source?.color || DEFAULT_THEME_METADATA.color,
  accent: source?.accent || DEFAULT_THEME_METADATA.accent,
});

// ─── Brand colours ────────────────────────────────────────────────────────────

/**
 * Normalises a hex string to `#RRGGBB`, or null when it is not a colour.
 *
 * Module-private since the colour picker stopped taking typed hex: the palette
 * is now the server's named vocabulary, so the only caller left is `withAlpha`,
 * which needs a known-shaped value before it can append an alpha byte.
 */
const normalizeHexColor = (value: string): string | null => {
  const raw = value.trim().replace(/^#/, "");

  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const [r, g, b] = raw.split("");
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }

  return /^[0-9a-fA-F]{6}$/.test(raw) ? `#${raw.toUpperCase()}` : null;
};

/**
 * `color` at `alpha` opacity, as an 8-digit hex.
 *
 * The layouts tint backgrounds and hairlines with the merchant's brand colour
 * and need it faint. Nova appends raw suffixes inline (`${accentColor}55`),
 * which silently produces garbage if the colour is ever shorthand or malformed;
 * this validates first and falls back to fully opaque.
 */
export const withAlpha = (color: string, alpha: number): string => {
  const normalized = normalizeHexColor(color);
  if (!normalized) return color;

  const clamped = Math.max(0, Math.min(1, alpha));
  const suffix = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();

  return `${normalized}${suffix}`;
};

// ─── Empty form ───────────────────────────────────────────────────────────────

/**
 * A blank invoice form.
 *
 * Lifted out of the editor because the template editor needs the same starting
 * point: a template is applied as a *patch* (`applyTemplateSnapshot` returns
 * only the fields a snapshot holds), so something has to supply the rest. Two
 * copies of this object would mean a field added to InvoiceFormState could be
 * initialised in one editor and left undefined in the other.
 */
export const emptyForm = (today: string, currency: string): InvoiceFormState => ({
  invoiceNumber: "",
  invoiceDate: today,
  dueDate: "",
  dueTermId: null,
  clientId: "",
  currency,
  lineItems: [],
  discountName: "",
  discountValue: "",
  discountType: "percentage",
  taxName: "",
  taxValue: "",
  accountNo: "",
  memo: "",
  notes: "",
  lut: "",
  logoEnabled: false,
  signatureEnabled: false,

  isRecurring: false,
  recurringType: "",
  recurringStartDate: "",
  userCreateConsent: false,
});
