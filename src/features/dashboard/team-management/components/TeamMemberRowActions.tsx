"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import type { TeamMemberRow } from "@/features/dashboard/team-management/types";

interface TeamMemberRowActionsProps {
  row: TeamMemberRow;
  onDeactivate: (row: TeamMemberRow) => void;
  onReactivate: (row: TeamMemberRow) => void;
  onResend: (row: TeamMemberRow) => void;
  onSetLimitedTime: (row: TeamMemberRow) => void;
}

// Menu items switch on the member's status, mirroring pg-dashboard's
// TEAM_MANAGEMENT_COLS action list:
//   ACTIVE / LOCKED   → Set/Edit limited time, Deactivate
//   DEACTIVATED       → Reactivate
//   NOT_REGISTERED    → Resend registration link
// (Edit role is intentionally absent — the old dashboard has no per-user
// role-change endpoint; see EditMemberRoleDialog's BACKEND GAP note.)
export function TeamMemberRowActions({
  row,
  onDeactivate,
  onReactivate,
  onResend,
  onSetLimitedTime,
}: TeamMemberRowActionsProps) {
  const isActive = row.status === "ACTIVE" || row.status === "LOCKED";
  const isDeactivated = row.status === "DEACTIVATED";
  const isNotRegistered = row.status === "NOT_REGISTERED";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Actions for ${row.firstName} ${row.lastName}`}
          className="h-7 w-7 min-h-0 min-w-0 rounded-md p-0"
        >
          <Icon name="more-horizontal" className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isActive && (
          <>
            <DropdownMenuItem onClick={() => onSetLimitedTime(row)}>
              <Icon name="clock" className="h-3.5 w-3.5" />
              {row.limitedTimeAccessUser ? "Edit limited time" : "Set limited time"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDeactivate(row)}>
              <Icon name="ban" className="h-3.5 w-3.5" />
              Deactivate user
            </DropdownMenuItem>
          </>
        )}
        {isDeactivated && (
          <DropdownMenuItem onClick={() => onReactivate(row)}>
            <Icon name="check" className="h-3.5 w-3.5" />
            Reactivate user
          </DropdownMenuItem>
        )}
        {isNotRegistered && (
          <DropdownMenuItem onClick={() => onResend(row)}>
            <Icon name="send-horizontal" className="h-3.5 w-3.5" />
            Resend registration link
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
