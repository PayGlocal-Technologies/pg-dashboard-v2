/**
 * DESIGN MOCK data for the sign-in account chooser and sign-up's
 * linked-accounts check. Fictional people and
 * businesses; replace with the real lookup when the flow is wired up.
 *
 * Account rules the real flow must enforce (backend, not this mock):
 *  - one email belongs to exactly one account;
 *  - one phone number can be linked to at most MAX_ACCOUNTS_PER_PHONE
 *    accounts (emails).
 */

export const MAX_ACCOUNTS_PER_PHONE = 3;

export type AccountRole = "MERCHANT" | "PARTNER";

/**
 * Mock emails that hold more than one role. Signing in with one asks, after
 * the password or OTP, which role to land on. Fictional; the real roles come
 * from the login response once wired up.
 */
export const MOCK_MULTI_ROLE_EMAILS: Record<string, AccountRole[]> = {
  "arjun@globaltraders.com": ["MERCHANT", "PARTNER"],
};

export function rolesForEmail(email: string): AccountRole[] {
  return MOCK_MULTI_ROLE_EMAILS[email.trim().toLowerCase()] ?? [];
}

export interface MockAccount {
  id: string;
  /** Unknown before sign-in when the merchant identified by email. */
  fullName?: string;
  email: string;
  /** True for accounts found via a phone lookup: shown before the merchant
   *  has proved they own the number, so the email is masked. */
  masked: boolean;
}

const MOCK_ACCOUNTS: Omit<MockAccount, "masked">[] = [
  { id: "acct-1", fullName: "Priya Sharma", email: "priya@acmeexports.com" },
  { id: "acct-2", fullName: "Priya Sharma", email: "priya@loomandleaf.in" },
  { id: "acct-3", fullName: "Rohan Mehta", email: "rohan@kaveritextiles.com" },
];

/**
 * Mock phone lookup, shared by sign-in and sign-up. The number's last digit
 * picks how many accounts it's already linked to, so every case can be
 * demoed: ends in 1, 2 or 3 gives that many; anything else gives none.
 *
 * `masked`: true before the merchant has proved they own the number (sign-in
 * chooser), false after OTP verification (sign-up's linked-accounts check).
 */
export function mockAccountsForPhone(phone: string, { masked }: { masked: boolean }) {
  const last = Number(phone.replace(/\D/g, "").slice(-1));
  const count = last >= 1 && last <= MAX_ACCOUNTS_PER_PHONE ? last : 0;
  return MOCK_ACCOUNTS.slice(0, count).map((a) => ({ ...a, masked }));
}

/** "pr•••@acmeexports.com": enough for the owner to recognise, not enough
 *  for someone who merely knows the phone number to harvest. */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local.slice(0, 2)}•••@${domain}`;
}

export function displayEmail(account: MockAccount) {
  return account.masked ? maskEmail(account.email) : account.email;
}

export function initials(account: MockAccount) {
  const source = account.fullName ?? account.email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (account.fullName ? (parts[1]?.[0] ?? "") : "")).toUpperCase();
}
