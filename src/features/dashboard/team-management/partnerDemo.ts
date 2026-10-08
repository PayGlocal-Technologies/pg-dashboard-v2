import type { RolesRecord, TeamMemberRow } from "@/features/dashboard/team-management/types";

/**
 * DESIGN MOCK for Partners → Team Management: a reseller's team, in the shape
 * pg-dashboard's partner team table shows (Name and email, Username, Role,
 * Merchant ID, Status, Phone). People, emails, numbers and the MID are
 * placeholders, never real users.
 *
 * TODO(integration): a partner account reads its team from
 * partnerTeamListApi (see services.ts, and TeamManagementFeature's live
 * mode). The partner invite contract still has to be confirmed against
 * pg-dashboard before inviting is enabled there.
 */

export const PARTNER_DEMO_MID = "reseller_demo_mid";

const member = (
  id: string,
  firstName: string,
  lastName: string,
  username: string,
  status: TeamMemberRow["status"],
  phone: string,
  role = "RESELLER_ADMIN"
): TeamMemberRow => ({
  id,
  firstName,
  lastName,
  username,
  role,
  merchantId: PARTNER_DEMO_MID,
  status,
  phoneCountryCode: "+91",
  phone,
  email: `${username}@example.com`,
  whatsappEchoEnabled: false,
  invitedAt: "",
});

export const PARTNER_DEMO_TEAM: TeamMemberRow[] = [
  member("p1", "Ananya", "Menon", "ananya.reseller", "ACTIVE", "90000 00011"),
  member("p2", "Arjun", "Rao", "arjun.reseller", "ACTIVE", "90000 00012"),
  member("p3", "Bhavna", "Verma", "bhavna.reseller", "ACTIVE", "90000 00013"),
  member("p4", "Ishaan", "Shah", "ishaan.ops", "ACTIVE", "90000 00014", "RESELLER_OPERATIONS"),
  member("p5", "Jaya", "Kapoor", "jaya.reseller", "ACTIVE", "90000 00015"),
  member("p6", "Kabir", "Malhotra", "kabir.finance", "ACTIVE", "90000 00016", "RESELLER_FINANCE"),
  member("p7", "Meera", "Joshi", "meera.reseller", "NOT_REGISTERED", "90000 00017"),
  member("p8", "Rohan", "Das", "rohan.viewer", "ACTIVE", "90000 00018", "RESELLER_VIEW_ONLY"),
  member("p9", "Tara", "Nair", "tara.reseller", "DEACTIVATED", "90000 00019"),
];

/** The departments the invite form offers, each with the role it grants. */
export const PARTNER_DEMO_ROLES: RolesRecord[] = [
  ["Admin", "RESELLER_ADMIN"],
  ["Operations", "RESELLER_OPERATIONS"],
  ["Finance", "RESELLER_FINANCE"],
  ["View only", "RESELLER_VIEW_ONLY"],
].map(([department, name]) => ({
  identifier: name!,
  name: name!,
  midType: "PARTNER",
  mid: PARTNER_DEMO_MID,
  department: department!,
  roleType: "CUSTOM",
  status: "ACTIVE",
  creationTime: "",
  formattedCreationTime: null,
  updationTime: "",
  formattedUpdationTime: "",
  statusUpdationTime: "",
  statusMidTypeUpdationTime: "",
  midUpdationTime: "",
  usernameUpdationTime: null,
  phoneNumber: null,
}));
