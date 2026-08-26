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

/** The PUT body pg-dashboard sends — note the plural key `purposeCodes`, which
 *  differs from the singular `purposeCode` the GET returns. */
export interface BusinessUpdatePayload {
  purposeCodes: string[];
}

export interface SettlementData {
  ifscCode?: string | null;
  maskedAccountNumber?: string | null;
}

export interface SettlementDataResponse {
  data?: SettlementData | null;
}

export interface ContactData {
  phoneNumber?: string | null;
  emailId?: string | null;
}

export interface ContactDataResponse {
  data?: ContactData | null;
}
