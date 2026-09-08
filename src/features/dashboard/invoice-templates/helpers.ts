import { formatDate } from "@/lib/utils/format";
import { DUE_TERM_OPTIONS } from "@/features/dashboard/create-invoice/constants";
import {
  brandingFrom,
  getDiscountAmount,
  getTaxAmount,
} from "@/features/dashboard/create-invoice/helpers";
import type {
  InvoiceFormState,
  LineItemDraft,
  ThemeMetadata,
} from "@/features/dashboard/create-invoice/types";
import type {
  ApiInvoiceTemplate,
  InvoiceTemplate,
  InvoiceTemplateSnapshot,
  TemplateWriteBody,
} from "@/features/dashboard/invoice-templates/types";

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
 * The receiving account is not captured, and that is a deliberate rule rather
 * than a gap. PayGlocal-provisioned accounts are only enumerable per invoice
 * (`get-suggested-account` takes an invoiceId), so a template could remember an
 * account a merchant added by hand and not one PayGlocal issued them. A field
 * that works for some accounts and silently not for others is worse than no
 * field, so the account is chosen on each invoice alongside the client.
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
    // Never populated. See TemplateWriteBody.bankAccountReference.
    bankAccountReference: null,
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

// ─── Names ────────────────────────────────────────────────────────────────────
//
// Duplicate-name rejection was written three times over — in the save dialog, in
// the manage dialog's inline rename, and nowhere at all in the editor. Three
// copies of one rule is three chances for them to disagree, and two templates
// answering to one name make the picker a coin toss. One implementation here,
// exposed through the templates hook so callers never re-derive it.

/** True when another template already answers to this name, case-insensitively. */
export const isNameTakenIn = (
  name: string,
  templates: InvoiceTemplate[],
  exceptId?: string | null
): boolean => {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return false;
  return templates.some(
    (template) => template.id !== exceptId && template.name.trim().toLowerCase() === wanted
  );
};

/**
 * "Retainer" → "Retainer (2)", counting up past names already in use.
 *
 * Suggesting a free name is kinder than rejecting a taken one, and it is what
 * makes Duplicate a single click rather than a dialog. An existing "(n)" suffix
 * is stripped first, so duplicating a copy gives "Retainer (3)" rather than
 * "Retainer (2) (2)".
 */
export const suggestCopyNameFor = (name: string, templates: InvoiceTemplate[]): string => {
  const stem = name.trim().replace(/\s*\(\d+\)$/, "") || "Template";
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${stem} (${n})`;
    if (!isNameTakenIn(candidate, templates)) return candidate;
  }
  return stem;
};
