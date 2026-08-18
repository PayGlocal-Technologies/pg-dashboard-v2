/** One identifier row on a virtual account card (e.g. "ACH Routing" → "026073150"). */
export interface AccountDetail {
  label: string;
  value: string;
}

/**
 * One region a multi-region account can receive from — a row in the Supported
 * currencies modal. `currencyName` is stored rather than derived from the code
 * so it can be searched alongside the code and the region name.
 */
export interface SupportedRegion {
  /** ISO 3166-1 alpha-2 country code; drives the flag asset. */
  iso2: string;
  countryName: string;
  /** ISO 4217 code, e.g. "JPY". */
  currency: string;
  /** Full name, e.g. "Japanese Yen". */
  currencyName: string;
}

/** A single virtual receiving account in one of the supported countries. */
export interface VirtualAccount {
  /** Stable key — also used as the clipboard/share subject id. */
  id: string;
  /** ISO 3166-1 alpha-2 country code; drives the flag asset. */
  iso2: string;
  countryName: string;
  currency: string;
  /** Display name shown on the card, e.g. "USD Account". */
  accountName: string;
  /** Region-appropriate identifiers shown on the compact card, in order
   *  (e.g. "Account Number", "ACH Routing"). Reused as-is inside the full
   *  details section below the carousel. */
  details: AccountDetail[];
  /** Fields only shown in the expanded details section, not on the card. */
  paymentMethod: string;
  accountHolderName: string;
  /** e.g. "Business checking account" — shown in the expanded details section. */
  accountType: string;
  bankName: string;
  beneficiaryAddress: string;
  /** Machine-readable routing code type, e.g. "ach_routing_number". Not every
   *  country's rail has one worth surfacing. */
  routingCodeType?: string;
  /**
   * Every region this account can receive from, for accounts that cover many
   * (Rest of the World's SWIFT rail). Its presence is what makes the account
   * offer a "See supported currency" link; the seven single-country accounts
   * leave it unset and show none.
   */
  supportedRegions?: SupportedRegion[];
  /**
   * Remark senders should put on their transfer so their own bank doesn't
   * convert the payment before it arrives, e.g. "DO NOT CONVERT TO GBP".
   *
   * Only accounts reached over a rail that can arrive in the wrong currency
   * carry one — a local-rail account is already denominated in the currency
   * its senders hold. Its presence is what puts the FX banner above that
   * account's details, so the banner is a property of the data rather than a
   * check against a particular account.
   */
  senderRemark?: string;
}
