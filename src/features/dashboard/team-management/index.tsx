"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, Card, DataTable, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MultiSelectChipFilter } from "@/components/common/MultiSelectChipFilter";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { teamMemberColumns } from "@/features/dashboard/team-management/columns";
import { TeamMemberRowActions } from "@/features/dashboard/team-management/components/TeamMemberRowActions";
import { AddTeamMemberModal } from "@/features/dashboard/team-management/components/AddTeamMemberModal";
import { EditMemberRoleDialog } from "@/features/dashboard/team-management/components/EditMemberRoleDialog";
import { DeactivateMemberDialog } from "@/features/dashboard/team-management/components/DeactivateMemberDialog";
import {
  ROLE_OPTIONS,
  TEAM_MEMBERS_PAGE_LIMIT,
  TEAM_STATUS_FILTERS,
} from "@/features/dashboard/team-management/constants";
import { teamMemberRows as initialTeamMemberRows } from "@/features/dashboard/team-management/mock-data";
import type { TeamMemberRole, TeamMemberRow } from "@/features/dashboard/team-management/types";

// TODO(integration): this screen is mock data only (see mock-data.ts). Wire it
// up to the real team/user-management endpoints per the CLAUDE.md migration
// checklist before shipping, endpoint URL, request payload and response
// statuses must all be copied from pg-dashboard, not guessed.

export function TeamManagementFeature() {
  // Held in state (not the plain mock-data export) so a newly invited member
  // actually shows up in the table and metrics, see AddTeamMemberModal.
  const [rows, setRows] = useState<TeamMemberRow[]>(initialTeamMemberRows);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState<string[] | undefined>(undefined);

  const [addOpen, setAddOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<TeamMemberRow | null>(null);
  const [deactivatingRow, setDeactivatingRow] = useState<TeamMemberRow | null>(null);

  const onSearch = (v: string) => setSearch(v);
  const onStatusFilter = (v: string) => setStatusFilter(v);
  const onClear = () => {
    setSearch("");
    setStatusFilter("All");
    setRoleFilter(undefined);
  };
  const hasActive = search !== "" || statusFilter !== "All" || !!roleFilter?.length;

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter !== "All" && row.status !== statusFilter) return false;
      if (roleFilter && !roleFilter.includes(row.role)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          `${row.firstName} ${row.lastName}`.toLowerCase().includes(q) ||
          row.username.toLowerCase().includes(q) ||
          row.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [rows, search, statusFilter, roleFilter]);

  function handleInvited(row: TeamMemberRow) {
    setRows((prev) => [row, ...prev]);
    toast.success("Invite sent");
  }

  function handleSaveRole(id: string, role: TeamMemberRole) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, role } : row)));
    toast.success("Role updated");
  }

  function handleDeactivate(id: string) {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, status: "INACTIVE" } : row)));
    toast.success("Team member deactivated");
  }

  const columns = teamMemberColumns;

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden">
      <PageHeader
        title="Team Management"
        subtitle={`${rows.length} Members`}
        actions={
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Icon name="user-plus" className="h-3.5 w-3.5" />}
            onClick={() => setAddOpen(true)}
          >
            Add Team Member
          </Button>
        }
      />

      {/* Single cohesive card: title, status tabs, then the filter bar, all
       * sharing one border/rounded container, the table sits directly
       * beneath with only a top border, same hierarchy as the Transactions,
       * Settlement Reports and Payment Links tables. */}
      <Card className="gap-0 overflow-hidden p-0">
        <div className="pl-5 pr-3 pb-3 pt-5">
          <div className="space-y-3">
            <SegmentedTabs options={TEAM_STATUS_FILTERS} value={statusFilter} onChange={onStatusFilter} />

            {/* Thin top divider separates the filter bar from the tabs
             * above instead of its own bordered/boxed container. */}
            <div className="border-t border-border pt-3 flex items-center gap-2.5 flex-wrap">
              <RotatingSearchInput
                value={search}
                onSearch={onSearch}
                words={["name", "username", "email"]}
                className="min-w-40 max-w-xs flex-1"
              />

              <div className="hidden sm:block h-4 w-px bg-border" />

              <div className="flex items-center gap-2 flex-wrap">
                <MultiSelectChipFilter
                  value={roleFilter}
                  options={ROLE_OPTIONS}
                  onChange={setRoleFilter}
                  placeholder="Role"
                />
              </div>

              {hasActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Icon name="x" className="w-3 h-3" />}
                  onClick={onClear}
                  className="ml-auto text-muted-foreground hover:text-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredRows}
          emptyTitle="No team members found"
          emptyDescription="Try adjusting your filters or search query"
          rowKey={(row) => row.id}
          pageSize={TEAM_MEMBERS_PAGE_LIMIT}
          density="compact"
          tableLayout="content"
          className="rounded-none border-0 border-t border-border"
          rowAction={(row) => (
            <TeamMemberRowActions row={row} onEditRole={setEditingRow} onDeactivate={setDeactivatingRow} />
          )}
        />
      </Card>

      <AddTeamMemberModal open={addOpen} onOpenChange={setAddOpen} onInvited={handleInvited} />
      <EditMemberRoleDialog
        row={editingRow}
        onOpenChange={(open) => !open && setEditingRow(null)}
        onSave={handleSaveRole}
      />
      <DeactivateMemberDialog
        row={deactivatingRow}
        onOpenChange={(open) => !open && setDeactivatingRow(null)}
        onConfirm={handleDeactivate}
      />
    </div>
  );
}
