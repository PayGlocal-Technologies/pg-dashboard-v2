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
 * Which locale groups a client's outstanding figure. INR is the one currency
 * here whose own convention differs from the rest — ₹12,47,500.00 in lakhs,
 * not ₹1,247,500.00 — and showing an Indian client's balance in thousands
 * separators would read as wrong to the merchant chasing it. Everything else
 * takes en-US, the same locale the Transactions table formats every amount in.
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
 * carries its own currency — so this decides the denomination of a zero
 * balance, not the conversion of a real one.
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

/**
 * Initials for a business's avatar: the first letter of each of the first two
 * words ("Acme Exports Pvt Ltd" → "AE", "Northwind Trading Co." → "NT"), or a
 * single letter when the name is one word. Deliberately the first two *words*
 * rather than first and last, which is right for people (see the sidebar's own
 * profileInitials) but would turn "Acme Exports Pvt Ltd" into "AL" — the
 * suffix, not the business.
 *
 * Punctuation-only tokens are skipped so a name like "Maple & Birch Studio"
 * reads "MB" instead of "M&".
 */
export function businessInitials(businessName: string): string {
  const words = businessName
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  if (words.length === 0) return "";
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/** Rows per page in the Client Details view's transactions section. Smaller
 *  than the Transactions page's own limit: this is one client's recent
 *  activity inside a details view, not the full transaction list. */
export const CLIENT_TRANSACTIONS_PAGE_LIMIT = 5;

export interface ClientInvoiceMetrics {
  total: number;
  paid: number;
  outstanding: number;
}

/**
 * The three figures the Client Details view's KPI row shows. Outstanding is
 * derived here rather than stored on the client (see Client.paidInvoices), so
 * the three can never contradict each other, and clamped at zero so a bad
 * record can't render a negative count.
 */
export function clientInvoiceMetrics(client: Client): ClientInvoiceMetrics {
  return {
    total: client.totalInvoices,
    paid: client.paidInvoices,
    outstanding: Math.max(0, client.totalInvoices - client.paidInvoices),
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
