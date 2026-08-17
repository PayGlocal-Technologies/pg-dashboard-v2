import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";
import type {
  Platform,
  PlatformDocument,
  PlatformMarketplace,
} from "@/features/dashboard/platforms/types";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/**
 * Every platform's document list carries the same two rows: a statement
 * generated on the platform side, then the merchant's own bank settlement
 * statement. The platform-side one leads because it's the document the
 * merchant has to go and produce, where the bank statement already exists.
 * Only the first is platform-specific, so it's built per platform rather than
 * repeated five times in SUPPORTED_PLATFORMS.
 */
function defaultDocuments(platformName: string): PlatformDocument[] {
  return [
    {
      caption: platformName,
      title: "Generate Settlement Statement",
      actionIcon: "file-text",
      actionLabel: `Generate a ${platformName} settlement statement`,
      opensSettlementForm: true,
    },
    {
      caption: "Last 3 months",
      title: "Bank settlement statement",
      actionIcon: "download",
      actionLabel: "Download the last 3 months' bank settlement statement",
    },
  ];
}

/**
 * The platforms the tutorial page covers, in display order.
 *
 * Everything the page renders comes from this list — the sidebar rows, the
 * header copy, the currency options, the step sequence and the document cards.
 * Adding a platform is one entry here plus one brand mark in the icon registry;
 * adding a screenshot is a `screenshotSrc` on the step it belongs to. No
 * component changes either way.
 *
 * Step copy is placeholder guidance written against each platform's published
 * payout flow, and the screenshots that go beside it are still to come. Replace
 * both with the reviewed content once it's available.
 */
export const SUPPORTED_PLATFORMS: Platform[] = [
  {
    id: "amazon",
    name: "Amazon",
    logo: "amazon-logo",
    logoSrc: "/assets/Platform/Amazon.png",
    accountIds: ["us-usd", "gb-gbp", "eu-eur", "ca-cad", "au-aud"],
    // One Amazon storefront per country, so the currency picker names the
    // marketplace rather than the currency. eu-eur is deliberately absent:
    // there is no single EU storefront, so it falls back to "EUR" (the merchant
    // uses a specific marketplace such as amazon.de). ae-aed and sg-sgd are
    // listed for when those accounts join `accountIds` above; a label for an
    // account the platform doesn't offer is simply never read.
    marketplaceLabels: {
      "us-usd": "amazon.com",
      "gb-gbp": "amazon.co.uk",
      "ca-cad": "amazon.ca",
      "au-aud": "amazon.com.au",
      "ae-aed": "amazon.ae",
      "sg-sgd": "amazon.sg",
    },
    // The eight Amazon storefronts the walkthrough covers, in the order the
    // selector offers them. Four of them settle into the one euro account —
    // Amazon runs a storefront per European country, but a single receiving
    // account serves them all — which is why this is its own list rather than
    // one label per entry in `accountIds`. Each carries its storefront's own
    // country flag, so the four euro rows stay distinguishable.
    marketplaces: [
      { id: "amazon-com", label: "Amazon.com", accountId: "us-usd", iso2: "US" },
      { id: "amazon-co-uk", label: "Amazon.co.uk", accountId: "gb-gbp", iso2: "GB" },
      { id: "amazon-ca", label: "Amazon.ca", accountId: "ca-cad", iso2: "CA" },
      { id: "amazon-com-au", label: "Amazon.com.au", accountId: "au-aud", iso2: "AU" },
      { id: "amazon-de", label: "Amazon.de", accountId: "eu-eur", iso2: "DE" },
      { id: "amazon-fr", label: "Amazon.fr", accountId: "eu-eur", iso2: "FR" },
      { id: "amazon-it", label: "Amazon.it", accountId: "eu-eur", iso2: "IT" },
      { id: "amazon-es", label: "Amazon.es", accountId: "eu-eur", iso2: "ES" },
    ],
    // Amazon pays out per marketplace, so the merchant picks which currency
    // this walkthrough is describing. No other platform here offers that
    // choice — see `offersCurrencyChoice` on the Platform type.
    offersCurrencyChoice: true,
    steps: [
      { instruction: "Log in to Amazon Seller Central" },
      { instruction: "Open 'Settings' and select 'Account Info'" },
      { instruction: "Under 'Payment Information', choose 'Deposit Methods'" },
      { instruction: "Pick the marketplace you want to be paid for" },
      { instruction: "Enter the account details from Quick Access below", quickAccess: true },
      { instruction: "Submit the account and wait for Amazon to verify it" },
    ],
    documents: defaultDocuments("Amazon"),
  },
  {
    id: "freelancer",
    name: "Freelancer",
    logo: "freelancer-logo",
    logoSrc: "/assets/Platform/Freelancer.png",
    accountIds: ["us-usd", "gb-gbp", "eu-eur", "au-aud"],
    steps: [
      { instruction: "Log in to your Freelancer account" },
      { instruction: "Open the profile menu and select 'Payments & Financials'" },
      { instruction: "Go to 'Withdraw Funds' and choose 'International Wire'" },
      { instruction: "Add a new withdrawal account" },
      { instruction: "Enter the account details from Quick Access above" },
      { instruction: "Save it and set it as your default withdrawal method" },
    ],
    documents: defaultDocuments("Freelancer"),
  },
  {
    id: "upwork",
    name: "Upwork",
    logo: "upwork-logo",
    logoSrc: "/assets/Platform/Upwork.png",
    accountIds: ["us-usd", "gb-gbp", "eu-eur", "ca-cad", "au-aud", "sg-sgd"],
    steps: [
      { instruction: "Log in to your Upwork account" },
      { instruction: "Go to your profile and click 'Account settings'" },
      { instruction: "Open 'Billing & Payments' and select 'Get Paid'" },
      { instruction: "Add 'Direct to Local Bank' as a payment method" },
      { instruction: "Enter the account details from Quick Access above" },
      { instruction: "Confirm and make it your default payment method" },
    ],
    documents: defaultDocuments("Upwork"),
  },
  {
    id: "toptal",
    name: "Toptal",
    logo: "toptal-logo",
    logoSrc: "/assets/Platform/Toptal.png",
    accountIds: ["us-usd", "gb-gbp", "eu-eur"],
    steps: [
      { instruction: "Log in to your Toptal account" },
      { instruction: "Open 'Settings' and select 'Payment Details'" },
      { instruction: "Click 'Add payment method' and choose 'Local bank transfer'" },
      { instruction: "Enter the account details from Quick Access above" },
      { instruction: "Verify the account and set it as your primary payout method" },
    ],
    documents: defaultDocuments("Toptal"),
  },
  {
    id: "deel",
    name: "Deel",
    logo: "deel-logo",
    logoSrc: "/assets/Platform/Deel.png",
    accountIds: ["us-usd", "gb-gbp", "eu-eur", "ae-aed", "sg-sgd"],
    steps: [
      { instruction: "Log in to your Deel account" },
      { instruction: "Open 'Withdraw' from the main navigation" },
      { instruction: "Select 'Bank transfer' as your withdrawal method" },
      { instruction: "Add a bank account for the currency you want to receive" },
      { instruction: "Enter the account details from Quick Access above" },
      { instruction: "Confirm and set it as your default withdrawal method" },
    ],
    documents: defaultDocuments("Deel"),
  },
];

/**
 * The virtual accounts one platform can be paid into, resolved from its
 * `accountIds` in the order it declared them. Ids with no matching account are
 * dropped rather than rendered as an empty currency option.
 */
export function accountsForPlatform(platform: Platform): VirtualAccount[] {
  return platform.accountIds
    .map((id) => MOCK_VIRTUAL_ACCOUNTS.find((account) => account.id === id))
    .filter((account): account is VirtualAccount => Boolean(account));
}

/**
 * What the currency picker calls one of a platform's receiving accounts: the
 * platform's own marketplace for that account where it runs one
 * ("amazon.com"), and the plain currency code where it doesn't ("EUR" — the EU
 * has no single Amazon storefront, so the merchant picks a specific
 * marketplace such as amazon.de).
 */
export function accountOptionLabel(platform: Platform, account: VirtualAccount): string {
  return platform.marketplaceLabels?.[account.id] ?? account.currency;
}

/**
 * The receiving account one of a platform's storefronts settles into, resolved
 * against the accounts that platform actually offers. Falls back to the first
 * of those whenever the marketplace is absent or points at an account the
 * platform doesn't carry, so the caller always has an account to render.
 */
export function accountForMarketplace(
  accounts: VirtualAccount[],
  marketplace: PlatformMarketplace | null
): VirtualAccount | null {
  return (
    (marketplace ? accounts.find((account) => account.id === marketplace.accountId) : undefined) ??
    accounts[0] ??
    null
  );
}

/**
 * Fixed 16:10 footprint for every tutorial screenshot, applied to the empty
 * placeholder and to the real image alike. Reserving the ratio now is what lets
 * a screenshot drop in later without the step sequence reflowing, and it keeps
 * every step the same height whether or not it has art yet.
 *
 * The frame spans the tutorial column's full width — the instruction sits above
 * it rather than beside it — so the ratio is the only thing deciding how tall a
 * step is. Widen it if the real screenshots turn out shorter than this reserves.
 */
export const SCREENSHOT_ASPECT_CLASS = "aspect-[16/10] w-full";
