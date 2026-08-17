import { BASE_URL_V1, BASE_URL_V3 } from "@/api";

/**
 * Team / user-management endpoints, ported verbatim from pg-dashboard's
 * team-management feature (inline URLs in index.tsx and the component files —
 * the old feature had no services.ts).
 *
 * Merchant vs partner: merchants list users via the OpenSearch `/search/users`
 * endpoint; partner (reseller) users list via the IAM `/iam/users/<mid>`
 * endpoint. The old code picks the list at render time off `isPartnerUser` /
 * `isPartner`, see index.tsx.
 */

/** Merchant team list (OpenSearch). POST TableReqBody → { data: { headers, data } }. */
export const merchantTeamListApi = `${BASE_URL_V3}/search/users`;

/** Partner (reseller) team list. POST UserTableReqBody → { data: { listOfUsers } }. */
export const partnerTeamListApi = (mid: string): string => `${BASE_URL_V1}/iam/users/${mid}`;

/** Roles/departments for the invite + role dropdowns → { data: { roles } }. */
export const iamRolesApi = (mid: string, midType: string): string =>
  `${BASE_URL_V1}/iam/roles/role?mid=${mid}&midType=${midType}`;

/** Invite a teammate (creates a temp user). POST invite body. */
export const inviteTempUserApi = `${BASE_URL_V3}/iam/tempUsers`;

/** Resend the registration/verification link. POST { phoneNumber }. */
export const resendVerificationApi = `${BASE_URL_V1}/iam/tempUsers/resendVerificationEmail`;

/**
 * Activate or deactivate a user. PUT, empty body.
 * `action` is "activate" (reactivate) or "deactivate".
 */
export const activateDeactivateUserApi = (
  mid: string,
  action: "activate" | "deactivate",
  username: string
): string => `${BASE_URL_V1}/iam/users/${mid}/${action}/${username}`;

/** Set/edit a user's limited-time access window. PUT limited-time body. */
export const setLimitedTimeApi = (mid: string, username: string): string =>
  `${BASE_URL_V1}/iam/users/${mid}/activate-limit/${username}`;
