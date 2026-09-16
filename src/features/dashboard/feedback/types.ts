/**
 * Survey types POST /gcc/v3/feedback accepts.
 *
 * - `GENERAL` is the periodic product survey (FeedbackSheet), which carries a
 *   rating on the API's 1-based scale.
 * - `SWITCH_BACK_TO_OLD_VIEW` is the two-question ask on the way out to
 *   pg-dashboard (SwitchToOldViewButton). It has NO rating: nothing in that
 *   flow scores anything, and the contract does not carry the field.
 */
export type FeedbackType = "GENERAL" | "SWITCH_BACK_TO_OLD_VIEW";

/** Eligibility and "shown" key off the survey type alone, and only the
 *  periodic GENERAL survey is gated that way — the switch-back ask is shown
 *  whenever the merchant opens the popover, so it asks neither. */
export interface FeedbackTypePayload {
  type: "GENERAL";
}

/** The periodic product survey's submission. */
export interface GeneralFeedbackPayload {
  type: "GENERAL";
  rating: number;
  freeText: string;
  expectations: string;
}

/**
 * "Switch to old view" feedback.
 *
 * `freeText` is what is making the merchant switch back, `expectations` is what
 * they would like fixed or added. Both are sent as the merchant typed them,
 * trimmed; neither is required by the contract, so an empty string is a valid
 * submission for a merchant who skipped a question but still pressed send.
 */
export interface SwitchBackFeedbackPayload {
  type: "SWITCH_BACK_TO_OLD_VIEW";
  freeText: string;
  expectations: string;
}

/** Either submission — both go to the same endpoint, discriminated by `type`.
 *  The union is what stops a rating riding along with the switch-back ask. */
export type FeedbackPayload = GeneralFeedbackPayload | SwitchBackFeedbackPayload;

/**
 * What the endpoint returns on a successful submission. `data` is always null:
 * the feedback itself is the whole point, and the only thing worth keeping is
 * `gid`, the reference a support conversation would quote.
 */
export interface FeedbackSubmitResponse {
  gid?: string;
  status?: string;
  message?: string;
  reasonCode?: string;
  timestamp?: string;
  data?: null;
  errors?: unknown;
}

export interface FeedbackEligibilityResponse {
  data: {
    eligibility: {
      eligible: boolean;
    };
  };
}
