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
 * The business types the Add client form offers — code and label, exactly as
 * pg-dashboard's own Client Type select declares them (see its
 * ADD_CLIENT_FIELDS_FORM_CONTACT).
 *
 * The codes matter: `type` is what goes on the wire, and the API takes these four
 * enum values and nothing else. An earlier revision here offered display strings
 * of its own devising ("Partnership", "Sole proprietorship", "LLP") on the grounds
 * that nothing downstream branches on the type — but the server does, and every
 * create carrying one of those was rejected. Labels are for the screen only;
 * `value` is the contract.
 */
export const CLIENT_BUSINESS_TYPES = [
  { value: "COMPANY", label: "Company" },
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "LIMITED_LIABILITY_PARTNERSHIP", label: "Limited Liability Partnership" },
  { value: "OTHERS", label: "Others" },
] as const;

/** A stored `type` code as a reader should see it. Falls back to the code itself
 *  for a value this build does not know — a record created before an option was
 *  added should still show something rather than nothing. */
export function clientBusinessTypeLabel(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return CLIENT_BUSINESS_TYPES.find((option) => option.value === code)?.label ?? code;
}

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
 * The currency the record's money figures are denominated in.
 *
 * INR, and not the client's own currency. `totalInvoiceAmount` and
 * `outstandingAmount` arrive with no currency field beside them, and
 * pg-dashboard's Outstanding column renders both with `currency={"INR"}` — so they
 * are settled figures in the merchant's own reporting currency, not amounts in
 * whatever the client is billed in.
 *
 * An earlier revision here used `client.currency` for them on the grounds that a
 * hardcoded INR looked wrong for a book of cross-border clients. That was the
 * wrong call: it did not convert anything, it just relabelled an INR figure as
 * AUD or GBP, which is worse than the thing it was trying to fix.
 */
export const CLIENT_AMOUNT_CURRENCY = "INR";

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
  const currency = CLIENT_AMOUNT_CURRENCY;
  const total = client.totalInvoiceAmount;
  const outstanding = client.outstandingAmount;

  if (total === undefined) {
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
export function countryOptionsFromMap(
  /** The fetched country map, as useClientCountryMap normalises it. Typed
   *  structurally rather than as ClientCountryMap so this module keeps no
   *  dependency on hooks.ts, which already depends on this one. */
  countryMap: {
    filterKeys: string[];
    iso2ToName: Record<string, string>;
    nameToIso2: Record<string, string>;
  },
  /**
   * Countries actually present on the loaded clients, as `{ iso2, name }`. Used
   * only when the reference endpoint returned nothing — an empty dropdown reads as
   * a broken control, and the rows on screen are a guaranteed-present source whose
   * values are, by construction, exactly what the records hold and therefore
   * exactly what the filter can match on.
   */
  fallback: { iso2: string; name: string }[] = []
): CountryFilterOption[] {
  const { filterKeys, iso2ToName, nameToIso2 } = countryMap;

  if (filterKeys.length > 0) {
    return filterKeys
      .map((key) => ({
        // The key verbatim, because that is exactly what the request sends.
        value: key,
        // A readable label for it. Where the endpoint keys by ISO2 the key alone
        // would render as "NZ" in the chip, so the resolved name is preferred and
        // the key is only the fallback — a chip listing bare codes is unreadable.
        label: iso2ToName[key.toUpperCase()] ?? key,
        // The code for the flag beside that label, resolved separately because the
        // endpoint keys by country *name* (see clientCountryCodesApi) — so `value`
        // is "New Zealand", not "NZ", and the chip's default of flagging by
        // `value` would build a flag URL out of a name and render broken.
        iso2: nameToIso2[key] ?? (isIso2Code(key) ? key.toUpperCase() : undefined),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  const byIso2 = new Map<string, CountryFilterOption>();
  for (const country of fallback) {
    if (country.iso2 && !byIso2.has(country.iso2)) {
      byIso2.set(country.iso2, { value: country.iso2, label: country.name || country.iso2 });
    }
  }
  return [...byIso2.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** Whether a country map key is already an ISO2 code rather than a display name.
 *  Same test useClientCountryMap normalises with. */
function isIso2Code(value: string): boolean {
  return /^[A-Za-z]{2}$/.test(value.trim());
}
