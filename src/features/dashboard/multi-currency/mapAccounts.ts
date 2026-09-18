import type {
  AccountDetail,
  ApiCurrency,
  ApiVirtualAccount,
  VirtualAccount,
} from "@/features/dashboard/multi-currency/types";

/**
 * Turns the accounts endpoint's currency-keyed bucket into the flat list the
 * cards and details section render.
 *
 * ── API GAPS — read before changing this file ──────────────────────────────
 * Four fields the UI displays have no counterpart anywhere in the
 * /ffms/virtualAccounts response:
 *
 *   iso2          — the flag asset's country code
 *   countryName   — "United States", used in card copy and "{country} Account"
 *   paymentMethod — the rail's display name, e.g. "ACH/Fedwire"
 *   accountType   — e.g. "Business checking account"
 *
 * pg-dashboard does not receive them either, and solves it the same way: a
 * static per-currency map (CURRENCY_PAYMENT_METHOD_MAP) plus a hardcoded
 * account type, in its own transformAccountData. They are presentation
 * constants rather than data — which country issues a GBP receiving account,
 * and what its rail is called, does not vary per merchant or per response.
 *
 * `paymentMethod` values are production's, verbatim. Where production names no
 * rail (AED, SGD, and the Rest of the World catch-all) the value is empty and
 * the row is omitted rather than shown blank, which is also what production
 * does — see buildFullAccountDetails.
 *
 * `iso2` and `countryName` have no production counterpart: pg-dashboard shows
 * currency flags rather than country flags and never names the country. They
 * exist here because v2's design does both. Flags are fetched by ISO2 from
 * static.payglocal.in (see flagSrc), so an empty iso2 renders no flag at all.
 *
 * Everything else on the card comes straight from the API. If the backend
 * starts returning any of these four, delete its column here and read the
 * response field instead.
 */
const PRESENTATION_BY_CURRENCY: Record<string, Partial<VirtualAccount>> = {
  USD: {
    iso2: "US",
    countryName: "United States",
    paymentMethod: "ACH/Fedwire",
    accountType: "Business checking account",
  },
  GBP: {
    iso2: "GB",
    countryName: "United Kingdom",
    paymentMethod: "FPS/CHAPS/BECS",
    accountType: "Business current account",
  },
  EUR: {
    iso2: "EU",
    countryName: "Europe",
    paymentMethod: "SEPA/SEPA Instant",
    accountType: "Business account",
  },
  CAD: {
    iso2: "CA",
    countryName: "Canada",
    paymentMethod: "EFT",
    accountType: "Business chequing account",
  },
  AUD: {
    iso2: "AU",
    countryName: "Australia",
    paymentMethod: "BECS/NPP/Osko",
    accountType: "Business transaction account",
  },
  AED: {
    iso2: "AE",
    countryName: "United Arab Emirates",
    // No entry in production's CURRENCY_PAYMENT_METHOD_MAP, so no rail is
    // named — see the row-omission note below.
    paymentMethod: "",
    accountType: "Business account",
  },
  SGD: {
    iso2: "SG",
    countryName: "Singapore",
    // Not in production's map either.
    paymentMethod: "",
    accountType: "Business account",
  },
  // The SWIFT catch-all. "ROW" is not a real ISO2 and resolves to no flag on
  // the CDN — deliberate, and the same placeholder the mock account used, since
  // an account that receives many currencies has no one country to show.
  OTHER: {
    iso2: "ROW",
    countryName: "Rest of the World",
    // Production names no rail for the catch-all — it receives over several,
    // so there is no single answer to show.
    paymentMethod: "",
    accountType: "Business account",
  },
};

/** The API bucket key for the SWIFT catch-all account. pg-dashboard renames it
 *  to "GLOBAL" for display; the v2 mock called the same thing "ROW". */
const GLOBAL_CURRENCY_KEY: ApiCurrency = "OTHER";

/**
 * Label for the account's secondary identifier, chosen from the API's own
 * `routingCodeType` rather than a country guess. This is UI copy — no API
 * returns display labels — so it is derived, unlike the four gap fields above.
 * Falls back to the raw type when it is one this map doesn't know, which reads
 * better than a blank label and makes the unknown value visible.
 */
const ROUTING_LABELS: Record<string, string> = {
  ach_routing_number: "ACH Routing",
  sort_code: "Sort Code",
  bsb_code: "BSB Code",
  institution_no: "Institution No.",
  transit_no: "Transit No.",
  iban: "IBAN",
  bic: "BIC",
  swift: "SWIFT / BIC",
};

function routingLabel(routingCodeType: string): string {
  if (!routingCodeType) return "Routing Code";
  return ROUTING_LABELS[routingCodeType] ?? routingCodeType;
}

function toViewAccount(currencyKey: string, account: ApiVirtualAccount): VirtualAccount {
  const isGlobal = currencyKey === GLOBAL_CURRENCY_KEY;

  // pg-dashboard's `displayCurrency`: the bucket key, with "OTHER" renamed to
  // "GLOBAL" (transformAccountData in its own hooks.ts). Two things follow from
  // matching it exactly.
  //
  // It is the account's identity as well as its label. Production keys its
  // accountsDetails map and its currency list by this value and never by
  // `accountId` — which is not unique across the response, since one underlying
  // account can back several currencies. Using accountId here made USD and CAD
  // share a React key and, because selection compares ids, selecting USD
  // visibly selected CAD too. A bucket key cannot collide: it is an object key.
  //
  // It is also what the share-link request carries, so any other value would
  // ask the backend for a link against a currency production never sends.
  //
  // Read from the bucket key rather than `account.currency` — production
  // ignores that field entirely, so trusting it could reintroduce a collision
  // if the backend ever disagreed with its own key.
  const currency = isGlobal ? "GLOBAL" : currencyKey;

  // Compact identifiers shown on the card face, in the order the card renders
  // them. Rows whose value the API left empty are dropped rather than rendered
  // as a label with nothing beside it.
  const details: AccountDetail[] = [
    { label: "Account Number", value: account.accountNumber },
    { label: routingLabel(account.routingCodeType), value: account.routingCode },
  ].filter((detail) => !!detail.value);

  return {
    // Same value as `currency` — see the note above for why identity is the
    // display currency and not `accountId`. Nothing downstream needs the
    // backend id: the document endpoints address an account by the SHA-256 of
    // its number, and share/email by currency.
    id: currency,
    currency,
    accountName: isGlobal ? "Rest of the World" : `${currency} Account`,
    details,
    accountHolderName: account.accountHolderName ?? "",
    bankName: account.bankName ?? "",
    beneficiaryAddress: account.bankAddress ?? "",
    routingCodeType: account.routingCodeType || undefined,
    fedwireRoutingCode: account.fedwireRoutingCode || undefined,
    isGlobal,

    // ── API gaps (see the note at the top of this file) ──────────────────
    iso2: "",
    countryName: "",
    paymentMethod: "",
    accountType: "",

    ...PRESENTATION_BY_CURRENCY[currencyKey],
  };
}

/**
 * Currency display order, matching pg-dashboard's CURRENCY_ORDER
 * (src/features/multi-currency-accounts/constants.ts) so both apps list a
 * merchant's accounts the same way. Anything the backend adds that isn't in
 * this list sorts to the end, in response order, instead of disappearing.
 */
const CURRENCY_ORDER = ["USD", "AUD", "EUR", "CAD", "GBP", GLOBAL_CURRENCY_KEY];

function orderIndex(currencyKey: string): number {
  const index = CURRENCY_ORDER.indexOf(currencyKey);
  return index === -1 ? CURRENCY_ORDER.length : index;
}

/** Maps and orders one bucket. Returns [] for a merchant with no accounts of
 *  that kind, which is a normal response, not an error. */
export function toViewAccounts(
  bucket: Partial<Record<ApiCurrency, ApiVirtualAccount>> | undefined
): VirtualAccount[] {
  if (!bucket) return [];

  return Object.entries(bucket)
    .filter(([, account]) => !!account)
    .sort(([a], [b]) => orderIndex(a) - orderIndex(b))
    .map(([currencyKey, account]) => toViewAccount(currencyKey, account as ApiVirtualAccount));
}
