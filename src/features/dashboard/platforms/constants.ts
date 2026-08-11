import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";
import type { Platform, PlatformDocument } from "@/features/dashboard/platforms/types";
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
 * The three fields Quick Access surfaces for an account: the holder name, then
 * the account's own two rail-specific identifiers.
 *
 * Those identifiers keep the labels the account itself carries — "Account
 * Number"/"ACH Routing" for the US, "IBAN"/"SEPA BIC" for Europe — rather than
 * being flattened into a generic "Routing Code" that would be wrong on half the
 * rails.
 */
export function quickAccessFields(account: VirtualAccount) {
  return [
    { label: "Account holder's name", value: account.accountHolderName },
    ...account.details,
  ];
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
