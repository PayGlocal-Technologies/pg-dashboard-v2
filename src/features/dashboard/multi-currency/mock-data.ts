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
 * Placeholder figures for the settled-amount card at the top of the right
 * column. Every value here is dummy data — replace this module with the real
 * API response once a summary endpoint exists. The shape is deliberately what
 * the card already consumes, so wiring the backend up means swapping the
 * source rather than touching the UI.
 *
 * Outstanding beside it has no entry here: OutstandingAmountCard is
 * self-contained and reads the real MCA overview endpoint.
 */

/**
 * One currency's settled-amount card: the figures and the series behind them.
 *
 * Both totals are numbers, not pre-formatted strings: the card renders them
 * through the same `currencySymbol` / `formatCurrency` helpers the rest of the
 * product uses, so a figure here can't drift from how the same amount is
 * written elsewhere, and the chart's axis and tooltip stay in the same unit as
 * the headline above them.
 */
export interface SettledAmountSummary {
  /** Settled total in this currency's own units, e.g. 128_400 for $128,400. */
  amount: number;
  /** The same total converted to INR. */
  amountInr: number;
  /** Movement against the previous period, e.g. "+8.6% vs last period". */
  trendLabel: string;
  /**
   * Monthly settled totals behind the chart, in the account's own currency so
   * the Y axis reads in the same unit as the headline figure above it.
   * Hard-coded rather than generated: `Math.random()` during render is a
   * purity violation (see CLAUDE.md), and a fixed series also keeps each
   * card's shape stable across re-renders instead of redrawing on every one.
   */
  trend: MetricSparklinePoint[];
}

/**
 * Last-resort currency for the settled-amount card, used only if an account
 * ever carries one this map has no entry for. The card's actual currency comes
 * from the selected account.
 */
export const DEFAULT_SETTLED_CURRENCY = "USD";

/**
 * Keyed by currency code, which is what the region list on the left of the
 * page chooses — picking a region swaps both amounts, the comparison and the
 * chart together, without any of them being derived from one another.
 *
 * Every currency MOCK_VIRTUAL_ACCOUNTS carries has an entry, so a merchant
 * holding the full set of accounts never falls back to the default above.
 */
export const SETTLED_AMOUNT_BY_CURRENCY: Record<string, SettledAmountSummary> = {
  USD: {
    amount: 128_400,
    amountInr: 12_231_384,
    trendLabel: "+8.6% vs last period",
    trend: [
      { x: "Jan", y: 92_000 },
      { x: "Feb", y: 89_500 },
      { x: "Mar", y: 98_200 },
      { x: "Apr", y: 95_400 },
      { x: "May", y: 105_800 },
      { x: "Jun", y: 115_600 },
      { x: "Jul", y: 128_400 },
    ],
  },
  GBP: {
    amount: 74_600,
    amountInr: 8_952_000,
    trendLabel: "+4.5% vs last period",
    trend: [
      { x: "Jan", y: 61_200 },
      { x: "Feb", y: 58_900 },
      { x: "Mar", y: 64_500 },
      { x: "Apr", y: 67_100 },
      { x: "May", y: 69_800 },
      { x: "Jun", y: 71_400 },
      { x: "Jul", y: 74_600 },
    ],
  },
  EUR: {
    amount: 96_200,
    amountInr: 9_908_600,
    trendLabel: "+3.8% vs last period",
    trend: [
      { x: "Jan", y: 78_400 },
      { x: "Feb", y: 81_200 },
      { x: "Mar", y: 79_600 },
      { x: "Apr", y: 86_300 },
      { x: "May", y: 89_100 },
      { x: "Jun", y: 92_700 },
      { x: "Jul", y: 96_200 },
    ],
  },
  AED: {
    amount: 312_800,
    amountInr: 7_089_000,
    trendLabel: "+5.1% vs last period",
    trend: [
      { x: "Jan", y: 241_000 },
      { x: "Feb", y: 236_500 },
      { x: "Mar", y: 258_300 },
      { x: "Apr", y: 271_900 },
      { x: "May", y: 284_600 },
      { x: "Jun", y: 298_200 },
      { x: "Jul", y: 312_800 },
    ],
  },
  CAD: {
    amount: 41_900,
    amountInr: 2_849_200,
    trendLabel: "+4.2% vs last period",
    trend: [
      { x: "Jan", y: 33_600 },
      { x: "Feb", y: 32_200 },
      { x: "Mar", y: 35_800 },
      { x: "Apr", y: 37_100 },
      { x: "May", y: 39_400 },
      { x: "Jun", y: 40_200 },
      { x: "Jul", y: 41_900 },
    ],
  },
  AUD: {
    amount: 58_300,
    amountInr: 3_614_600,
    trendLabel: "+4.3% vs last period",
    trend: [
      { x: "Jan", y: 44_100 },
      { x: "Feb", y: 46_800 },
      { x: "Mar", y: 45_200 },
      { x: "Apr", y: 49_700 },
      { x: "May", y: 52_300 },
      { x: "Jun", y: 55_900 },
      { x: "Jul", y: 58_300 },
    ],
  },
  SGD: {
    amount: 87_400,
    amountInr: 5_681_000,
    trendLabel: "+4.7% vs last period",
    trend: [
      { x: "Jan", y: 68_300 },
      { x: "Feb", y: 71_500 },
      { x: "Mar", y: 69_900 },
      { x: "Apr", y: 76_200 },
      { x: "May", y: 79_800 },
      { x: "Jun", y: 83_600 },
      { x: "Jul", y: 87_400 },
    ],
  },
  // The Rest of the World account is dollar-denominated and carries "Dollar"
  // as its currency value — see the note on that entry above for why it isn't
  // the ISO "USD".
  Dollar: {
    amount: 22_750,
    amountInr: 2_411_500,
    trendLabel: "+3.9% vs last period",
    trend: [
      { x: "Jan", y: 17_200 },
      { x: "Feb", y: 18_400 },
      { x: "Mar", y: 17_900 },
      { x: "Apr", y: 19_600 },
      { x: "May", y: 20_800 },
      { x: "Jun", y: 21_900 },
      { x: "Jul", y: 22_750 },
    ],
  },
};
