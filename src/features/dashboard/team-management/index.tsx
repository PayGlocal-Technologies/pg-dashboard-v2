"use client";

import { useMemo, useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, Card, DataTable, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MultiSelectChipFilter } from "@/components/common/MultiSelectChipFilter";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { useApp } from "@/stores/useApp";
import { usePost, usePostQuery, usePut } from "@/lib/api/hooks";
import { teamMemberColumns } from "@/features/dashboard/team-management/columns";
import { TeamMemberRowActions } from "@/features/dashboard/team-management/components/TeamMemberRowActions";
import { AddTeamMemberModal } from "@/features/dashboard/team-management/components/AddTeamMemberModal";
import { DeactivateMemberDialog } from "@/features/dashboard/team-management/components/DeactivateMemberDialog";
// OUT OF SCOPE — limited-time access not required for now. Component kept.
// import { LimitedTimeAccessDrawer } from "@/features/dashboard/team-management/components/LimitedTimeAccessDrawer";
import {
  buildRoleOptions,
  TEAM_MEMBERS_PAGE_LIMIT,
  TEAM_STATUS_FILTERS,
} from "@/features/dashboard/team-management/constants";
import {
  activateDeactivateUserApi,
  merchantTeamListApi,
  partnerTeamListApi,
  resendVerificationApi,
} from "@/features/dashboard/team-management/services";
import {
  mapPartnerRecordToRow,
  mapUserRecordToRow,
} from "@/features/dashboard/team-management/helper";
import type {
  MerchantTeamResponse,
  PartnerTeamResponse,
  TeamMemberRow,
  UserTableReqBody,
} from "@/features/dashboard/team-management/types";
import type { TableReqBody } from "@/types/transactions";

export function TeamManagementFeature() {
  const isPartnerUser = useApp((s) => s.isPartnerUser);
  const isGuestUser = useApp((s) => s.isGuestUser);
  const profile = useApp((s) => s.profile);

  // Team management is always scoped to the profile MID — the account the
  // signed-in user belongs to — never to a selected sub-MID and never to the
  // UCIC id. Team membership is a property of that account, so it does not
  // follow the header's merchant selection the way the reporting pages do.
  const mid = profile?.mid ?? "";
  const midType = profile?.midType ?? "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState<string[] | undefined>(undefined);

  const [addOpen, setAddOpen] = useState(false);
  const [deactivatingRow, setDeactivatingRow] = useState<TeamMemberRow | null>(null);
  // OUT OF SCOPE — limited-time access not required for now.
  // const [limitedTimeRow, setLimitedTimeRow] = useState<TeamMemberRow | null>(null);

  const enabled = !!mid && !isGuestUser;
  const invalidateKey: QueryKey[] = isPartnerUser ? [["team-partner"]] : [["team-merchant"]];

  // ── Merchant team (OpenSearch /search/users) ────────────────────────────────
  const merchantBody: TableReqBody = {
    pageLimit: TEAM_MEMBERS_PAGE_LIMIT,
    from: 0,
    searchFilterType: mid ? "FILTER_TYPE" : "DEFAULT",
    ...(mid ? { fieldSearch: { mid: [mid] } } : {}),
  };
  const merchantQuery = usePostQuery<MerchantTeamResponse, TableReqBody>(
    ["team-merchant", mid],
    merchantTeamListApi,
    merchantBody,
    undefined,
    !isPartnerUser && enabled
  );

  // ── Partner team (IAM /iam/users/<mid>) ──────────────────────────────────────
  const partnerBody: UserTableReqBody = {
    ascending: true,
    pageLimit: 25,
    exclusiveStartKey: null,
    userViewFilter: "DEFAULT",
    midType: "GLOCAL",
    from: 0,
  };
  const partnerQuery = usePostQuery<PartnerTeamResponse, UserTableReqBody>(
    ["team-partner", mid],
    partnerTeamListApi(mid),
    partnerBody,
    undefined,
    isPartnerUser && enabled
  );

  const rows: TeamMemberRow[] = useMemo(() => {
    if (isPartnerUser) {
      return (partnerQuery.data?.data?.listOfUsers ?? []).map(mapPartnerRecordToRow);
    }
    return (merchantQuery.data?.data?.data ?? []).map(mapUserRecordToRow);
  }, [isPartnerUser, merchantQuery.data, partnerQuery.data]);

  const isPending = isPartnerUser ? partnerQuery.isPending : merchantQuery.isPending;
  const isError = isPartnerUser ? partnerQuery.isError : merchantQuery.isError;
  const refetch = isPartnerUser ? partnerQuery.refetch : merchantQuery.refetch;

  // Role filter options come from the roles actually present in the list
  // (roles are dynamic — there is no static universe).
  const roleOptions = useMemo(() => buildRoleOptions(rows.map((r) => r.role)), [rows]);

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

  // ── Mutations ────────────────────────────────────────────────────────────────
  const { mutate: activateDeactivate } = usePut<unknown, { dynamicUrl: string }>("", {
    invalidateQueries: invalidateKey,
  });
  const { mutate: resendLink } = usePost<unknown, { phoneNumber: string }>(resendVerificationApi);

  function confirmDeactivate() {
    const row = deactivatingRow;
    if (!row) return;
    activateDeactivate(
      { dynamicUrl: activateDeactivateUserApi(row.merchantId, "deactivate", row.username) },
      {
        onSuccess: () => toast.success("Team member deactivated"),
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function reactivate(row: TeamMemberRow) {
    activateDeactivate(
      { dynamicUrl: activateDeactivateUserApi(row.merchantId, "activate", row.username) },
      {
        onSuccess: () => toast.success("Team member reactivated"),
        onError: (error) => toast.error(error.message),
      }
    );
  }

  function resend(row: TeamMemberRow) {
    resendLink(
      { phoneNumber: `${row.phoneCountryCode}${row.phone}` },
      {
        onSuccess: () => toast.success("Registration link resent"),
        onError: (error) => toast.error(error.message),
      }
    );
  }

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
            disabled={!mid || isPartnerUser}
          >
            Add Team Member
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden p-0">
        <div className="pl-5 pr-3 pb-3 pt-5">
          <div className="space-y-3">
            <SegmentedTabs
              options={TEAM_STATUS_FILTERS}
              value={statusFilter}
              onChange={onStatusFilter}
            />

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
                  options={roleOptions}
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

        {isError ? (
          <div className="flex flex-col items-center gap-3 border-t border-border p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-600">
              <Icon name="alert-circle" size={22} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Couldn&apos;t load team members
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Something went wrong while fetching data.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </div>
        ) : !isPending && filteredRows.length === 0 ? (
          <PlaceholderState
            variant="no-data"
            title="No team members found"
            description="Try adjusting your filters or search query"
            className="border-t border-border py-16"
          />
        ) : (
          <DataTable
            columns={teamMemberColumns}
            data={filteredRows}
            isLoading={isPending}
            skeletonRows={8}
            emptyTitle="No team members found"
            emptyDescription="Try adjusting your filters or search query"
            rowKey={(row) => row.id}
            pageSize={TEAM_MEMBERS_PAGE_LIMIT}
            density="compact"
            tableLayout="content"
            className="rounded-none border-0 border-t border-border"
            rowAction={(row) => (
              <TeamMemberRowActions
                row={row}
                onDeactivate={setDeactivatingRow}
                onReactivate={reactivate}
                onResend={resend}
              />
            )}
          />
        )}
      </Card>

      <AddTeamMemberModal
        open={addOpen}
        onOpenChange={setAddOpen}
        mid={mid}
        midType={midType}
        invalidateKey={invalidateKey}
      />
      <DeactivateMemberDialog
        row={deactivatingRow}
        onOpenChange={(open) => !open && setDeactivatingRow(null)}
        onConfirm={() => confirmDeactivate()}
      />
      {/* OUT OF SCOPE — limited-time access not required for now. Restore this
          drawer, the limitedTimeRow state, the import, and the onSetLimitedTime
          wiring in TeamMemberRowActions to re-enable.
      <LimitedTimeAccessDrawer
        row={limitedTimeRow}
        onOpenChange={(open) => !open && setLimitedTimeRow(null)}
        invalidateKey={invalidateKey}
      /> */}
    </div>
  );
}
