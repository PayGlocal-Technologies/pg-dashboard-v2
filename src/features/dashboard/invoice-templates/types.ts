/**
 * Invoice template shapes: the snapshot the editor applies, and the wire
 * bodies the /templates endpoints exchange.
 *
 * Extracted from create-invoice. Templates are consumed BY the invoice editor,
 * so the dependency runs this way round: this feature knows about the invoice
 * form's own shapes, and the invoice editor imports templates from here.
 */

import type { BaseResponse } from "@/types/common";
import type {
  LineItemDraft,
  RecurringType,
  ThemeMetadata,
} from "@/features/dashboard/create-invoice/types";

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * What a template actually remembers.
 *
 * Deliberately the *reusable shape* of an invoice and nothing that identifies
 * one: no client, no invoice number, no issue or due date, no consent, no linked
 * transaction, no receiving account. Applying a template must never quietly
 * re-point an invoice at last month's customer, and every excluded field is one
 * a merchant has to decide per invoice anyway.
 *
 * `dueTermId` is the exception that proves the rule: the *offset* ("30 days") is
 * reusable, the resolved date is not, so the term is stored and the date is
 * recomputed from today when the template is applied.
 */
export interface InvoiceTemplateSnapshot {
  currency: string;
  lineItems: LineItemDraft[];
  discountName: string;
  discountValue: string;
  discountType: "percentage" | "fixed";
  taxName: string;
  taxValue: string;
  memo: string;
  notes: string;
  lut: string;
  dueTermId: string | null;
  logoEnabled: boolean;
  signatureEnabled: boolean;
  theme: string;
  color: string;
  accent: string;
  isRecurring: boolean;
  recurringType: RecurringType | "";
  /**
   * Carried, never edited here.
   *
   * The API stores it on a template and the editor has no GST control at all —
   * `generate-invoice` is hard-coded to false, exactly as pg-dashboard's create
   * flow is. Holding it means an update round-trips whatever the template
   * already had instead of overwriting it with a guess.
   */
  isGstInvoice: boolean;
}

/**
 * A line item as the templates API carries it.
 *
 * Two departures from the invoice's own line items, both mandated by the
 * endpoint: amounts are numbers rather than the strings production posts, and
 * there is a `name` alongside `description`. The editor has one label per item,
 * so both fields receive it — see `toTemplateWriteBody`.
 */
export interface TemplateLineItem {
  name: string;
  description: string;
  type: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  hsn: string;
}

/** The body POSTed to /templates, and PUT to /templates/{id} unchanged. */
export interface TemplateWriteBody {
  name: string;
  currency: string;
  /**
   * Always null. The API has the field; templates deliberately never fill it.
   *
   * The receiving account is decided per invoice, like the client and the
   * dates. Only accounts a merchant added by hand are enumerable without an
   * invoice (`get-suggested-account` is invoice-scoped), so a template could
   * carry some receiving accounts and not others — which is a worse rule than
   * "templates do not carry one at all".
   */
  bankAccountReference: null;
  lineItems: TemplateLineItem[];
  isGstInvoice: boolean;
  themeMetadata: ThemeMetadata;
  discount: {
    discountName?: string;
    value?: string;
    type?: string;
    discountAmount?: string;
  };
  tax: {
    taxName?: string;
    value?: string;
    taxAmount?: string;
  };
  memo: string;
  notes: string;
  lut: string;
  /** Whole days from the issue date. Omitted when the template carries no term. */
  dueTermDays?: number;
  /** The invoice's own recurringType vocabulary. Omitted when not recurring. */
  recurring?: RecurringType;
  logoEnabled: boolean;
  signatureEnabled: boolean;
}

/** A template as the API returns it: the body above plus server-managed fields. */
export type ApiInvoiceTemplate = TemplateWriteBody & {
  templateId: string;
  /** Epoch millis as a string. */
  savedAt: string;
  /** Epoch millis as a string; null until the template has been read once. */
  lastUsedAt: string | null;
};

export type TemplateListResponse = BaseResponse<{ templates: ApiInvoiceTemplate[] }>;

export type TemplateResponse = BaseResponse<{ template: ApiInvoiceTemplate }>;

export type TemplateWriteResponse = BaseResponse<{ templateId: string }>;

/**
 * A template as this feature consumes it: identity, plus the snapshot the editor
 * applies. Mapped from ApiInvoiceTemplate by `fromApiTemplate`.
 */
export interface InvoiceTemplate {
  /** The server's `templateId`. */
  id: string;
  name: string;
  /**
   * The one-liner under the name in the picker, e.g. "3 items · USD · due 30
   * days". Derived by `describeSnapshot`, not stored: the API has no such field,
   * and a description a merchant has to invent is one they leave empty.
   */
  description: string;
  /** Epoch millis as a string, which is how the API sends it. */
  savedAt: string;
  /**
   * Epoch millis as a string; null until the template has been read once.
   *
   * Recency, not frequency: the API records this and bumps it itself when a
   * template is read by id, which is the only reason `markUsed` issues a read.
   * It is also the better signal for a picker — what you used last week is a
   * better guess than what you used most in March.
   */
  lastUsedAt: string | null;
  snapshot: InvoiceTemplateSnapshot;
}
