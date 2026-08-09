import { MOCK_VIRTUAL_ACCOUNTS } from "@/features/dashboard/multi-currency/mock-data";
import type { Platform, PlatformDocument } from "@/features/dashboard/platforms/types";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/**
 * Every platform's document list opens with the same two rows: the merchant's
 * own settlement statement, and a statement generated on the platform side.
 * Only the second is platform-specific, so it's built per platform rather than
 * repeated five times in SUPPORTED_PLATFORMS.
 */
function defaultDocuments(platformName: string): PlatformDocument[] {
  return [
    {
      caption: "Last 3 months",
      title: "Bank settlement statement",
      actionIcon: "download",
      actionLabel: "Download the last 3 months' bank settlement statement",
    },
    {
      caption: platformName,
      title: "Generate Settlement Statement",
      actionIcon: "file-text",
      actionLabel: `Generate a ${platformName} settlement statement`,
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
    accountIds: ["us-usd", "gb-gbp", "eu-eur", "ca-cad", "au-aud"],
    steps: [
      { instruction: "Log in to Amazon Seller Central" },
      { instruction: "Open 'Settings' and select 'Account Info'" },
      { instruction: "Under 'Payment Information', choose 'Deposit Methods'" },
      { instruction: "Pick the marketplace you want to be paid for" },
      { instruction: "Enter the account details from Quick Access above" },
      { instruction: "Submit the account and wait for Amazon to verify it" },
    ],
    documents: defaultDocuments("Amazon"),
  },
  {
    id: "freelancer",
    name: "Freelancer",
    logo: "freelancer-logo",
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
 * every step's right column the same height whether or not it has art yet.
 */
export const SCREENSHOT_ASPECT_CLASS = "aspect-[16/10] w-full";
