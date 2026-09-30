// MOCK: every value in this file is prototype data for the "Check payment ETA"
// flow. No endpoint backs it yet; swap these for real reads (the merchant's
// shared accounts, the live holiday calendar) once one exists.

export type EtaCurrency = "USD" | "GBP" | "EUR" | "CAD" | "AUD";

export const ETA_CURRENCIES: { code: EtaCurrency; iso2: string }[] = [
  { code: "USD", iso2: "US" },
  { code: "GBP", iso2: "GB" },
  { code: "EUR", iso2: "EU" },
  { code: "CAD", iso2: "CA" },
  { code: "AUD", iso2: "AU" },
];

export interface EtaAccount {
  id: string;
  bankName: string;
  /** What the merchant knows the account as, e.g. "Local USD account". */
  accountType: string;
  /** Already masked. Only the last four digits ever appear in the UI. */
  maskedNumber: string;
}

export const ETA_ACCOUNTS: EtaAccount[] = [
  {
    id: "cfsb-local-usd",
    bankName: "Community Federal Savings Bank",
    accountType: "Local USD account",
    maskedNumber: "XXXX 9414",
  },
  {
    id: "tcc-swift",
    bankName: "The Currency Cloud Limited",
    accountType: "SWIFT account",
    maskedNumber: "XXXX 3347",
  },
];

export type EtaPaymentMode = "ach" | "fedwire" | "unknown" | "other";

export const ETA_PAYMENT_MODES: { value: EtaPaymentMode; label: string }[] = [
  { value: "ach", label: "ACH" },
  { value: "fedwire", label: "FEDWIRE" },
  { value: "unknown", label: "I don't know" },
  { value: "other", label: "Others" },
];

/** Bank holidays the business-day walk skips. YYYY-MM-DD, local dates. */
export const ETA_BANK_HOLIDAYS: { date: string; name: string }[] = [
  { date: "2026-09-30", name: "National Day for Truth & Reconciliation" },
];

/** The date the form opens on, as in the design. */
export const ETA_SAMPLE_INITIATED_DATE = "2026-09-26";

export const ETA_SUPPORT_EMAIL = "merchant.support@payglocal.in";
