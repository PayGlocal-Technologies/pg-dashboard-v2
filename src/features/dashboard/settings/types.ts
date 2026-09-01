// Settings API contracts, mirrored field-for-field from pg-dashboard's
// my-account/types.ts. Every metric/field is optional and nullable because the
// merchant-profile endpoints return partial records.

export interface BusinessData {
  tradeName?: string | null;
  purposeCode?: string[] | null;
}

export interface BusinessDataResponse {
  data?: BusinessData | null;
}

/** Address block of the merchant profile. `concatAddress` is the pre-joined
 *  single-line form the API builds; the individual parts are what it joins, and
 *  are the fallback when it comes back null. */
export interface MerchantProfileAddress {
  streetAddress1?: string | null;
  streetAddress2?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  zipcode?: string | null;
  concatAddress?: string | null;
}

/** A contact block of the merchant profile (business / technical / operations).
 *  Only the fields Business details falls back to are declared. */
export interface MerchantProfileContact {
  emailId?: string | null;
  cellPhoneNumber?: string | null;
  cellPhoneISDNumber?: string | null;
  fullName?: string | null;
}

/** GET /gcc/v1/merchants/{merchantId}/profile.
 *
 *  The body is FLAT — there is no `data` envelope. This matches pg-dashboard,
 *  which types the same endpoint flat in platform-withdrawals/types.ts
 *  (`ProfileData`) and reads `profileData?.merchantRegisteredName` /
 *  `profileData?.merchantAddress?.concatAddress` directly.
 *
 *  Only the fields Business details reads are declared; the endpoint returns
 *  considerably more (PAN, IE code, bank/settlement blocks) which is
 *  deliberately left out rather than surfaced. */
export interface MerchantProfileResponse {
  merchantRegisteredName?: string | null;
  /** Trade / DBA name. `displayTag` carries the same value in most records. */
  merchantShortName?: string | null;
  displayTag?: string | null;
  merchantGST?: string | null;
  merchantUrl?: string | null;
  merchantEntityType?: string | null;
  /** Nature of business. Frequently null on older records. */
  lineOfBusiness?: string | null;
  merchantEmail?: string | null;
  merchantPhone?: string | null;
  merchantCountry?: string | null;
  merchantAddress?: MerchantProfileAddress | null;
  legalAddress?: MerchantProfileAddress | null;
  businessContact?: MerchantProfileContact | null;
  /** Singular string here, unlike the v3 /business endpoint's string[]. */
  purposeCode?: string | null;
}

/** The PUT body pg-dashboard sends — note the plural key `purposeCodes`, which
 *  differs from the singular `purposeCode` the GET returns. */
export interface BusinessUpdatePayload {
  purposeCodes: string[];
}

export interface SettlementData {
  ifscCode?: string | null;
  /** Masked value from the /settlement endpoint (e.g. ****1234). */
  maskedAccountNumber?: string | null;
  /** Full number from the secure /settlement-details endpoint. pg-dashboard's
   *  form binds this key (its field is literally named `accountNumber`), which
   *  is why the two endpoints return the number under different keys. */
  accountNumber?: string | null;
}

export interface SettlementDataResponse {
  data?: SettlementData | null;
}

/** PUT body for updating the settlement bank account. Endpoint:
 *  PUT /gcc/v2/merchants/{merchantId}/account-details — note the key is
 *  `number` (not `accountNumber`), and it is scoped by merchant id, not
 *  onboarding id. `ifscCode` must resolve via IFSC lookup or the API 4xxs. */
export interface AccountDetailsUpdatePayload {
  number: string;
  ifscCode: string;
}

export interface ContactData {
  phoneNumber?: string | null;
  emailId?: string | null;
}

export interface ContactDataResponse {
  data?: ContactData | null;
}
