/**
 * Explanatory content for the account guides, carried over verbatim from
 * pg-dashboard so both apps tell a merchant the same thing.
 *
 * Static by nature: how a client pays into a GBP account, and how long that
 * rail takes, is product copy rather than merchant data. Sources are
 * `MCA_ACCOUNT_HELPER_TEXT` and `GLOBAL_CURRENCIES_MAP` in
 * pg-dashboard's src/features/multi-currency-accounts/constants.ts.
 */

export interface AccountHelperText {
  title: string;
  description: string;
  timelineTitle: string;
  timeline: string;
}

/**
 * "How it works?" copy, keyed by the account's display currency — the same key
 * the accounts mapper produces, so "GLOBAL" covers the SWIFT catch-all.
 *
 * Every entry shares one title today. It stays per-currency rather than being
 * hoisted out, because that is how production stores it and a currency could
 * legitimately need its own.
 */
export const ACCOUNT_HELPER_TEXT: Record<string, AccountHelperText> = {
  USD: {
    title: "How to use the Multi-Currency Account",
    description:
      "Share the complete account details shown with your customers. Your customers in the US will then add this account as a beneficiary on their Online Banking portal. Once added, your customers can initiate a domestic bank transfer to this account via ACH/Fedwire. You will receive a notification once funds are received in this account.",
    timelineTitle: "Expected fund credit timeline",
    timeline:
      "Depending on the transfer method used, it may take between 2-3 business days for the payment to reach your PayGlocal account. Once verified, the payment will be credited to your India account within 2 business days.",
  },
  GBP: {
    title: "How to use the Multi-Currency Account",
    description:
      "Share the complete account details shown with your customers. Your customers in the UK will then add this account as a beneficiary on their Online Banking portal. Once added, your customers can initiate a domestic bank transfer to this account via FPS. You will receive a notification once funds are received in this account.",
    timelineTitle: "Expected fund credit timeline",
    timeline:
      "With FPS it may take between 1-2 business days for the payment to reach your PayGlocal account. Once verified, the payment will be credited to your India account within 2 business days.",
  },
  EUR: {
    title: "How to use the Multi-Currency Account",
    description:
      "Share the complete account details shown with your customers. Your customers in Europe will then add this account as a beneficiary on their Online Banking portal. Once added, your customers can initiate a domestic bank transfer via SEPA credit transfer to this account. You will receive a notification once funds are received in this account.",
    timelineTitle: "Expected fund credit timeline",
    timeline:
      "With SEPA Credit transfer it may take between 1-2 business days for the payment to reach your PayGlocal account. Once verified, the payment will be credited to your India account within 2 business days.",
  },
  CAD: {
    title: "How to use the Multi-Currency Account",
    description:
      "Share the complete account details shown with your customers. Your customers in Canada will then add this account as a beneficiary on their Online Banking portal. Once added, your customers can initiate a domestic bank transfer via EFT to this account. You will receive a notification once funds are received in this account.",
    timelineTitle: "Expected fund credit timeline",
    timeline:
      "With EFT transfer it may take between 2-3 business days for the payment to reach your PayGlocal account. Once verified, the payment will be credited to your India account within 2 business days.",
  },
  AUD: {
    title: "How to use the Multi-Currency Account",
    description:
      "Share the complete account details shown with your customers. Your customers in Australia will then add this account as a beneficiary on their Online Banking portal. Once added, your customers can initiate a domestic bank transfer to this account. You will receive a notification once funds are received in this account.",
    timelineTitle: "Expected fund credit timeline",
    timeline:
      "Depending on the transfer method used, it may take between 2-3 business days for the payment to reach your PayGlocal account. Once verified, the payment will be credited to your India account within 2 business days.",
  },
  GLOBAL: {
    title: "How to use the Multi-Currency Account",
    description:
      "The Global account can be used to receive payments in 33+ additional currencies. To use the account, share the complete account details shown with your customers. Your customers will then add this account as a beneficiary on their Online Banking portal. Once added, your customers can initiate a SWIFT transfer to this account. You will receive a notification once funds are received in this account.",
    timelineTitle: "Expected fund credit timeline",
    timeline:
      "With SWIFT transfers it may take between 4-5 business days for the payment to reach your PayGlocal account. Once verified, the payment will be credited to your India account within 2 business days.",
  },
};

export interface GlobalCurrency {
  /** Drives the flag; also the row key, since it is unique in this list. */
  countryIso2Code: string;
  currencyName: string;
  currencyCode: string;
}

/**
 * The currencies the SWIFT catch-all account can receive, in production's own
 * order — alphabetical by currency name for the long tail, then the majors that
 * also have their own local account. Its copy says "33+ additional
 * currencies"; this list is what the Supported Currencies dialog shows.
 */
export const GLOBAL_CURRENCIES: GlobalCurrency[] = [
  { countryIso2Code: "BH", currencyName: "Bahrain Dinar", currencyCode: "BHD" },
  { countryIso2Code: "BG", currencyName: "Bulgarian Lev", currencyCode: "BGN" },
  { countryIso2Code: "CN", currencyName: "Chinese Yuan", currencyCode: "CNH" },
  { countryIso2Code: "CZ", currencyName: "Czech Koruna", currencyCode: "CZK" },
  { countryIso2Code: "DK", currencyName: "Danish Krone", currencyCode: "DKK" },
  { countryIso2Code: "HK", currencyName: "Hong Kong Dollar", currencyCode: "HKD" },
  { countryIso2Code: "HU", currencyName: "Hungarian Forint", currencyCode: "HUF" },
  { countryIso2Code: "IL", currencyName: "Israeli Shekel", currencyCode: "ILS" },
  { countryIso2Code: "JP", currencyName: "Japanese Yen", currencyCode: "JPY" },
  { countryIso2Code: "KE", currencyName: "Kenyan Shilling", currencyCode: "KES" },
  { countryIso2Code: "KW", currencyName: "Kuwait Dinar", currencyCode: "KWD" },
  { countryIso2Code: "MX", currencyName: "Mexican Peso", currencyCode: "MXN" },
  { countryIso2Code: "NZ", currencyName: "New Zealand Dollar", currencyCode: "NZD" },
  { countryIso2Code: "NO", currencyName: "Norwegian Krone", currencyCode: "NOK" },
  { countryIso2Code: "OM", currencyName: "Omani Rial", currencyCode: "OMR" },
  { countryIso2Code: "PL", currencyName: "Polish Zloty", currencyCode: "PLN" },
  { countryIso2Code: "QA", currencyName: "Qatar Rial", currencyCode: "QAR" },
  { countryIso2Code: "RO", currencyName: "Romanian Leu", currencyCode: "RON" },
  { countryIso2Code: "SA", currencyName: "Saudi Riyal", currencyCode: "SAR" },
  { countryIso2Code: "ZA", currencyName: "South African Rand", currencyCode: "ZAR" },
  { countryIso2Code: "SE", currencyName: "Swedish Krona", currencyCode: "SEK" },
  { countryIso2Code: "CH", currencyName: "Swiss Franc", currencyCode: "CHF" },
  { countryIso2Code: "TH", currencyName: "Thai Baht", currencyCode: "THB" },
  { countryIso2Code: "TR", currencyName: "Turkish Lira", currencyCode: "TRY" },
  { countryIso2Code: "UG", currencyName: "Ugandan Shilling", currencyCode: "UGX" },
  { countryIso2Code: "US", currencyName: "US Dollar", currencyCode: "USD" },
  { countryIso2Code: "GB", currencyName: "UK Sterling", currencyCode: "GBP" },
  { countryIso2Code: "EU", currencyName: "Euro", currencyCode: "EUR" },
  { countryIso2Code: "SG", currencyName: "Singapore Dollar", currencyCode: "SGD" },
  { countryIso2Code: "AU", currencyName: "Australian Dollar", currencyCode: "AUD" },
  { countryIso2Code: "AE", currencyName: "UAE Dirham", currencyCode: "AED" },
  { countryIso2Code: "CA", currencyName: "Canadian Dollar", currencyCode: "CAD" },
];
