/**
 * Partner > Merchants: the merchants a partner referred, through onboarding
 * to live.
 *
 * TODO(integration): there is no merchant-onboarding endpoint wired in v2
 * yet, so this feature runs on mock-data.ts. Confirm every field below
 * against pg-dashboard's My Merchants API before wiring it; the screens read
 * only the derived states in derive.ts, so the swap stays in one place.
 */

/** The onboarding status the existing Merchant Activation tabs key on.
 *  Kept as-is for compatibility; derive.ts maps it onto a lifecycle status
 *  and an attention state, which is what the screens show. */
export type RawOnboardingStatus =
  | "INVITED"
  | "UNDER_DEPENDENCY"
  | "VKYC_PENDING"
  | "UNDER_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "DEACTIVATED";

/** Where the merchant is in their life with PayGlocal. */
export type LifecycleStatus =
  "INVITED" | "ONBOARDING" | "UNDER_REVIEW" | "LIVE" | "REJECTED" | "DEACTIVATED";

/** Who has to do something next, independent of lifecycle status. */
export type AttentionOwner = "partner" | "merchant" | "payglocal";

export type MerchantProduct = "PG" | "MCA";

/** The five onboarding stages, in order. Requirements such as business
 *  details or the authorised signatory are steps inside a stage, not stages
 *  of their own. */
export type StageKey = "signup" | "business" | "account" | "verification" | "activation";

export type StageStatus = "done" | "current" | "blocked" | "pending";

export interface MerchantStage {
  key: StageKey;
  status: StageStatus;
  /** ISO timestamp, when a done stage completed. */
  completedAt?: string;
  /** What is outstanding inside a current/blocked stage, e.g. "GST
   *  certificate pending". */
  note?: string;
}

/** What the partner can do about the open item, if anything. */
export type MerchantActionKind = "send-reminder" | "complete-verification" | "resend-invite";

/** The one open item on a merchant, if any. */
export interface MerchantAttention {
  owner: AttentionOwner;
  title: string;
  description: string;
  /** ISO timestamp, since when it has been open. */
  since: string;
  action?: MerchantActionKind;
}

export type ActivityState = "completed" | "waiting" | "action" | "failed";

/** A meaningful event in the merchant's onboarding. System noise ("page
 *  visited", "process started") is not recorded here. */
export interface MerchantActivity {
  id: string;
  title: string;
  actor: "Merchant" | "You" | "PayGlocal";
  state: ActivityState;
  /** ISO timestamp. */
  at: string;
  note?: string;
}

export interface PartnerMerchant {
  onboardingId: string;
  /** Only once PayGlocal has created the merchant account (live or later). */
  merchantId?: string;
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  businessType?: string;
  products: MerchantProduct[];
  status: RawOnboardingStatus;
  /** Assisted onboarding is a mode (the partner fills the forms for the
   *  merchant), not a status. */
  assisted: boolean;
  referral: {
    type: "Referral link" | "Direct invite" | "Assisted onboarding";
    /** ISO timestamp. */
    date: string;
    link?: string;
  };
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
  stages: MerchantStage[];
  attention?: MerchantAttention;
  rejectionReason?: string;
  activity: MerchantActivity[];
}
