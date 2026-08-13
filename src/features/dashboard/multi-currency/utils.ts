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
    // Omitted rather than shown blank when no rail is named — the same thing
    // pg-dashboard does for a currency missing from its
    // CURRENCY_PAYMENT_METHOD_MAP (paymentMethodFields in its hooks.ts). That
    // covers AED, SGD and the Rest of the World account.
    ...(account.paymentMethod ? [{ label: "Payment Method", value: account.paymentMethod }] : []),
    ...(primaryIdentifier ? [primaryIdentifier] : []),
    { label: "Bank Name", value: account.bankName },
    { label: "Account Holder Name", value: account.accountHolderName },
    { label: "Account Type", value: account.accountType },
    { label: "Beneficiary Address", value: account.beneficiaryAddress },
    ...otherIdentifiers,
    // Beside the ACH code it belongs with, not appended after the metadata.
    // pg-dashboard shows USD accounts both rows ("ACH routing code" and
    // "Fedwire routing Code") for the same reason: a client paying by wire
    // needs the wire code, and the two are not interchangeable.
    ...(account.fedwireRoutingCode
      ? [{ label: "Fedwire Routing Code", value: account.fedwireRoutingCode }]
      : []),
    ...(account.routingCodeType
      ? [{ label: "Routing Code Type", value: account.routingCodeType }]
      : []),
  ];
}

/**
 * Splits a Canadian routing code into the two parts a Canadian bank actually
 * asks for: an institution number (first 4 digits) and a transit number (the
 * remaining 5).
 *
 * Only applied to Amazon CAD accounts, and only when the code is exactly 9
 * characters — the same two conditions pg-dashboard checks in
 * `displayAccountDetails` (Platforms.tsx). Amazon's payout form takes the parts
 * separately, so showing only the combined code leaves the merchant to split it
 * themselves and get it wrong. Everywhere else the combined code is what the
 * client's bank wants, so nothing is added.
 *
 * Returns the fields to append, or [] when the split doesn't apply.
 */
export function canadianRoutingParts(
  account: VirtualAccount,
  isAmazonAccount: boolean
): AccountDetail[] {
  if (!isAmazonAccount || account.currency !== "CAD") return [];

  const routingCode = account.details.find((detail) =>
    detail.label.toLowerCase().includes("routing")
  )?.value;
  if (!routingCode || routingCode.length !== 9) return [];

  return [
    { label: "Institution No.", value: routingCode.slice(0, 4) },
    { label: "Transit No.", value: routingCode.slice(4) },
  ];
}

/**
 * Labels for currency values that aren't ISO 4217 codes. "GLOBAL" is the
 * accounts endpoint's SWIFT catch-all (its bucket key is "OTHER"; see
 * mapAccounts), and it reaches currencyDisplayName like any other currency.
 */
const NON_ISO_CURRENCY_LABELS: Record<string, string> = {
  GLOBAL: "Rest of the World",
};

/** "AUD" → "Australian Dollar" — for the email-share preview's Currency
 *  line. Intl's own currency-name table, not a lookup we'd have to maintain. */
export function currencyDisplayName(currencyCode: string): string {
  if (!currencyCode) return "";

  const known = NON_ISO_CURRENCY_LABELS[currencyCode];
  if (known) return known;

  // Intl.DisplayNames#of *throws* RangeError on anything that isn't a
  // well-formed three-letter code — it does not return undefined — so the
  // shape is checked before calling rather than after. This is a label helper
  // reached from render paths, and an unnamable currency must degrade to
  // showing the raw code, never take the page down with it.
  if (!/^[A-Za-z]{3}$/.test(currencyCode)) return currencyCode;

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

/**
 * How both document-download endpoints and the send-account-email endpoint
 * identify an account: the SHA-256 of its account number, hex encoded. Same
 * derivation as pg-dashboard's `stringToSHA256Hash`
 * (src/utils/index.ts), so a hash computed here addresses the same account
 * server-side.
 *
 * The account number is hashed precisely so it never travels in a URL, a query
 * key, or an error message. Never log either side of this function.
 *
 * Returns "" when the account has no number, so callers can guard on falsy
 * rather than sending a hash of the empty string.
 */
export async function accountDocumentId(accountNumber: string): Promise<string> {
  if (!accountNumber) return "";
  const utf8 = new TextEncoder().encode(accountNumber);
  const hashBuffer = await crypto.subtle.digest("SHA-256", utf8);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** The account's number as shown in its details rows — the input
 *  `accountDocumentId` hashes. Reads the row rather than a dedicated field
 *  because the view model keeps identifiers in `details`. */
export function accountNumberOf(account: VirtualAccount): string {
  return account.details.find((detail) => detail.label === "Account Number")?.value ?? "";
}
