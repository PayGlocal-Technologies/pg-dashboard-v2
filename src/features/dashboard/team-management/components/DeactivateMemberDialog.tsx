"use client";

import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { TeamMemberRow } from "@/features/dashboard/team-management/types";

interface DeactivateMemberDialogProps {
  row: TeamMemberRow | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => void;
}

export function DeactivateMemberDialog({
  row,
  onOpenChange,
  onConfirm,
}: DeactivateMemberDialogProps) {
  return (
    <Dialog open={!!row} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-100 gap-0 p-0">
        {row && (
          <>
            <div className="flex items-start gap-3 px-6 py-5 pr-14">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Icon name="alert-triangle" size={16} aria-hidden />
              </span>
              <div>
                <DialogTitle>Deactivate team member?</DialogTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.firstName} {row.lastName} will immediately lose access to this account until
                  reactivated.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  onConfirm(row.id);
                  onOpenChange(false);
                }}
              >
                Deactivate user
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
