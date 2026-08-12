import type { IconName } from "@/components/icon";
import type { TeamMemberRole } from "@/features/dashboard/team-management/types";

export const TEAM_MEMBERS_PAGE_LIMIT = 10;

export interface FilterOption {
  value: string;
  label: string;
}

// ── Status pills shown in the filter bar ─────────────────────────────────────
export const TEAM_STATUS_FILTERS: FilterOption[] = [
  { value: "All", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INVITE_SENT", label: "Invite Sent" },
  { value: "INACTIVE", label: "Inactive" },
];

export interface RoleMeta {
  label: string;
  icon: IconName;
  accentColor: string;
}

// Single source of truth for every role: the role filter, the table's role
// pill and the invite form's role select all read from this, so a role can
// never render two slightly different labels.
export const ROLE_META: Record<TeamMemberRole, RoleMeta> = {
  ADMIN: { label: "Admin", icon: "shield-check", accentColor: "var(--chart-1)" },
  VIEW_ONLY: { label: "View-only", icon: "eye", accentColor: "var(--chart-2)" },
};

export const ROLE_ORDER: TeamMemberRole[] = ["ADMIN", "VIEW_ONLY"];

export const ROLE_OPTIONS: FilterOption[] = ROLE_ORDER.map((value) => ({
  value,
  label: ROLE_META[value].label,
}));
