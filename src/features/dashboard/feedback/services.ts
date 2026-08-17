import { BASE_URL_V3 } from "@/api";

// The product feedback survey. Not tied to any feature — "GENERAL" is the
// only type the API accepts, and the questions are about the product as a
// whole, which is why this lives outside features/dashboard.

export const feedbackApi = `${BASE_URL_V3}/feedback`;

/** Asked before showing the prompt: the server decides whether this user is
 *  due one, so a merchant isn't surveyed on every visit. */
export const feedbackEligibilityApi = `${BASE_URL_V3}/feedback/eligibility`;

/** Records that the prompt was shown — sent whether the merchant submitted or
 *  dismissed it, so eligibility stops returning true. */
export const feedbackShownApi = `${BASE_URL_V3}/feedback/shown`;
