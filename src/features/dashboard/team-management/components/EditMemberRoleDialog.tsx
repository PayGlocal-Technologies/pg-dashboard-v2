"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { ROLE_OPTIONS } from "@/features/dashboard/team-management/constants";
import type { TeamMemberRole, TeamMemberRow } from "@/features/dashboard/team-management/types";

interface EditRoleFormProps {
  row: TeamMemberRow;
  onCancel: () => void;
  onSave: (id: string, role: TeamMemberRole) => void;
}

// Keyed by row.id in the parent so each member gets a fresh instance (and
// therefore a fresh `useState(() => row.role)` lazy initializer) instead of
// syncing local state from a prop change via an effect, see CLAUDE.md hooks
// purity rules.
function EditRoleForm({ row, onCancel, onSave }: EditRoleFormProps) {
  const [role, setRole] = useState<TeamMemberRole>(() => row.role);

  return (
    <>
      <div className="border-b border-border px-6 py-4 pr-14">
        <DialogTitle>Edit role</DialogTitle>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.firstName} {row.lastName} · {row.username}
        </p>
      </div>

      <div className="px-6 py-5">
        <Field>
          <FieldLabel htmlFor="edit-role">Role</FieldLabel>
          <Select value={role} onValueChange={(v) => setRole(v as TeamMemberRole)}>
            <SelectTrigger id="edit-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={() => onSave(row.id, role)}>
          Save changes
        </Button>
      </div>
    </>
  );
}

interface EditMemberRoleDialogProps {
  row: TeamMemberRow | null;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, role: TeamMemberRole) => void;
}

export function EditMemberRoleDialog({ row, onOpenChange, onSave }: EditMemberRoleDialogProps) {
  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0">
        {row && (
          <EditRoleForm
            key={row.id}
            row={row}
            onCancel={() => onOpenChange(false)}
            onSave={(id, nextRole) => {
              onSave(id, nextRole);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
