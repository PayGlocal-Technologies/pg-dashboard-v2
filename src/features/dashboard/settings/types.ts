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

/** The onboarding business profile block of GET /merchants/{merchantId}/profile.
 *  Backs the read-only extra fields on Business details. */
export interface OnboardingBusinessProfile {
  gst?: string | null;
  businessRegisteredAddress?: string | null;
  websiteUrl?: string | null;
  natureOfBusiness?: string | null;
  emailId?: string | null;
  phoneNumber?: string | null;
}

export interface MerchantProfileData {
  onboardingBusinessProfile?: OnboardingBusinessProfile | null;
}

/** Envelope-tolerant: read `data` if the response wraps, else the flat body. */
export type MerchantProfileResponse = {
  data?: MerchantProfileData | null;
} & Partial<MerchantProfileData>;

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
