// Real roles are dynamic strings fetched from /gcc/v1/iam/roles/role — there
// is no fixed two-value union on the backend (see RolesRecord below). The old
// "ADMIN" | "VIEW_ONLY" literals are gone; role is now an opaque identifier
// string and ROLE_META/columns look it up defensively.
export type TeamMemberRole = string;

// Matches the real UserRecord.status values from the backend. The old v2 mock
// enum ("INVITE_SENT" / "INACTIVE") maps onto these: INVITE_SENT →
// NOT_REGISTERED, INACTIVE → DEACTIVATED.
export type TeamMemberStatus = "ACTIVE" | "DEACTIVATED" | "LOCKED" | "NOT_REGISTERED";

export interface TeamMemberRow {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  role: TeamMemberRole;
  merchantId: string;
  status: TeamMemberStatus;
  phoneCountryCode: string;
  phone: string;
  email: string;
  // BACKEND GAP: whatsappEchoEnabled has no field in the real user record; it
  // is a v2-only UI concept. Defaulted to false by the mappers.
  whatsappEchoEnabled: boolean;
  /** ISO date string (mapped from the record's creationTime). */
  invitedAt: string;
  /** True when the user is on a time-boxed access window. */
  limitedTimeAccessUser?: boolean;
  /** ISO date string when limited-time access expires, null otherwise. */
  userExpiryDate?: string | null;
  /** Pre-formatted expiry label from the backend, when present. */
  formattedUserExpiryDate?: string | null;
  /** Role's department string (drives the invite/role dropdowns). */
  department?: string | null;
}

// ── Real API contracts (ported verbatim from pg-dashboard team-management) ───

/** Merchant team member (from POST /gcc/v3/search/users). */
export interface UserRecord {
  username: string;
  ucicId: string | null;
  department: string | null;
  emailId: string;
  firstName: string;
  lastName: string;
  limitedTimeAccessUser: boolean;
  mid: string;
  midType: string;
  phoneNumber: string;
  regionCode: string;
  creationTime: string;
  role: string;
  status: TeamMemberStatus;
  userCreationType: string;
  userExpiryDate: string | null;
  formattedUserExpiryDate: string | null;
}

/** Partner (reseller) team member (from POST /gcc/v1/iam/users/<mid>). */
export interface PartnerTeamUserRecord {
  bankName: string | null;
  createdBy: string | null;
  creationDate: string | null;
  emailId: string;
  firstName: string;
  formattedUserExpiryDate: string | null;
  lastLoginDate: string;
  lastName: string;
  limitedTimeAccessUser: boolean;
  mid: string;
  onboardingId: string | null;
  passwordUpdateDate: string;
  phoneNumber: string;
  regionCode: string;
  role: string;
  status: string;
  userExpiryDate: string | null;
  userExpiryDuration: string | null;
  username: string;
}

/** A role/department entry from GET /gcc/v1/iam/roles/role. */
export interface RolesRecord {
  identifier: string;
  name: string;
  midType: string;
  mid: string;
  department: string;
  roleType: string;
  status: string;
  creationTime: string;
  formattedCreationTime: string | null;
  updationTime: string;
  formattedUpdationTime: string;
  statusUpdationTime: string;
  statusMidTypeUpdationTime: string;
  midUpdationTime: string;
  usernameUpdationTime: string | null;
  phoneNumber: string | null;
}

export interface MerchantTeamResponse {
  status?: string;
  message?: string;
  data: {
    headers: string[];
    data: UserRecord[];
    totalCount?: number;
  };
}

export interface PartnerTeamResponse {
  status?: string;
  message?: string;
  data: {
    lastEvaluatedKey: object | null;
    listOfUsers: PartnerTeamUserRecord[];
    totalCount?: number;
  };
}

export interface RolesResponse {
  data: {
    roles: RolesRecord[];
  };
}

/** Request body for the partner list endpoint (DynamoDB-style pagination). */
export interface UserTableReqBody {
  ascending: boolean;
  midType?: string;
  pageLimit?: number;
  role?: string | null;
  userViewFilter: string;
  exclusiveStartKey: object | null;
  from?: number;
}

/** Request body for the invite (temp user) endpoint. */
export interface InviteTempUserBody {
  firstName: string;
  lastName: string;
  emailId: string;
  regionCode: string;
  phoneNumber: string;
  department: string;
  newMid: false;
  limitedTimeAccessUser: boolean;
  midType: string;
  role: string;
  userName: string;
  parentMid: string;
  mid: string;
  limitedTimeAccessHours: number | false;
  limitedTimeAccessMinutes: number | false;
}
