"use client";

import type { TeamMemberRole, TeamMemberRow } from "@/features/dashboard/team-management/types";

// BACKEND GAP: there is NO per-user role-change endpoint in pg-dashboard's
// team-management. Role definitions are managed in a separate role-management
// feature, and the old "switch role" drawer only flips an internal
// userCreationType flag (GLOCAL-admin only), not a member's role. Per the
// migration decision this dialog is HIDDEN until a real role-update endpoint
// exists. The component is kept as a stub (not rendered anywhere) so the wiring
// point is preserved for whenever that endpoint lands.

export interface EditMemberRoleDialogProps {
  row: TeamMemberRow | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, role: TeamMemberRole) => void;
}

export function EditMemberRoleDialog(): null {
  return null;
}
