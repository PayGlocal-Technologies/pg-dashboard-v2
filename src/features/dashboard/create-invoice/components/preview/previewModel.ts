import { formatDate } from "@/lib/utils/format";
import {
  DEFAULT_BRANDING_STYLE,
  INVOICE_BRANDING_STYLES,
} from "@/features/dashboard/create-invoice/constants";
import { getAmount, getInvoiceTotals } from "@/features/dashboard/create-invoice/helpers";
import { invoiceLabelsFor, type InvoiceLabels } from "@/features/dashboard/create-invoice/i18n";
import type { BankAccountRow } from "@/features/dashboard/create-invoice/hooks";
import type {
  Address,
  BillerDetails,
  ClientData,
  InvoiceBrandingStyle,
  InvoiceFormState,
} from "@/features/dashboard/create-invoice/types";
import type { InvoiceTotals } from "@/features/dashboard/create-invoice/helpers";

/**
 * Everything the six document layouts render, derived once.
 *
 * The layouts are presentational and nothing else: they receive this and lay it
 * out. That is what keeps six of them maintainable — money formatting, label
 * translation, address flattening and the totals arithmetic each exist in one
 * place, so a fix to any of them lands in all six at once. Nova instead calls a
 * data helper inside every layout and formats money in three different files.
 */
export interface PreviewSource {
  form: InvoiceFormState;
  biller: BillerDetails | undefined;
  client: ClientData | undefined;
  account: BankAccountRow | undefined;
  logoUrl: string | undefined;
  signatureUrl: string | undefined;
  symbol: string;
}

export interface PreviewItem {
  key: string;
  /** The line's headline. The API has one string per item; this is it. */
  name: string;
  /** "HSN 998314" / "SAC 998314", or "" when no code was entered. */
  codeLabel: string;
  quantity: string;
  unitPrice: string;
  /** "18%", or "" for an untaxed line. */
  gstLabel: string;
  /** Formatted, GST-inclusive line total. */
  amount: string;
}

export interface PreviewModel {
  labels: InvoiceLabels;
  style: InvoiceBrandingStyle;
  primary: string;
  accent: string;

  currency: string;
  money: (amount: string | number) => string;
  totals: InvoiceTotals;
  /** The merchant's own name for the discount row, or a translated default. */
  discountLabel: string;
  /** Likewise for the invoice-level tax row. */
  taxLabel: string;

  invoiceNumber: string;
  /** Long form, or "-" when unset. */
  issueDate: string;
  /** Long form, or "" when unset — layouts branch on the empty string. */
  dueDate: string;

  billerName: string;
  billerLines: string[];
  billerGstIn: string;

  clientName: string;
  /** The contact under the business name, when both exist. */
  clientSecondary: string;
  clientLines: string[];
  hasClient: boolean;

  account: BankAccountRow | undefined;
  items: PreviewItem[];

  memo: string;
  notes: string;
  lut: string;

  logoUrl: string;
  signatureUrl: string;
}

const longDate = (value: string): string =>
  value ? formatDate(value, { day: "2-digit", month: "long", year: "numeric" }) : "";

/** Flattens an address into the lines an invoice prints, skipping blanks. */
const addressLines = (address: Address | BillerDetails | undefined): string[] => {
  if (!address) return [];
  const cityLine = [address.city, address.state, address.zipcode].filter(Boolean).join(", ");
  return [address.streetAddress1, address.streetAddress2, cityLine, address.country].filter(
    (line): line is string => !!line && line.trim() !== ""
  );
};

export function buildPreviewModel(source: PreviewSource): PreviewModel {
  const { form, biller, client, account, logoUrl, signatureUrl, symbol } = source;

  const style =
    INVOICE_BRANDING_STYLES.find((candidate) => candidate.id === form.brandingStyleId) ??
    DEFAULT_BRANDING_STYLE;

  const money = (amount: string | number): string => {
    const value = typeof amount === "string" ? Number(amount) : amount;
    return `${symbol}${(Number.isFinite(value) ? value : 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const labels = invoiceLabelsFor(form.language);

  return {
    labels,
    style,
    primary: form.primaryColor,
    accent: form.accentColor,

    currency: form.currency,
    money,
    totals: getInvoiceTotals(form),
    // A merchant-typed name wins; otherwise the translated generic, so a
    // Japanese invoice does not print an English "Discount" beside 税.
    discountLabel: form.discountName || labels.discount,
    taxLabel: form.taxName || labels.tax,

    invoiceNumber: form.invoiceNumber || "-",
    issueDate: longDate(form.invoiceDate) || "-",
    dueDate: longDate(form.dueDate),

    billerName: biller?.legalName || "-",
    billerLines: addressLines(biller),
    billerGstIn: biller?.gstIn ?? "",

    clientName: client?.businessName || client?.name || "-",
    clientSecondary: client?.businessName && client?.name ? client.name : "",
    clientLines: addressLines(client?.address),
    hasClient: !!client,

    account,

    items: form.lineItems.map((item) => ({
      key: item.key,
      name: item.description || "Untitled item",
      codeLabel: item.hsn ? `${item.type === "SERVICE" ? "SAC" : "HSN"} ${item.hsn}` : "",
      quantity: item.quantity || "-",
      unitPrice: item.unitPrice || "-",
      gstLabel: item.gstRate ? `${item.gstRate}%` : "",
      amount: money(getAmount(item.unitPrice || "0", item.quantity || "0", item.gstRate || "0")),
    })),

    memo: form.memo,
    notes: form.notes,
    lut: form.lut,

    // The toggles are per invoice, the assets are per merchant, so both have to
    // agree before anything is drawn.
    logoUrl: form.logoEnabled && logoUrl ? logoUrl : "",
    signatureUrl: form.signatureEnabled && signatureUrl ? signatureUrl : "",
  };
}
