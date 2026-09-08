import { formatDate } from "@/lib/utils/format";
import { getAmount, getInvoiceTotals, themeFor } from "@/features/dashboard/create-invoice/helpers";
import { DUE_TERM_OPTIONS } from "@/features/dashboard/create-invoice/constants";
import { INVOICE_LABELS, type InvoiceLabels } from "@/features/dashboard/create-invoice/labels";
import type { BankAccountRow } from "@/features/dashboard/create-invoice/hooks";
import type {
  Address,
  BillerDetails,
  ClientData,
  InvoiceFormState,
  InvoiceTheme,
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
  /**
   * The effective theme name, and the hexes for its colour pair.
   *
   * Branding does not live in `form`: the invoice carries it and the editor
   * derives it, so it arrives here as its own field. The hexes are resolved by
   * the caller rather than looked up here because the mapping lives behind a
   * query (GET /themes) and this is a pure function. Names go on the wire; these
   * hexes are for drawing only.
   */
  theme: string;
  primaryHex: string;
  accentHex: string;
  /**
   * Draws the fields a template does NOT carry as greyed stand-ins.
   *
   * The template editor renders the same document as the invoice editor,
   * because choosing a theme and a colour pair against an abstract form is
   * choosing blind. But client, invoice number and issue date belong to an
   * invoice, not to a template, so showing them empty would read as fields the
   * merchant forgot rather than fields that are decided later.
   *
   * The due date is the one that matters most: the snapshot stores a *term*, so
   * this renders "30 days" where an invoice renders a date. Drawing a computed
   * date here would teach merchants that a template remembers one.
   */
  placeholders?: boolean;
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
  theme: InvoiceTheme;
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

/**
 * What the template preview draws where an invoice's own fields will go.
 *
 * Deliberately generic and obviously not real: a merchant must never mistake
 * these for data they entered. But they are the right SHAPE, because the point
 * of the template preview is to show how the finished document will sit on the
 * page, and a document full of one-word stand-ins does not.
 */
const PLACEHOLDER = {
  invoiceNumber: "INV-0000",
  issueDate: "01 Jan 2026",
  clientName: "Client name",
  clientSecondary: "Chosen on each invoice",
  clientLines: ["Street address", "City, State 000000", "Country"],
  /**
   * A stand-in receiving account.
   *
   * Templates no longer carry one at all, so without this the preview would be
   * permanently missing a panel that every real invoice has, and the page would
   * sit noticeably shorter than the document it is previewing.
   */
  account: {
    title: "Receiving account",
    accountHolderName: "Your account name",
    accountNumber: "0000 0000 0000",
    bankName: "Chosen on each invoice",
    routing: "XXXX0000000",
    isRecommended: false,
  },
};

export function buildPreviewModel(source: PreviewSource): PreviewModel {
  const { form, biller, client, account, logoUrl, signatureUrl, symbol } = source;
  const placeholders = !!source.placeholders;

  const theme = themeFor(source.theme);

  const money = (amount: string | number): string => {
    const value = typeof amount === "string" ? Number(amount) : amount;
    return `${symbol}${(Number.isFinite(value) ? value : 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return {
    labels: INVOICE_LABELS,
    theme,
    primary: source.primaryHex,
    accent: source.accentHex,

    currency: form.currency,
    money,
    totals: getInvoiceTotals(form),
    // A merchant-typed name wins; otherwise the generic one, so an invoice with
    // an unnamed discount still labels the row.
    discountLabel: form.discountName || INVOICE_LABELS.discount,
    taxLabel: form.taxName || INVOICE_LABELS.tax,

    invoiceNumber: placeholders ? PLACEHOLDER.invoiceNumber : form.invoiceNumber || "-",
    // Shaped like a date, not spelled "Issue date": a stand-in has to occupy the
    // same visual space as the real value, and a word where a date goes reads as
    // a rendering fault rather than as a blank the merchant will fill.
    issueDate: placeholders ? PLACEHOLDER.issueDate : longDate(form.invoiceDate) || "-",
    // The one placeholder that is NOT a stand-in: a template stores a term, so
    // this is the real stored value. See PreviewSource.placeholders.
    dueDate: placeholders
      ? (DUE_TERM_OPTIONS.find((option) => option.id === form.dueTermId)?.label ?? "On receipt")
      : longDate(form.dueDate),

    billerName: biller?.legalName || "-",
    billerLines: addressLines(biller),
    billerGstIn: biller?.gstIn ?? "",

    clientName: placeholders ? PLACEHOLDER.clientName : client?.businessName || client?.name || "-",
    clientSecondary: placeholders
      ? PLACEHOLDER.clientSecondary
      : client?.businessName && client?.name
        ? client.name
        : "",
    // A full address block, not a one-line note. The billed-to panel is one of
    // the largest areas on the page, and collapsing it to a single grey line is
    // what made the template preview look half-rendered.
    clientLines: placeholders ? PLACEHOLDER.clientLines : addressLines(client?.address),
    // Placeholder mode draws the block so the layout keeps its real proportions;
    // without this the paper would reflow around a gap that will not be there.
    hasClient: placeholders || !!client,

    // A template stores no receiving account, so the preview shows a stand-in
    // rather than dropping the panel. See PLACEHOLDER.account.
    account: placeholders ? PLACEHOLDER.account : account,

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
