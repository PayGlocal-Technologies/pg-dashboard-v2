"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  DataCardList,
  DataTableCard,
  PageHeader,
  StatusBadge,
  type Column,
} from "@/components/ui";
import type { BadgeTrailIcon, BadgeVariant } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { FilterChipGroup, StatusFilterChip } from "@/components/common/filters/FilterChips";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import { CREATE_DEAL_PATH } from "@/features/dashboard/partner-deals/constants";
import { MOCK_DEALS } from "@/features/dashboard/partner-deals/mock-data";
import type { Deal, DealStatus } from "@/features/dashboard/partner-deals/types";

/**
 * DESIGN MOCK: the partner Deals list (Header's Partners tab), at
 * /partner-deals-dashboard, pg-dashboard's own path for it. Same page
 * anatomy as the other partner pages: PageHeader with the primary action,
 * one DataTableCard with the Status filter, a card list below lg.
 *
 * Runs on placeholder deals (mock-data.ts). TODO(integration): the partner
 * deals list endpoint, confirmed against pg-dashboard.
 */

const STATUS_META: Record<
  DealStatus,
  { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon }
> = {
  ACTIVE: { label: "Active", variant: "success", trailIcon: "check" },
  PENDING: { label: "Pending", variant: "warning", trailIcon: "clock" },
  INACTIVE: { label: "Inactive", variant: "muted" },
};

const STATUS_OPTIONS = (Object.keys(STATUS_META) as DealStatus[]).map((value) => ({
  value,
  label: STATUS_META[value].label,
}));

const COLUMNS: Column<Deal>[] = [
  {
    key: "dealId",
    header: "Deal ID",
    minWidth: 140,
    render: (row) => (
      <CopyableText value={row.dealId} valueClassName="font-mono text-[13px] text-foreground" />
    ),
  },
  {
    key: "onboardingId",
    header: "Onboarding ID",
    minWidth: 170,
    render: (row) => (
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">
        {row.onboardingId}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    minWidth: 130,
    render: (row) => {
      const { label, variant, trailIcon } = STATUS_META[row.status];
      return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
    },
  },
  {
    key: "createdAt",
    header: "Creation Time",
    minWidth: 170,
    render: (row) => (
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">
        {formatTransactionTimestamp(row.createdAt)}
      </span>
    ),
  },
];

function DealCard({ row }: { row: Deal }) {
  const { label, variant, trailIcon } = STATUS_META[row.status];
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[15px] font-semibold text-foreground">{row.dealId}</span>
        <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />
      </div>
      <p className="mt-1.5 text-[13px] text-muted-foreground">{row.onboardingId}</p>
      <p className="mt-2.5 text-[12px] text-muted-foreground">
        {formatTransactionTimestamp(row.createdAt)}
      </p>
    </div>
  );
}

export function PartnerDealsFeature() {
  const router = useRouter();
  const [statusFilters, setStatusFilters] = useState<string[]>([]);

  const rows = statusFilters.length
    ? MOCK_DEALS.filter((d) => statusFilters.includes(d.status))
    : MOCK_DEALS;

  const emptyCopy = statusFilters.length
    ? {
        title: "No deals with this status",
        description: "Clear the Status filter to see every deal.",
      }
    : {
        title: "Your deals will appear here",
        description: "Create a deal to set referral pricing for a merchant's onboarding link.",
      };

  // A function, not a shared element: desktop and compact both mount it,
  // and each needs its own FilterChipGroup (see McaTransactionTable).
  const renderStatusFilter = () => (
    <FilterChipGroup className="contents">
      <StatusFilterChip
        options={STATUS_OPTIONS}
        selected={statusFilters}
        onChange={setStatusFilters}
      />
    </FilterChipGroup>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <PageHeader
        title="Partner Deals"
        subtitle="Create and manage referral pricing deals."
        actions={
          <Button
            type="button"
            variant="primary"
            leftIcon={<Icon name="plus" className="h-4 w-4" />}
            onClick={() => router.push(CREATE_DEAL_PATH)}
          >
            Create Deal
          </Button>
        }
      />

      <DataTableCard<Deal>
        className="hidden lg:block"
        toolbar={<div className="flex items-center gap-2">{renderStatusFilter()}</div>}
        columns={COLUMNS}
        data={rows}
        isLoading={false}
        rowKey={(row) => row.dealId}
        emptyTitle={emptyCopy.title}
        emptyDescription={emptyCopy.description}
        emptyState={
          <PlaceholderState
            variant="no-transactions"
            title={emptyCopy.title}
            description={emptyCopy.description}
            className="py-16"
          />
        }
        maxBodyHeight="none"
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card lg:hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          {renderStatusFilter()}
        </div>
        <DataCardList<Deal>
          bordered={false}
          rows={rows}
          rowKey={(row) => row.dealId}
          isLoading={false}
          renderCard={(row) => <DealCard row={row} />}
          emptyState={
            <PlaceholderState
              variant="no-transactions"
              size="sm"
              title={emptyCopy.title}
              description={emptyCopy.description}
            />
          }
        />
      </div>
    </div>
  );
}
