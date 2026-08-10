import type { AccountDetail, VirtualAccount } from "@/features/dashboard/multi-currency/types";

/** Same CDN the MCA transactions table uses for country flags. */
export function flagSrc(iso2: string) {
  return `https://static.payglocal.in/images/flags/${iso2.toLowerCase()}.svg`;
}

/** Plain-text block a merchant can paste to a client, for copy and share alike. */
export function formatAccount(account: VirtualAccount) {
  const lines = [
    `${account.accountName} (${account.countryName})`,
    ...account.details.map((d) => `${d.label}: ${d.value}`),
  ];
  return lines.join("\n");
}

export function formatAllAccounts(accounts: VirtualAccount[]) {
  return accounts.map(formatAccount).join("\n\n");
}

/**
 * Every field shown in the expanded details section below the carousel, in
 * display order — grouped into rows of three (Payment Method/primary
 * identifier/Bank Name, then Account Holder Name/Account Type/Beneficiary
 * Address, then the remaining identifiers) to match the customer-facing
 * layout this section mirrors. Built from the account rather than stored on
 * it directly so the compact card's `details` (Account Number, ACH Routing,
 * ...) stay the single source of truth for those fields instead of being
 * duplicated. `details[0]` is always the primary identifier (Account
 * Number/IBAN/...); anything from `details[1]` on — the routing-style
 * identifiers — trails after Beneficiary Address, alongside Routing Code Type.
 */
export function buildFullAccountDetails(account: VirtualAccount): AccountDetail[] {
  const [primaryIdentifier, ...otherIdentifiers] = account.details;
  return [
    { label: "Payment Method", value: account.paymentMethod },
    ...(primaryIdentifier ? [primaryIdentifier] : []),
    { label: "Bank Name", value: account.bankName },
    { label: "Account Holder Name", value: account.accountHolderName },
    { label: "Account Type", value: account.accountType },
    { label: "Beneficiary Address", value: account.beneficiaryAddress },
    ...otherIdentifiers,
    ...(account.routingCodeType
      ? [{ label: "Routing Code Type", value: account.routingCodeType }]
      : []),
  ];
}

/** "AUD" → "Australian Dollar" — for the email-share preview's Currency
 *  line. Intl's own currency-name table, not a lookup we'd have to maintain. */
export function currencyDisplayName(currencyCode: string): string {
  const name = new Intl.DisplayNames(["en"], { type: "currency" }).of(currencyCode) ?? currencyCode;
  return name.replace(/\b\w/g, (char) => char.toUpperCase());
}

/** Plain-text block of every field in the expanded details section. */
export function formatFullAccount(account: VirtualAccount) {
  const lines = [
    `${account.countryName} Account`,
    ...buildFullAccountDetails(account).map((d) => `${d.label}: ${d.value}`),
  ];
  return lines.join("\n");
}

// Deterministic per account id (not Math.random/Date.now — see CLAUDE.md's
// purity rules) so the same account always resolves to the same placeholder
// id instead of a new one on every render.
function mockShareId(accountId: string): number {
  let hash = 0;
  for (const ch of accountId) {
    hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  }
  return 1_000_000 + (hash % 9_000_000);
}

/**
 * Placeholder shareable-link URL for one account. There's no share-link
 * endpoint yet, so this is a stand-in: same host-naming convention the rest
 * of the app uses (see CLAUDE.md's "Environment / backend" section — uat
 * resolves to pygcl.com, dev/prod to payglocal.in), with a deterministic
 * mock id in place of a real backend-issued one. Replace with the real URL
 * once that endpoint exists.
 */
export function buildShareUrl(account: VirtualAccount): string {
  const env = process.env.NEXT_PUBLIC_ENV;
  const domain = env === "uat" ? "pygcl.com" : "payglocal.in";
  const host = env === "prod" ? `dashboard.${domain}` : `${env ?? "dev"}.dashboard.${domain}`;
  return `https://${host}/app/multi-currency-accounts-shared/${mockShareId(account.id)}`;
}
