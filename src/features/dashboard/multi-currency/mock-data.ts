import type { MetricSparklinePoint } from "@/components/ui";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/** Same legal entity receives every currency, so the holder name is shared. */
const ACCOUNT_HOLDER_NAME = "Acme Exports Pvt Ltd";

/**
 * Placeholder virtual accounts for the seven supported countries, plus the
 * SWIFT-rail "Rest of the World" account.
 * Every value here is dummy data — replace this module with the real API
 * response once the virtual-accounts endpoint is available. The shape is
 * deliberately identical to what the card component consumes, so wiring the
 * backend up means swapping the source, not touching the UI.
 */
export const MOCK_VIRTUAL_ACCOUNTS: VirtualAccount[] = [
  {
    id: "us-usd",
    iso2: "US",
    countryName: "United States",
    currency: "USD",
    accountName: "USD Account",
    details: [
      { label: "Account Number", value: "0332534665" },
      { label: "ACH Routing", value: "026073150" },
    ],
    paymentMethod: "ACH / Fedwire",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    accountType: "Business checking account",
    bankName: "Community Federal Savings Bank",
    beneficiaryAddress: "5 Penn Plaza, 14th Floor, New York, NY 10001, US",
    routingCodeType: "ach_routing_number",
  },
  {
    id: "gb-gbp",
    iso2: "GB",
    countryName: "United Kingdom",
    currency: "GBP",
    accountName: "GBP Account",
    details: [
      { label: "Account Number", value: "41827396" },
      { label: "Sort Code (FPS)", value: "04-29-09" },
    ],
    paymentMethod: "Faster Payments (FPS)",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    accountType: "Business current account",
    bankName: "Clearbank Ltd",
    beneficiaryAddress: "1 King Street, London, EC2V 8AU, UK",
    routingCodeType: "sort_code",
  },
  {
    id: "eu-eur",
    iso2: "EU",
    countryName: "Europe",
    currency: "EUR",
    accountName: "EUR Account",
    details: [
      { label: "IBAN", value: "DE89 3704 0044 0532 0130 00" },
      { label: "SEPA BIC", value: "PGBLDEFFXXX" },
    ],
    paymentMethod: "SEPA Credit Transfer",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    accountType: "Business account",
    bankName: "PayGlocal Europe SA",
    beneficiaryAddress: "Rue de la Loi 200, 1040 Brussels, Belgium",
    routingCodeType: "iban",
  },
  {
    id: "ae-aed",
    iso2: "AE",
    countryName: "United Arab Emirates",
    currency: "AED",
    accountName: "AED Account",
    details: [
      { label: "Local Account Number", value: "019100078234" },
      { label: "IBAN", value: "AE07 0331 2345 6789 0123 456" },
    ],
    paymentMethod: "Local Transfer",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    accountType: "Business account",
    bankName: "Emirates NBD",
    beneficiaryAddress: "Sheikh Zayed Road, Dubai, UAE",
    routingCodeType: "iban",
  },
  {
    id: "ca-cad",
    iso2: "CA",
    countryName: "Canada",
    currency: "CAD",
    accountName: "CAD Account",
    details: [
      { label: "Account Number", value: "7284591036" },
      { label: "Transit Number", value: "00281" },
    ],
    paymentMethod: "EFT",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    accountType: "Business chequing account",
    bankName: "RBC Royal Bank",
    beneficiaryAddress: "100 King Street West, Toronto, ON M5X 1A9, Canada",
    routingCodeType: "transit_number",
  },
  {
    id: "au-aud",
    iso2: "AU",
    countryName: "Australia",
    currency: "AUD",
    accountName: "AUD Account",
    details: [
      { label: "Account Number", value: "428193756" },
      { label: "BSB", value: "062-000" },
    ],
    paymentMethod: "Direct Entry",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    accountType: "Business transaction account",
    bankName: "Commonwealth Bank of Australia",
    beneficiaryAddress: "1 Martin Place, Sydney NSW 2000, Australia",
    routingCodeType: "bsb",
  },
  {
    id: "sg-sgd",
    iso2: "SG",
    countryName: "Singapore",
    currency: "SGD",
    accountName: "SGD Account",
    details: [
      { label: "Account Number", value: "0728451930" },
      { label: "FAST Bank Code", value: "7171" },
    ],
    paymentMethod: "FAST",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    accountType: "Business account",
    bankName: "DBS Bank Ltd",
    beneficiaryAddress: "12 Marina View, Singapore 018961",
    routingCodeType: "fast_bank_code",
  },
  {
    // Catch-all for senders outside the seven local-rail countries, received
    // over SWIFT. `iso2` has no flag on the CDN by design — CountryFlagAvatar
    // falls back to its globe glyph, which is the right mark for a region
    // rather than a country. `accountName` doubles as the region name, so the
    // card omits the country subtitle (see VirtualAccountCard).
    id: "row-swift",
    iso2: "ROW",
    countryName: "Rest of the World",
    // Transactions are filtered server-side by a single currency today (see
    // VirtualAccountActionRequired). A real SWIFT account receives many, so
    // this will need a multi-currency / "everything else" filter once the API
    // supports it.
    //
    // "Dollar" rather than an ISO code: the account receives dollars over
    // SWIFT, and this value is also a filter key that has to stay distinct
    // from the US account's "USD" — CURRENCY_FILTER_OPTIONS keys its checkbox
    // rows by it (see FilterChips), so two entries sharing "USD" would collide.
    // format.ts maps it to "$" so amounts still render with a real symbol.
    currency: "Dollar",
    accountName: "Rest of the World",
    details: [
      { label: "SWIFT BIC", value: "PGBLGB2LXXX" },
      { label: "Account Number", value: "6041827395" },
    ],
    paymentMethod: "SWIFT",
    accountHolderName: ACCOUNT_HOLDER_NAME,
    accountType: "Business account",
    bankName: "PayGlocal International Ltd",
    beneficiaryAddress: "1 King Street, London, EC2V 8AU, UK",
    routingCodeType: "swift_bic",
  },
];

/**
 * Placeholder figures for the two summary cards above Account Details.
 * Every value here is dummy data — replace this module with the real API
 * response once a summary endpoint exists. The shape is deliberately what
 * flux-ui's MetricSparklineCard consumes, so wiring the backend up means
 * swapping the source rather than touching the cards.
 */

/**
 * Monthly settled-amount series (USD) behind the Settled Amount card, Jan
 * through Jul. Hard-coded rather than generated: `Math.random()` during
 * render is a purity violation (see CLAUDE.md), and a fixed series also
 * keeps the card's shape stable across re-renders instead of redrawing on
 * every one. Last point matches `totalEarnings.value` below so the chart's
 * endpoint agrees with the headline figure above it.
 */
export const TOTAL_EARNING_TREND: MetricSparklinePoint[] = [
  { x: "Jan", y: 92_000 },
  { x: "Feb", y: 89_500 },
  { x: "Mar", y: 98_200 },
  { x: "Apr", y: 95_400 },
  { x: "May", y: 105_800 },
  { x: "Jun", y: 115_600 },
  { x: "Jul", y: 128_400 },
];

export const MULTI_CURRENCY_SUMMARY = {
  totalEarnings: {
    value: "128,400 USD",
    // INR conversion, shown as supporting text under the USD amount.
    valueInr: "1,22,31,384.00 INR",
    trendLabel: "+8.6% vs last period",
  },
  outstanding: {
    value: "14,200 USD",
    note: "3 payers · ACH/Fedwire usually clears in 1–3 business days",
    info: "Payments your clients have initiated that have not settled yet.",
  },
} as const;
