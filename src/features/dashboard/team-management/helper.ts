import type {
  PartnerTeamUserRecord,
  TeamMemberRow,
  TeamMemberStatus,
  UserRecord,
} from "@/features/dashboard/team-management/types";

const KNOWN_STATUSES: TeamMemberStatus[] = ["ACTIVE", "DEACTIVATED", "LOCKED", "NOT_REGISTERED"];

/** Coerce a backend status string to a known TeamMemberStatus, defaulting to
 * DEACTIVATED for anything unrecognised so the row still renders a valid pill. */
function coerceStatus(status: string): TeamMemberStatus {
  return (KNOWN_STATUSES as string[]).includes(status)
    ? (status as TeamMemberStatus)
    : "DEACTIVATED";
}

/** Maps a merchant UserRecord onto the table's TeamMemberRow. `username` is the
 * stable row id (unique within a merchant's team). */
export function mapUserRecordToRow(record: UserRecord): TeamMemberRow {
  return {
    id: record.username,
    firstName: record.firstName,
    lastName: record.lastName,
    username: record.username,
    role: record.role,
    merchantId: record.mid,
    status: record.status,
    phoneCountryCode: record.regionCode,
    phone: record.phoneNumber,
    email: record.emailId,
    // BACKEND GAP: whatsappEchoEnabled has no source field.
    whatsappEchoEnabled: false,
    invitedAt: record.creationTime,
    limitedTimeAccessUser: record.limitedTimeAccessUser,
    userExpiryDate: record.userExpiryDate,
    formattedUserExpiryDate: record.formattedUserExpiryDate,
    department: record.department,
  };
}

/** Maps a partner (reseller) team record onto TeamMemberRow. */
export function mapPartnerRecordToRow(record: PartnerTeamUserRecord): TeamMemberRow {
  return {
    id: record.username,
    firstName: record.firstName,
    lastName: record.lastName,
    username: record.username,
    role: record.role,
    merchantId: record.mid,
    status: coerceStatus(record.status),
    phoneCountryCode: record.regionCode,
    phone: record.phoneNumber,
    email: record.emailId,
    whatsappEchoEnabled: false,
    invitedAt: record.creationDate ?? "",
    limitedTimeAccessUser: record.limitedTimeAccessUser,
    userExpiryDate: record.userExpiryDate,
    formattedUserExpiryDate: record.formattedUserExpiryDate,
    // Partner records carry no department string.
    department: null,
  };
}
