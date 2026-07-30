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
 * display order. Built from the account rather than stored on it directly so
 * the compact card's `details` (Account Number, ACH Routing, ...) stay the
 * single source of truth for those fields instead of being duplicated.
 */
export function buildFullAccountDetails(account: VirtualAccount): AccountDetail[] {
  return [
    { label: "Payment Method", value: account.paymentMethod },
    { label: "Account Holder Name", value: account.accountHolderName },
    ...account.details,
    ...(account.routingCodeType
      ? [{ label: "Routing Code Type", value: account.routingCodeType }]
      : []),
    { label: "Bank Name", value: account.bankName },
    { label: "Beneficiary Address", value: account.beneficiaryAddress },
  ];
}

/** Plain-text block of every field in the expanded details section. */
export function formatFullAccount(account: VirtualAccount) {
  const lines = [
    `${account.countryName} Account`,
    ...buildFullAccountDetails(account).map((d) => `${d.label}: ${d.value}`),
  ];
  return lines.join("\n");
}
