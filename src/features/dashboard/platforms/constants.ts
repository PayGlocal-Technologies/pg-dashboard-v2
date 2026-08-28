import type {
  Platform,
  PlatformDocument,
  PlatformMarketplace,
} from "@/features/dashboard/platforms/types";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/**
 * The two statements Amazon payouts involve: the platform-side settlement
 * statement the merchant has to generate, then their own bank statement. The
 * platform-side one leads because it is the document they must go and produce,
 * where the bank statement already exists.
 *
 * Amazon-only, matching pg-dashboard, which gates this whole column on the
 * selected platform being Amazon and labels its second card "Amazon / Account
 * Statement". No other platform here has documents, so none renders the column.
 */
const AMAZON_DOCUMENTS: PlatformDocument[] = [
  {
    caption: "Amazon",
    title: "Generate Settlement Statement",
    actionIcon: "file-text",
    actionLabel: "Generate an Amazon settlement statement",
    opensSettlementForm: true,
  },
  {
    caption: "Last 3 months",
    title: "Bank settlement statement",
    actionIcon: "download",
    actionLabel: "Download the last 3 months' bank settlement statement",
  },
];

/**
 * Amazon's storefronts, in the order the selector offers them: the four that
 * settle into a currency of their own first, then the euro ones under a Europe
 * group, since all five of those resolve to the same receiving account and
 * differ only in which storefront the merchant sells on.
 *
 * Domains verified against Amazon's published marketplace list (August 2026).
 * Amazon does add storefronts — Belgium, Ireland, Poland, Sweden and Turkey all
 * exist in Europe alone — so re-check this table rather than treating it as
 * final. Adding one is an entry here plus a matching currency the accounts
 * endpoint buckets.
 */
const AMAZON_MARKETPLACES: PlatformMarketplace[] = [
  { domain: "amazon.com", label: "United States", iso2: "US", currency: "USD" },
  { domain: "amazon.co.uk", label: "United Kingdom", iso2: "GB", currency: "GBP" },
  { domain: "amazon.ca", label: "Canada", iso2: "CA", currency: "CAD" },
  { domain: "amazon.com.au", label: "Australia", iso2: "AU", currency: "AUD" },
  { domain: "amazon.de", label: "Germany", iso2: "DE", currency: "EUR", group: "Europe" },
  { domain: "amazon.fr", label: "France", iso2: "FR", currency: "EUR", group: "Europe" },
  { domain: "amazon.it", label: "Italy", iso2: "IT", currency: "EUR", group: "Europe" },
  { domain: "amazon.es", label: "Spain", iso2: "ES", currency: "EUR", group: "Europe" },
  { domain: "amazon.nl", label: "Netherlands", iso2: "NL", currency: "EUR", group: "Europe" },
];

/**
 * The platforms the tutorial page covers, in display order.
 *
 * Everything the page renders comes from this list — the sidebar rows, the
 * header copy, the currency options, the step sequence and the document cards.
 * Adding a platform is one entry here plus one brand mark in the icon registry;
 * adding a screenshot is a `screenshotSrc` on the step it belongs to. No
 * component changes either way.
 *
 * Step copy and screenshots are carried over from pg-dashboard's
 * platform-withdrawals feature, which is the reviewed production content — each
 * instruction is paired with the screenshot that production shows beside it, so
 * the two cannot drift out of step.
 */
export const SUPPORTED_PLATFORMS: Platform[] = [
  {
    id: "amazon",
    name: "Amazon",
    logo: "amazon-logo",
    logoSrc: "/assets/Platform/Amazon.png",
    accountCurrencies: ["USD", "GBP", "EUR", "CAD", "AUD"],
    marketplaces: AMAZON_MARKETPLACES,
    steps: [
      {
        instruction: "Log in to Amazon Seller Central, open Settings and click 'Account info'",
        screenshotSrc: "/assets/platform-withdrawals/amazon/step-1.svg",
        screenshotAlt: "Amazon Seller Central settings menu with Account info highlighted",
      },
      {
        instruction: "Navigate to Payment Information",
        screenshotSrc: "/assets/platform-withdrawals/amazon/step-2.svg",
        screenshotAlt: "Amazon account info page with Payment Information highlighted",
      },
      {
        instruction: "Select Deposit Methods",
        screenshotSrc: "/assets/platform-withdrawals/amazon/step-3.svg",
        screenshotAlt: "Amazon Payment Information page with Deposit Methods highlighted",
      },
      {
        instruction: "Replace the deposit method in your store of choice",
        screenshotSrc: "/assets/platform-withdrawals/amazon/step-4.svg",
        screenshotAlt: "Amazon deposit methods list with the replace action highlighted",
      },
      {
        instruction: "Choose to remove the current default account from that store",
        screenshotSrc: "/assets/platform-withdrawals/amazon/step-5.svg",
        screenshotAlt: "Amazon prompt to remove the current default deposit account",
      },
      {
        instruction: "Confirm that you want to remove your default method",
        screenshotSrc: "/assets/platform-withdrawals/amazon/step-6.svg",
        screenshotAlt: "Amazon confirmation dialog for removing the default deposit method",
      },
      {
        instruction: "Click 'Add new deposit method'",
        screenshotSrc: "/assets/platform-withdrawals/amazon/step-7.svg",
        screenshotAlt: "Amazon deposit methods page with Add new deposit method highlighted",
      },
      {
        instruction:
          "Enter your PayGlocal virtual account details for the chosen location, then set the deposit method",
        screenshotSrc: "/assets/platform-withdrawals/amazon/step-8.svg",
        screenshotAlt: "Amazon bank account form filled with virtual account details",
        quickAccess: true,
      },
    ],
    documents: AMAZON_DOCUMENTS,
  },
  {
    id: "freelancer",
    name: "Freelancer",
    logo: "freelancer-logo",
    logoSrc: "/assets/Platform/Freelancer.png",
    accountCurrencies: ["USD", "GBP", "EUR", "AUD"],
    steps: [
      {
        instruction: "Log in to your Freelancer account",
        screenshotSrc: "/assets/platform-withdrawals/freelancer/step-1.svg",
        screenshotAlt: "Freelancer login screen",
      },
      {
        instruction: "Open your profile and click 'Withdraw funds'",
        screenshotSrc: "/assets/platform-withdrawals/freelancer/step-2.svg",
        screenshotAlt: "Freelancer profile menu with Withdraw funds highlighted",
      },
      {
        instruction: "Click 'Express Withdrawal'",
        screenshotSrc: "/assets/platform-withdrawals/freelancer/step-3.svg",
        screenshotAlt: "Freelancer withdrawal options with Express Withdrawal highlighted",
      },
      {
        instruction: "Verify your identity with the code sent to your email",
        screenshotSrc: "/assets/platform-withdrawals/freelancer/step-4.svg",
        screenshotAlt: "Freelancer identity verification code prompt",
      },
      {
        instruction: "Select 'United States' and enter the withdrawal amount",
        screenshotSrc: "/assets/platform-withdrawals/freelancer/step-5.svg",
        screenshotAlt: "Freelancer withdrawal form with country and amount fields",
      },
      {
        instruction: "Enter your local USD account details and click 'Withdraw Funds'",
        screenshotSrc: "/assets/platform-withdrawals/freelancer/step-6.svg",
        screenshotAlt: "Freelancer bank details form filled with virtual account details",
        quickAccess: true,
      },
    ],
  },
  {
    id: "upwork",
    name: "Upwork",
    logo: "upwork-logo",
    logoSrc: "/assets/Platform/Upwork.png",
    accountCurrencies: ["USD", "GBP", "EUR", "CAD", "AUD", "SGD"],
    steps: [
      {
        instruction: "Log in to your Upwork account",
        screenshotSrc: "/assets/platform-withdrawals/upwork/step-1.svg",
        screenshotAlt: "Upwork login screen",
      },
      {
        instruction: "Open your profile and click 'Settings'",
        screenshotSrc: "/assets/platform-withdrawals/upwork/step-2.svg",
        screenshotAlt: "Upwork profile menu with Settings highlighted",
      },
      {
        instruction: "In Settings, open the 'Get Paid' tab and click 'Add a method'",
        screenshotSrc: "/assets/platform-withdrawals/upwork/step-3.svg",
        screenshotAlt: "Upwork Get Paid tab with Add a method highlighted",
      },
      {
        instruction: "Select 'Direct to U.S. Bank (USD)'",
        screenshotSrc: "/assets/platform-withdrawals/upwork/step-4.svg",
        screenshotAlt: "Upwork payment method list with Direct to U.S. Bank selected",
      },
      {
        instruction: "Enter your local USD account details and click 'Add bank account'",
        screenshotSrc: "/assets/platform-withdrawals/upwork/step-5.svg",
        screenshotAlt: "Upwork bank account form filled with virtual account details",
        quickAccess: true,
      },
      {
        instruction: "Upwork asks you to set up a withdrawal schedule — fill it in or skip it",
        screenshotSrc: "/assets/platform-withdrawals/upwork/step-6.svg",
        screenshotAlt: "Upwork withdrawal schedule setup screen",
      },
      {
        instruction: "Enable the checkbox and click 'Save changes'",
        note: "Upwork might ask you to submit certain tax documents before you can withdraw funds — a PAN, a W-8BEN form, and similar.",
        screenshotSrc: "/assets/platform-withdrawals/upwork/step-7.svg",
        screenshotAlt: "Upwork save changes confirmation with the consent checkbox enabled",
      },
    ],
  },
  {
    id: "toptal",
    name: "Toptal",
    logo: "toptal-logo",
    logoSrc: "/assets/Platform/Toptal.png",
    accountCurrencies: ["USD", "GBP", "EUR"],
    steps: [
      {
        instruction:
          "Log in to your Toptal account, click 'Transfer' and select 'Add new transfer method'",
        screenshotSrc: "/assets/platform-withdrawals/toptal/step-1.jpg",
        screenshotAlt: "Toptal transfer page with Add new transfer method highlighted",
      },
      {
        instruction: "Select 'United States', then select 'USD'",
        screenshotSrc: "/assets/platform-withdrawals/toptal/step-2.jpg",
        screenshotAlt: "Toptal country and currency selection",
      },
      {
        instruction: "Select 'Bank account' and click 'Continue'",
        screenshotSrc: "/assets/platform-withdrawals/toptal/step-3.jpg",
        screenshotAlt: "Toptal transfer method options with Bank account selected",
      },
      {
        instruction: "Enter your local USD account details and click 'Continue'",
        screenshotSrc: "/assets/platform-withdrawals/toptal/step-4.jpg",
        screenshotAlt: "Toptal bank details form filled with virtual account details",
        quickAccess: true,
      },
    ],
  },
  {
    id: "deel",
    name: "Deel",
    logo: "deel-logo",
    logoSrc: "/assets/Platform/Deel.png",
    accountCurrencies: ["USD", "GBP", "EUR", "AED", "SGD"],
    steps: [
      {
        instruction: "Log in to your Deel account",
        screenshotSrc: "/assets/platform-withdrawals/deel/step-1.jpg",
        screenshotAlt: "Deel login screen",
      },
      {
        instruction: "Click 'Withdrawal Methods'",
        screenshotSrc: "/assets/platform-withdrawals/deel/step-2.jpg",
        screenshotAlt: "Deel navigation with Withdrawal Methods highlighted",
      },
      {
        instruction: "Click 'Add Method'",
        screenshotSrc: "/assets/platform-withdrawals/deel/step-3.jpg",
        screenshotAlt: "Deel withdrawal methods page with Add Method highlighted",
      },
      {
        instruction: "Choose 'Bank transfer'",
        screenshotSrc: "/assets/platform-withdrawals/deel/step-4.jpg",
        screenshotAlt: "Deel withdrawal method options with Bank transfer selected",
      },
      {
        instruction:
          "In the Business section, enter the account details — the sort code field takes your routing number",
        screenshotSrc: "/assets/platform-withdrawals/deel/step-5.jpg",
        screenshotAlt: "Deel business bank details form filled with virtual account details",
        quickAccess: true,
      },
      {
        instruction: "Click 'Add'",
        screenshotSrc: "/assets/platform-withdrawals/deel/step-6.jpg",
        screenshotAlt: "Deel bank details form with the Add button highlighted",
      },
      {
        instruction: "Enter the OTP to complete verification",
        screenshotSrc: "/assets/platform-withdrawals/deel/step-7.jpg",
        screenshotAlt: "Deel one-time passcode verification prompt",
      },
    ],
  },
];

/**
 * The virtual accounts one platform can be paid into, resolved from its
 * `accountIds` in the order it declared them. Ids with no matching account are
 * dropped rather than rendered as an empty currency option.
 */
export function accountsForPlatform(
  platform: Platform,
  accounts: VirtualAccount[]
): VirtualAccount[] {
  return platform.accountCurrencies
    .map((currency) => accounts.find((account) => account.currency === currency))
    .filter((account): account is VirtualAccount => Boolean(account));
}

/**
 * The storefronts a platform offers *that the merchant can actually be paid
 * into*, in declared order. A storefront whose currency the accounts endpoint
 * returned nothing for is dropped, exactly as accountsForPlatform drops a
 * currency with no account — so the selector can never offer an option that
 * resolves to an empty panel.
 */
export function marketplacesForPlatform(
  platform: Platform,
  accounts: VirtualAccount[]
): PlatformMarketplace[] {
  return (platform.marketplaces ?? []).filter((marketplace) =>
    accounts.some((account) => account.currency === marketplace.currency)
  );
}

/**
 * Splits a marketplace list into the ungrouped entries and the groups, both in
 * first-seen order, which is the shape the two-level Select renders: flat items
 * at the top, then a non-selectable group header with its own items beneath.
 */
export function groupMarketplaces(marketplaces: PlatformMarketplace[]): {
  flat: PlatformMarketplace[];
  groups: { label: string; items: PlatformMarketplace[] }[];
} {
  const flat = marketplaces.filter((marketplace) => !marketplace.group);
  const groups: { label: string; items: PlatformMarketplace[] }[] = [];

  for (const marketplace of marketplaces) {
    if (!marketplace.group) continue;
    const existing = groups.find((group) => group.label === marketplace.group);
    if (existing) existing.items.push(marketplace);
    else groups.push({ label: marketplace.group, items: [marketplace] });
  }

  return { flat, groups };
}

/**
 * Fallback for a selection made before this selector existed, or made on
 * another platform's plain currency control.
 *
 * The dropdown this replaced carried the account's own country name ("Germany",
 * "United States"), so a legacy value is matched on that label first and on the
 * account's currency second — which is what maps a euro selection onto a euro
 * storefront when the country name isn't one Amazon runs a store in. Returns
 * null when neither matches, and the caller then falls back to the first
 * storefront rather than showing nothing.
 *
 * Nothing persists a selection today (it lives in component state for the life
 * of the page), so this exists for cross-platform switching within a session
 * and as the landing point if a saved selection is ever added.
 */
export function marketplaceForAccount(
  marketplaces: PlatformMarketplace[],
  account: VirtualAccount | null
): PlatformMarketplace | null {
  if (!account) return null;
  return (
    marketplaces.find((marketplace) => marketplace.label === account.countryName) ??
    marketplaces.find((marketplace) => marketplace.currency === account.currency) ??
    null
  );
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
  return [{ label: "Account holder's name", value: account.accountHolderName }, ...account.details];
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
