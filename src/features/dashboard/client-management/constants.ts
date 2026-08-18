import type { CountryFilterOption } from "@/components/common/filters/FilterChips";
import type { Client } from "@/features/dashboard/client-management/types";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

/** Rows per page — matches TRANSACTIONS_PAGE_LIMIT so every table pages alike. */
export const CLIENT_PAGE_LIMIT = 10;

/**
 * The hints the search box cycles through, exactly as the Transactions page
 * cycles remitter/transaction ID/UTR: each names a field the query is matched
 * against, and a hit on any of them counts (see ClientTable's filter).
 * Rendered as "Search by " + hint, so these are lowercase phrases.
 */
export const CLIENT_SEARCH_HINTS = ["business name", "contact name", "email"];

/**
 * Which locale groups a client's amounts. INR is the one currency here whose
 * own convention differs from the rest — ₹12,47,500.00 in lakhs, not
 * ₹1,247,500.00 — and showing an Indian figure in thousands separators would
 * read as wrong to the merchant looking at it. Everything else takes en-US,
 * the same locale the Transactions table formats every amount in.
 */
export function clientAmountLocale(currency: string): string {
  return currency === "INR" ? "en-IN" : "en-US";
}

/**
 * The business types the Add client form offers. A flat list of display
 * strings, not coded values: nothing downstream branches on the type, it's
 * recorded and shown back, so a code would only be a second thing to keep in
 * step with its own label.
 */
export const CLIENT_BUSINESS_TYPES = [
  "Company",
  "Partnership",
  "Sole proprietorship",
  "LLP",
  "Other",
] as const;

/**
 * The currency a client's balance is denominated in, by country. Covers the
 * currencies the merchant actually holds a receiving account for; everywhere
 * else settles in USD over SWIFT, which is what the fallback says.
 *
 * Only consulted when a client is created through the form — a seeded client
 * carries its own currency — so this decides the denomination a brand-new
 * client's figures will be shown in, not the conversion of an existing one.
 */
const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD",
  GB: "GBP",
  CA: "CAD",
  AU: "AUD",
  NZ: "AUD",
  SG: "SGD",
  AE: "AED",
  // Euro area — the countries the single EUR account receives for.
  AT: "EUR", BE: "EUR", HR: "EUR", CY: "EUR", EE: "EUR", FI: "EUR", FR: "EUR",
  DE: "EUR", GR: "EUR", IE: "EUR", IT: "EUR", LV: "EUR", LT: "EUR", LU: "EUR",
  MT: "EUR", NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR",
};

export function currencyForCountry(countryIso2: string): string {
  return COUNTRY_CURRENCY[countryIso2.toUpperCase()] ?? "USD";
}

/** Cap on the contract upload, matching the invoice upload's own limit. */
export const CLIENT_CONTRACT_MAX_SIZE_BYTES = 10 * 1024 * 1024;

/** What a client contract can be filed as. */
export const CLIENT_CONTRACT_ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;


/** Rows per page in the Client Details view's transactions section. Smaller
 *  than the Transactions page's own limit: this is one client's recent
 *  activity inside a details view, not the full transaction list. */
export const CLIENT_TRANSACTIONS_PAGE_LIMIT = 5;

/**
 * The raw `externalStatus` values that mean the money actually reached the
 * merchant. "SETTLED" is the one this feature's own data produces — it is what
 * the Settlement Status column renders as "Settled", the third of the three
 * states a client transaction can be in. FIRC_SETTLED is included because the
 * real MCA feed uses it for the same thing (MCA_STATUS_META renders it "FIRC
 * Settled", a success badge): leaving it out would count a settled invoice as
 * outstanding and drop its amount from Total received once this reads live data.
 */
const SETTLED_STATUSES = new Set(["SETTLED", "FIRC_SETTLED"]);

/**
 * Whether a transaction counts as a paid invoice. Derived from the same two
 * inputs as getStatusMeta, and in the same order, so this can only ever agree
 * with the badge the Settlement Status column draws: a row whose FRM state
 * overrides its status into "Action Required" is not settled, whatever its
 * externalStatus says. Same rule, and same reason, as isWaitingForInvoice.
 */
export function isSettledInvoice(txn: McaTransaction): boolean {
  if (txn.frmStatus === "PENDING_MERCHANT_UPLOAD") return false;
  return SETTLED_STATUSES.has(txn.externalStatus);
}

export interface ClientInvoiceMetrics {
  /** Every invoice raised against the client, whatever its settlement state. */
  total: number;
  /** Those that have settled. */
  paid: number;
  /** Everything else — invoice pending and sent for review alike. */
  outstanding: number;
}

/**
 * The three figures the Client Details view's KPI row shows, counted off the
 * client's own transactions rather than read from stored fields. Paid is the
 * settled subset and outstanding is the remainder, so the two always sum to
 * the total and no figure can drift from the transactions listed below it.
 */
export function clientInvoiceMetrics(transactions: McaTransaction[]): ClientInvoiceMetrics {
  const paid = transactions.filter(isSettledInvoice).length;
  return { total: transactions.length, paid, outstanding: transactions.length - paid };
}

export interface ClientReceivedTotal {
  currency: string;
  amount: number;
}

/**
 * Sums a set of transactions by currency, largest first.
 *
 * Returned as a list rather than a single figure because amounts in different
 * currencies cannot be added: converting them would need a rate this page has
 * no business inventing, so each is carried separately and displayed on its own
 * line. A client billed in one currency — every client today — yields exactly
 * one entry, and an empty set yields none, which is what lets a caller draw an
 * em-dash instead of a formatted zero.
 *
 * Reads settlementAmount/settlementCurrency where the feed provides them (the
 * amount that actually landed, which can differ from the amount invoiced) and
 * falls back to the transaction's own amount where it doesn't.
 */
export function sumByCurrency(transactions: McaTransaction[]): ClientReceivedTotal[] {
  const byCurrency = new Map<string, number>();

  for (const txn of transactions) {
    const amount = Number(txn.settlementAmount ?? txn.amount);
    // A malformed amount is skipped rather than summed as NaN, which would
    // poison the whole total and render the cell as "NaN".
    if (!Number.isFinite(amount)) continue;
    const currency = txn.settlementCurrency ?? txn.currency;
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + amount);
  }

  return [...byCurrency.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * What the client has actually paid the merchant: the settled invoices summed
 * per currency, and nothing else — invoice-pending and sent-for-review
 * transactions are money not yet received, so they are excluded rather than
 * netted off. This is not the outstanding balance and is never derived from one.
 */
export function clientTotalReceived(transactions: McaTransaction[]): ClientReceivedTotal[] {
  return sumByCurrency(transactions.filter(isSettledInvoice));
}

export interface ClientInvoiceAmounts {
  total: ClientReceivedTotal[];
  paid: ClientReceivedTotal[];
  outstanding: ClientReceivedTotal[];
}

/**
 * The money behind clientInvoiceMetrics' three counts: what every invoice is
 * worth, what the settled ones are worth, and what the rest are. Split on the
 * same isSettledInvoice predicate as the counts, so a card's figure and its
 * amount always describe the same set of transactions — paid plus outstanding
 * is total, in every currency, by construction.
 */
export function clientInvoiceAmounts(transactions: McaTransaction[]): ClientInvoiceAmounts {
  const paid: McaTransaction[] = [];
  const outstanding: McaTransaction[] = [];
  for (const txn of transactions) {
    (isSettledInvoice(txn) ? paid : outstanding).push(txn);
  }
  return {
    total: sumByCurrency(transactions),
    paid: sumByCurrency(paid),
    outstanding: sumByCurrency(outstanding),
  };
}

/**
 * The Country chip's options, derived from the clients themselves rather than
 * a fixed country list: the filter should only ever offer countries the
 * merchant actually has clients in, so it can never narrow to an empty table.
 * Deduped by ISO2 and sorted by name, so the list's order doesn't follow
 * whatever order the rows happened to arrive in.
 */
export function clientCountryOptions(clients: Client[]): CountryFilterOption[] {
  const byIso2 = new Map<string, CountryFilterOption>();
  for (const client of clients) {
    if (!byIso2.has(client.countryIso2)) {
      byIso2.set(client.countryIso2, { value: client.countryIso2, label: client.countryName });
    }
  }
  return [...byIso2.values()].sort((a, b) => a.label.localeCompare(b.label));
}
