import type { CountryFilterOption } from "@/components/common/filters/FilterChips";
import type { Client } from "@/features/dashboard/client-management/types";

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
  AT: "EUR",
  BE: "EUR",
  HR: "EUR",
  CY: "EUR",
  EE: "EUR",
  FI: "EUR",
  FR: "EUR",
  DE: "EUR",
  GR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LV: "EUR",
  LT: "EUR",
  LU: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SK: "EUR",
  SI: "EUR",
  ES: "EUR",
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

export interface ClientInvoiceMetrics {
  /** Every invoice raised against the client, whatever its settlement state. */
  total: number;
  /** Those that have settled. */
  paid: number;
  /** Everything else — invoice pending and sent for review alike. */
  outstanding: number;
}

export interface ClientReceivedTotal {
  currency: string;
  amount: number;
}

export interface ClientInvoiceAmounts {
  total: ClientReceivedTotal[];
  paid: ClientReceivedTotal[];
  outstanding: ClientReceivedTotal[];
}

/**
 * The money behind the KPI row's three counts, read off the client record's own
 * server-side figures.
 *
 * An earlier revision summed the client's transactions for these instead. That
 * was replaced because the two disagreed: the record's `totalInvoiceAmount` and
 * `outstandingAmount` are what production reports for the same client, and a
 * transaction-derived figure could only ever approximate them.
 *
 * Paid is arithmetic — total minus outstanding — because the API returns no paid
 * amount of its own. That identity is the same one the counts obey, so a card's
 * figure and its amount still describe the same thing.
 *
 * Each is a single-entry list because a client is billed in one currency (the
 * record carries exactly one). The list shape is kept so the cells that render
 * these are unchanged, and so a future multi-currency client needs no new type.
 * A record with no totals at all yields empty lists, which is what lets a caller
 * draw an em-dash rather than a formatted zero.
 */
export function clientInvoiceAmounts(client: Client): ClientInvoiceAmounts {
  const currency = client.currency;
  const total = client.totalInvoiceAmount;
  const outstanding = client.outstandingAmount;

  if (total === undefined || !currency) {
    return { total: [], paid: [], outstanding: [] };
  }

  const owed = outstanding ?? 0;

  return {
    total: [{ currency, amount: total }],
    // Clamped at zero: an outstanding figure larger than the invoiced total
    // would otherwise render a negative amount received, which is not a fact
    // about anything.
    paid: [{ currency, amount: Math.max(0, total - owed) }],
    outstanding: [{ currency, amount: owed }],
  };
}

/**
 * What the client has actually paid the merchant, for the table's Total received
 * column: the paid half of clientInvoiceAmounts, so the column and the details
 * view's Paid invoices card can never quote different figures.
 *
 * Empty when the record carries no totals, which the cell draws as an em-dash —
 * "nothing has settled" and "we don't know" both being different from a zero.
 */
export function clientTotalReceived(client: Client): ClientReceivedTotal[] {
  const { paid } = clientInvoiceAmounts(client);
  // A zero paid amount is dropped rather than shown as a formatted 0.00: with
  // nothing settled the column reads as an em-dash, exactly as it did when this
  // was summed from an empty set of settled transactions.
  return paid.filter((entry) => entry.amount > 0);
}

/**
 * The Country chip's options, from the fetched name→ISO2 map.
 *
 * This replaced deriving them from the loaded clients, which stopped being
 * correct once the list became server-paged: options built from the rows on
 * screen would offer only the current page's countries and change as the merchant
 * paged. pg-dashboard feeds its own country dropdown from this same map.
 */
export function countryOptionsFromMap(countryCodes: Record<string, string>): CountryFilterOption[] {
  return Object.entries(countryCodes)
    .map(([label, value]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
