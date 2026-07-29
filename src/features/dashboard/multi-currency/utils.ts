import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

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
