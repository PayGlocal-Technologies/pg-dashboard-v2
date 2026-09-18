import type { IconName } from "@/components/icon";
import type { RolesRecord } from "@/features/dashboard/team-management/types";

export const TEAM_MEMBERS_PAGE_LIMIT = 10;

export interface FilterOption {
  value: string;
  label: string;
}

// ── Status pills shown in the filter bar ─────────────────────────────────────
// Values match the real UserRecord.status enum (see types.ts).
export const TEAM_STATUS_FILTERS: FilterOption[] = [
  { value: "All", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "NOT_REGISTERED", label: "Invite Sent" },
  { value: "DEACTIVATED", label: "Deactivated" },
  // LOCKED filter out of scope for now — locked members still surface under All.
  // { value: "LOCKED", label: "Locked" },
];

export interface RoleMeta {
  label: string;
  icon: IconName;
  accentColor: string;
}

// Roles are dynamic (fetched from /gcc/v1/iam/roles/role), so there is no fixed
// map. A few well-known roles get a nicer label/icon; everything else falls
// back to a neutral badge with a humanised label via getRoleMeta().
const KNOWN_ROLE_META: Record<string, RoleMeta> = {
  ADMIN: { label: "Admin", icon: "shield-check", accentColor: "var(--chart-1)" },
  VIEW_ONLY: { label: "View-only", icon: "eye", accentColor: "var(--chart-2)" },
};

/** "MERCHANT_ADMIN" -> "Merchant admin". */
function humaniseRole(role: string): string {
  const spaced = role.replace(/_/g, " ").toLowerCase().trim();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : role;
}

export function getRoleMeta(role: string): RoleMeta {
  return (
    KNOWN_ROLE_META[role] ?? {
      label: humaniseRole(role),
      icon: "users",
      accentColor: "var(--chart-3)",
    }
  );
}

/** Build role filter options from the roles actually present in the current
 * team list (dynamic roles have no static universe). */
export function buildRoleOptions(roles: string[]): FilterOption[] {
  const unique = Array.from(new Set(roles.filter(Boolean)));
  return unique.map((value) => ({ value, label: getRoleMeta(value).label }));
}

/** Invite/department dropdown options from a fetched roles list. The old
 * dashboard shows `department` as the label and submits it as `department`,
 * looking up the matching role's `name` for the `role` field (see
 * InviteTeammates in pg-dashboard). */
export function buildDepartmentOptions(roles: RolesRecord[]): FilterOption[] {
  return roles.map((r) => ({ value: r.department, label: r.department }));
}
