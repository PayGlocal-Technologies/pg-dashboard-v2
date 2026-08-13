/** "GENERAL" is the only survey type the API accepts. */
export interface FeedbackTypePayload {
  type: "GENERAL";
}

export interface FeedbackPayload extends FeedbackTypePayload {
  rating: number;
  freeText: string;
  expectations: string;
}

export interface FeedbackEligibilityResponse {
  data: {
    eligibility: {
      eligible: boolean;
    };
  };
}
