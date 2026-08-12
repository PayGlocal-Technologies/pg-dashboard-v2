export type TeamMemberRole = "ADMIN" | "VIEW_ONLY";

export type TeamMemberStatus = "ACTIVE" | "INVITE_SENT" | "INACTIVE";

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
  whatsappEchoEnabled: boolean;
  /** ISO date string */
  invitedAt: string;
}
