"use client";

import { useMemo, useState } from "react";
import type { QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, DataTableCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { FilterChipGroup } from "@/components/common/filters/FilterChips";
import { MultiSelectChipFilter } from "@/components/common/MultiSelectChipFilter";
import { RotatingSearchInput } from "@/components/common/RotatingSearchInput";
import { SegmentedTabs } from "@/components/common/SegmentedTabs";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { useApp } from "@/stores/useApp";
import { useUrlAction } from "@/lib/hooks/useUrlAction";
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

  // "Add team member" picked from the header search lands here as
  // ?action=add-member.
  //
  // Gated on isPartnerUser alone, and deliberately NOT on `mid` as well. Unlike
  // the MCA pages there is no MID *choice* to protect here — team membership is
  // always scoped to the profile MID (see above), never to a selected sub-MID —
  // so waiting on `mid` would add a race for no safety: the gate starts false
  // while the profile loads, and the modal only has to know the MID by the time
  // the form is submitted, which the prop below supplies.
  useUrlAction("add-member", () => setAddOpen(true), !isPartnerUser);

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

  // Status defaults to "All", so none of these count as narrowing until the
  // merchant changes one. Without this split, an account that had never
  // invited anyone was told to adjust filters it had never set.
  const hasNarrowingFilters = !!search.trim() || statusFilter !== "All" || !!roleFilter?.length;
  const emptyCopy = hasNarrowingFilters
    ? {
        title: "No matching team members",
        description: "Try a different search, or clear a filter to widen the results.",
      }
    : {
        title: "Invite your team to PayGlocal",
        description:
          "Add the people you work with and control what each of them can see and do in this account.",
      };

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

      <DataTableCard<TeamMemberRow>
        tabs={
          <SegmentedTabs
            options={TEAM_STATUS_FILTERS}
            value={statusFilter}
            onChange={onStatusFilter}
          />
        }
        toolbar={
          <div className="flex items-center gap-2.5 flex-wrap">
            <RotatingSearchInput
              value={search}
              onSearch={onSearch}
              words={["name", "username", "email"]}
              className="min-w-40 max-w-xs flex-1"
            />

            <div className="hidden sm:block h-4 w-px bg-border" />

            <FilterChipGroup className="flex items-center gap-2 flex-wrap">
              <MultiSelectChipFilter
                value={roleFilter}
                options={roleOptions}
                onChange={setRoleFilter}
                placeholder="Role"
              />
            </FilterChipGroup>
          </div>
        }
        errorState={
          isError ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
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
          ) : undefined
        }
        emptyState={
          <PlaceholderState
            variant="no-data"
            title={emptyCopy.title}
            description={emptyCopy.description}
            // Same guard the header's own button carries: a partner user, or
            // an account with no MID resolved, cannot add members, so the
            // empty state must not offer them an action that would fail.
            action={
              hasNarrowingFilters || !mid || isPartnerUser ? undefined : (
                <Button
                  variant="primary"
                  leftIcon={<Icon name="user-plus" className="h-3.5 w-3.5" />}
                  onClick={() => setAddOpen(true)}
                >
                  Add team member
                </Button>
              )
            }
            className="py-16"
          />
        }
        columns={teamMemberColumns}
        data={filteredRows}
        isLoading={isPending}
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        rowKey={(row) => row.id}
        pagination={{
          mode: "client",
          pageSize: TEAM_MEMBERS_PAGE_LIMIT,
        }}
        maxBodyHeight="none"
        rowAction={(row) => (
          <TeamMemberRowActions
            row={row}
            onDeactivate={setDeactivatingRow}
            onReactivate={reactivate}
            onResend={resend}
          />
        )}
      />

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
