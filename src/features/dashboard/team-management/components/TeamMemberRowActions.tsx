"use client";

import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { TeamMemberRow } from "@/features/dashboard/team-management/types";

interface TeamMemberRowActionsProps {
  row: TeamMemberRow;
  onEditRole: (row: TeamMemberRow) => void;
  onDeactivate: (row: TeamMemberRow) => void;
}

export function TeamMemberRowActions({ row, onEditRole, onDeactivate }: TeamMemberRowActionsProps) {
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
        <DropdownMenuItem onClick={() => onEditRole(row)}>
          <Icon name="pencil" className="h-3.5 w-3.5" />
          Edit role
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDeactivate(row)}>
          <Icon name="ban" className="h-3.5 w-3.5" />
          Deactivate user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
