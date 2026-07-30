/** One identifier row on a virtual account card (e.g. "ACH Routing" → "026073150"). */
export interface AccountDetail {
  label: string;
  value: string;
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
  bankName: string;
  beneficiaryAddress: string;
  /** Machine-readable routing code type, e.g. "ach_routing_number". Not every
   *  country's rail has one worth surfacing. */
  routingCodeType?: string;
}
