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
export interface MerchantBusinessSummary {
  gst?: string | null;
  registeredAddress?: string | null;
  websiteUrl?: string | null;
  /** A code, e.g. "GOODS_EXPORT" — not a human label. */
  lineOfBusiness?: string | null;
  supportContactName?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  /** Public S3 URL of the uploaded checkout logo (see merchantLogoUploadApi).
   *  Absent until a logo has been uploaded. */
  merchantLogoPublicUrl?: string | null;
}

export interface MerchantProfileData {
  merchantBusinessSummary?: MerchantBusinessSummary | null;
}

/** Envelope-tolerant: read `data` if the response wraps, else the flat body. */
export type MerchantProfileResponse = {
  data?: MerchantProfileData | null;
} & Partial<MerchantProfileData>;

/** Response to the logo upload — carries the stored public URL to display. */
export interface MerchantLogoUploadData {
  merchantLogoPublicUrl: string;
}

export interface MerchantLogoUploadResponse {
  message?: string;
  reasonCode?: string;
  data: MerchantLogoUploadData;
}

/** GET /merchants/banner/{onbId}/purpose-codes, mirrored from pg-dashboard's
 *  OnboardingBanners/types.ts PurposeCodesResponse.
 *
 *  `possiblePurposeCodes` is the option list: code -> description. Both halves
 *  are nullable, so callers must fall back to the static RBI table. */
export interface PurposeCodesData {
  suggestedPurposeCodes?: string[] | null;
  possiblePurposeCodes?: Record<string, string> | null;
}

export interface PurposeCodesResponse {
  data?: PurposeCodesData | null;
}

/** GET /v1/merchants/{merchantId}/purpose-code. `purposeCode` is null when
 *  the merchant has never had one set. */
export interface MerchantPurposeCodeResponse {
  data?: { purposeCode?: string | null } | null;
}

/** PUT /v1/merchants/{merchantId}/purpose-code body. Overwrites the stored
 *  code every time. */
export interface MerchantPurposeCodeUpdatePayload {
  purposeCode: string;
}

export interface SettlementData {
  ifscCode?: string | null;
  /** Masked value from the /settlement endpoint (e.g. ****1234). */
  maskedAccountNumber?: string | null;
  /** Full number from the secure /settlement-details endpoint. pg-dashboard's
   *  form binds this key (its field is literally named `accountNumber`), which
   *  is why the two endpoints return the number under different keys. */
  accountNumber?: string | null;
  /** When the settlement account was last changed, epoch milliseconds as a
   *  string (e.g. "1790762925003"). Returned by the masked /settlement read
   *  (GET /v3/merchants/profile/{onbId}/settlement). Drives
   *  the once-every-30-days change rule, see settlementChangePolicy. */
  lastUpdatedTime?: string | null;
}

export interface SettlementDataResponse {
  data?: SettlementData | null;
}

/** PUT /gcc/v3/merchants/profile/{onboardingId}/settlement body. */
export interface SettlementUpdatePayload {
  accountNumber: string;
  ifscCode: string;
}

/**
 * Its response. Success is `{ message }` alone. Failures carry `status` and
 * `reasonCode` with the message to show:
 *   - "Invalid IFSC code"                                REQUEST_ERROR / GL-400-001
 *   - "You can next update your bank account on <date>." REQUEST_ERROR / GL-400-001
 *   - "Account verification failed, please check ..."    CONFIG_ERROR  / GL-201-020
 * The last one's reason code is in the 2xx family, so it may come back with a
 * 2xx HTTP status; the body's `status`, not the HTTP code, decides success.
 */
export interface SettlementUpdateResponse {
  message?: string;
  status?: string;
  reasonCode?: string;
}

export interface ContactData {
  phoneNumber?: string | null;
  emailId?: string | null;
}

export interface ContactDataResponse {
  data?: ContactData | null;
}

// ── Change email ─────────────────────────────────────────────────────────────

/** GlocalApiResponse — the app-wide envelope all six endpoints answer with, on
 *  success and on error alike.
 *
 *  `status` is Java's HttpStatus printed as text ("201 CREATED"), not a bare
 *  code — with one exception: step 4 overrides it to
 *  EMAIL_CHANGE_COMPLETED_STATUS on the success that commits the change.
 *  `reasonCode` is the app-wide "GL-201-001" constant on every success and
 *  carries no per-endpoint meaning. */
export interface ChangeEmailResponse {
  gid?: string;
  status?: string;
  message?: string;
  timestamp?: string;
  reasonCode?: string;
  data?: unknown;
  errors?: unknown;
}

/** What step 4 tells the dialog. `committed` is keyed off the response's
 *  EMAIL_CHANGE_COMPLETED status, the server's only confirmation that the email
 *  actually changed — a 2xx alone does not mean it did. */
export interface ChangeEmailCommit {
  message: string;
  committed: boolean;
}

/** What the dialog needs out of a failed call. The shared error handler rejects
 *  with the server envelope rather than an AxiosError, so the HTTP status is
 *  only available when the body carried it. */
export interface ChangeEmailFailure {
  message: string;
  status?: number;
}
