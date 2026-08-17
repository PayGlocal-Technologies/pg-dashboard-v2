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
