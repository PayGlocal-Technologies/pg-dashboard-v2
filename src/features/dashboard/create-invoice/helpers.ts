import { formatDate } from "@/lib/utils/format";
import {
  DEFAULT_THEME_METADATA,
  DUE_TERM_OPTIONS,
  INVOICE_STEPS,
  INVOICE_THEMES,
  REQUIRED_ADDRESS_KEYS,
} from "@/features/dashboard/create-invoice/constants";
import type {
  ApiInvoiceTemplate,
  ClientData,
  InvoiceCreatePayload,
  InvoiceData,
  InvoiceFormState,
  InvoiceTemplate,
  InvoiceTemplateSnapshot,
  InvoiceTheme,
  LineItemDraft,
  TemplateWriteBody,
  ThemeMetadata,
} from "@/features/dashboard/create-invoice/types";

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

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * Captures the reusable shape of the invoice on screen.
 *
 * What is *not* captured is the point of this function: no client, no invoice
 * number, no issue or due date, no consent, no linked transaction. Those either
 * identify one specific invoice or are attestations that must be made fresh, and
 * a template that carried them would let a merchant bill last month's customer
 * by accident. See InvoiceTemplateSnapshot for the field-by-field reasoning.
 *
 * The receiving account is not captured either, and that one is the API's call
 * rather than this editor's: `/templates` has no field for it yet. It used to be
 * stored locally, so a template saved before this switch quietly stops carrying
 * an account — the payment card reads as unselected and Generate blocks on it,
 * which is the right way round for a field the server cannot remember.
 *
 * Line-item keys are dropped here and reassigned on apply, so two invoices built
 * from the same template never share a key.
 */
export const toTemplateSnapshot = (
  form: InvoiceFormState,
  branding: ThemeMetadata,
  /** The template being overwritten, when there is one, for fields it owns. */
  previous?: InvoiceTemplateSnapshot
): InvoiceTemplateSnapshot => ({
  currency: form.currency,
  lineItems: form.lineItems.map((item) => ({ ...item })),
  discountName: form.discountName,
  discountValue: form.discountValue,
  discountType: form.discountType,
  taxName: form.taxName,
  taxValue: form.taxValue,
  memo: form.memo,
  notes: form.notes,
  lut: form.lut,
  // The offset, never the resolved date: "30 days" is reusable, "12 Sep" is not.
  dueTermId: form.dueTermId,
  logoEnabled: form.logoEnabled,
  signatureEnabled: form.signatureEnabled,
  theme: branding.theme,
  color: branding.color,
  accent: branding.accent,
  isRecurring: form.isRecurring,
  recurringType: form.recurringType,
  // Nothing in this editor can change it; a template that has it keeps it.
  isGstInvoice: previous?.isGstInvoice ?? false,
});

/**
 * Turns a template back into a patch for the live form.
 *
 * Returns everything the snapshot holds and nothing it does not, so spreading it
 * over the current form leaves the client, the invoice number, the dates and the
 * consent tick exactly as they were.
 *
 * `dueDate` is deliberately absent from the result. The snapshot stores a term,
 * and resolving a term against an issue date is the date-chip's job — the caller
 * spreads this patch and then sets `dueDate` from `dueDateForTerm`, which is the
 * same function the chip itself uses. Recomputing it here would duplicate that
 * arithmetic in a second place.
 *
 * `recurringStartDate` is likewise left alone: a schedule that started in the
 * past cannot be reused, so the merchant re-picks it.
 */
export const applyTemplateSnapshot = (
  template: InvoiceTemplate
): Partial<InvoiceFormState> & { dueTermId: string | null } => {
  const { snapshot } = template;

  return {
    currency: snapshot.currency,
    // Fresh keys, derived from the template id and the row's position, so they
    // are unique and stable without reaching for Date.now() during a render.
    lineItems: snapshot.lineItems.map((item, index) => ({
      ...item,
      key: `tpl_${template.id}_${index}`,
    })),
    discountName: snapshot.discountName,
    discountValue: snapshot.discountValue,
    discountType: snapshot.discountType,
    taxName: snapshot.taxName,
    taxValue: snapshot.taxValue,
    memo: snapshot.memo,
    notes: snapshot.notes,
    lut: snapshot.lut,
    dueTermId: snapshot.dueTermId,
    logoEnabled: snapshot.logoEnabled,
    signatureEnabled: snapshot.signatureEnabled,
    isRecurring: snapshot.isRecurring,
    recurringType: snapshot.recurringType,
  };
};

// ─── Templates: snapshot ⇄ wire ───────────────────────────────────────────────
//
// FIVE MAPPING DECISIONS LIVE IN THIS BLOCK, all of them open questions on the
// API contract that were answered with a documented default rather than a guess
// buried in the code. Each is one line to change if the answer differs:
//
//  1. `name` vs `description` on a line item. The editor has ONE label per item
//     (`LineItemDraft.description`, which the preview prints as the headline and
//     production posts as `description`). The template body wants both, so both
//     receive that label, and a read prefers `name` and falls back.
//  2. Numbers vs strings. The template body shows numbers; the editor holds
//     strings so a half-typed "12." survives, and the invoice endpoint takes
//     strings. Coerced on the way out, stringified on the way back.
//  3. `discount.type`. Sent as the editor's own "percentage" / "fixed", the
//     values the invoice endpoint round-trips today. The spec's examples show
//     "PERCENT"; if `/templates` validates a different enum, map it here.
//  4. `discountAmount` / `taxAmount`. Derived, not authoritative: computed from
//     the template's own line items on write and recomputed from the invoice's on
//     apply, because a template's amounts change the moment a quantity does.
//  5. Two kinds of "none". `dueTermDays` and `recurring` are OMITTED when absent
//     rather than sent as null, and `0` is never used to mean "no term" because
//     it is a real term (the "Today" chip).

/** Whole days for a due-term chip, or undefined when the term is not reusable. */
const dueTermDaysFor = (dueTermId: string | null): number | undefined =>
  DUE_TERM_OPTIONS.find((option) => option.id === dueTermId)?.days;

/** The chip a stored day count came from, or null when no chip matches it. */
const dueTermIdForDays = (days: number | undefined): string | null =>
  days == null ? null : (DUE_TERM_OPTIONS.find((option) => option.days === days)?.id ?? null);

/** The editor's shape → the body POSTed to /templates and PUT to /templates/{id}. */
export const toTemplateWriteBody = (
  name: string,
  snapshot: InvoiceTemplateSnapshot
): TemplateWriteBody => {
  const dueTermDays = dueTermDaysFor(snapshot.dueTermId);
  const recurring = snapshot.isRecurring ? snapshot.recurringType || undefined : undefined;

  return {
    name,
    currency: snapshot.currency,
    lineItems: snapshot.lineItems.map((item) => ({
      name: item.description,
      description: item.description,
      type: item.type,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      gstRate: Number(item.gstRate) || 0,
      hsn: item.hsn,
    })),
    isGstInvoice: snapshot.isGstInvoice,
    themeMetadata: { theme: snapshot.theme, color: snapshot.color, accent: snapshot.accent },
    discount: {
      discountName: snapshot.discountName || undefined,
      value: snapshot.discountValue || undefined,
      type: snapshot.discountType,
      discountAmount: getDiscountAmount(
        snapshot.discountValue,
        snapshot.discountType,
        snapshot.lineItems
      ),
    },
    tax: {
      taxName: snapshot.taxName || undefined,
      value: snapshot.taxValue || undefined,
      taxAmount: getTaxAmount(
        snapshot.taxValue,
        snapshot.discountValue,
        snapshot.discountType,
        snapshot.lineItems
      ),
    },
    memo: snapshot.memo,
    notes: snapshot.notes,
    lut: snapshot.lut,
    ...(dueTermDays != null && { dueTermDays }),
    ...(recurring && { recurring }),
    logoEnabled: snapshot.logoEnabled,
    signatureEnabled: snapshot.signatureEnabled,
  };
};

/** A template as the API returns it → the shape this feature consumes. */
export const fromApiTemplate = (template: ApiInvoiceTemplate): InvoiceTemplate => {
  const branding = brandingFrom(template.themeMetadata);

  const snapshot: InvoiceTemplateSnapshot = {
    currency: template.currency ?? "",
    lineItems: (template.lineItems ?? []).map((item, index) => ({
      // Keyed by the template so two invoices from one template never collide.
      key: `tpl_${template.templateId}_${index}`,
      description: item.name || item.description || "",
      type: item.type ?? "",
      hsn: item.hsn ?? "",
      // Back to strings, and an absent or zero rate reads as "no GST" rather
      // than as an explicit 0, matching GST_RATE_OPTIONS' empty value.
      gstRate: item.gstRate ? String(item.gstRate) : "",
      unitPrice: item.unitPrice != null ? String(item.unitPrice) : "",
      quantity: item.quantity != null ? String(item.quantity) : "",
      saveAsSku: false,
    })),
    discountName: template.discount?.discountName ?? "",
    discountValue: template.discount?.value ?? "",
    discountType: template.discount?.type === "fixed" ? "fixed" : "percentage",
    taxName: template.tax?.taxName ?? "",
    taxValue: template.tax?.value ?? "",
    memo: template.memo ?? "",
    notes: template.notes ?? "",
    lut: template.lut ?? "",
    dueTermId: dueTermIdForDays(template.dueTermDays),
    logoEnabled: !!template.logoEnabled,
    signatureEnabled: !!template.signatureEnabled,
    theme: branding.theme,
    color: branding.color,
    accent: branding.accent,
    isRecurring: !!template.recurring,
    recurringType: template.recurring ?? "",
    isGstInvoice: !!template.isGstInvoice,
  };

  return {
    id: template.templateId,
    name: template.name ?? "",
    description: describeSnapshot(snapshot),
    savedAt: template.savedAt ?? "",
    lastUsedAt: template.lastUsedAt ?? null,
    snapshot,
  };
};

/**
 * A one-line summary of what a template holds, shown under its name.
 *
 * Generated rather than typed by the merchant: a description they have to invent
 * is a description they leave empty, and "3 items · INR · 30 days" is what
 * actually helps them tell two templates apart.
 */
export const describeSnapshot = (snapshot: InvoiceTemplateSnapshot): string => {
  const itemCount = snapshot.lineItems.length;
  const parts = [`${itemCount} item${itemCount === 1 ? "" : "s"}`];

  if (snapshot.currency) parts.push(snapshot.currency);

  const term = DUE_TERM_OPTIONS.find((option) => option.id === snapshot.dueTermId);
  if (term) parts.push(`due ${term.label.toLowerCase()}`);

  if (snapshot.isRecurring) parts.push("recurring");

  return parts.join(" · ");
};

/**
 * An epoch-millis string as a short date, or "" when there is none.
 *
 * The templates API sends its timestamps this way (`savedAt`, `lastUsedAt`), and
 * `formatDate` takes a Date or a parseable date string: `new Date("175500…")` is
 * an Invalid Date, so the number has to be converted rather than passed
 * through. Kept here so every caller formats them identically.
 */
export const formatEpochDay = (millis: string | null | undefined): string => {
  if (!millis) return "";
  const value = Number(millis);
  if (!Number.isFinite(value)) return "";
  return formatDate(new Date(value), { day: "2-digit", month: "short", year: "numeric" });
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
