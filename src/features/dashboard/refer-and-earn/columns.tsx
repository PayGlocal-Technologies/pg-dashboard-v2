"use client";

import { type Column, StatusBadge } from "@/components/ui";
import type { BadgeTrailIcon, BadgeVariant } from "@payglocal_ui/flux-ui";
import { formatCurrency } from "@/lib/utils/format";
import type { Referral, ReferralStatus } from "@/features/dashboard/refer-and-earn/types";

// ── Status mapping: raw value → display meta ─────────────────────────────────
// Same shape as MCA Links' MCA_LINK_STATUS_META, so every table in the
// dashboard builds its chips from one component and one vocabulary of variants.
type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

const REFERRAL_STATUS_META: Record<ReferralStatus, StatusMeta> = {
  PENDING: { label: "Pending", variant: "warning", trailIcon: "clock" },
  ACTIVATED: { label: "Activated", variant: "info", trailIcon: "check" },
  REWARD_EARNED: { label: "Reward earned", variant: "success", trailIcon: "check" },
};

export function getReferralStatusMeta(raw: string): StatusMeta {
  return (
    REFERRAL_STATUS_META[raw as ReferralStatus] ?? {
      label: raw.replace(/_/g, " ").toLowerCase(),
      variant: "muted",
    }
  );
}

/**
 * The reward, or a dash while it is still unearned — a zero amount would read
 * as "this referral earned nothing" rather than "not yet".
 */
export function formatReferralReward(row: Referral): string {
  if (row.rewardAmount == null) return "—";
  return formatCurrency(parseFloat(row.rewardAmount), row.rewardCurrency, "en-US");
}

// ── Column definitions ───────────────────────────────────────────────────────
// The table renders with tableLayout="content", so every column sizes to its own
// content and the table ends after the last one — no `minWidth`/`maxWidth` hints
// here, since those only feed the `fixed` layout's colgroup and would be dead
// config in this mode. The two free-text columns instead cap themselves with a
// max-width on their block-level cell content, which is what actually bounds a
// column under the automatic table algorithm: a long name or address truncates
// rather than stretching the whole table.
export function buildReferralColumns(): Column<Referral>[] {
  return [
    {
      key: "fullName",
      header: "Full name",
      render: (row) => (
        <span className="block max-w-[16rem] truncate text-[13px] font-medium text-foreground">
          {row.fullName}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const { label, variant, trailIcon } = getReferralStatusMeta(row.status);
        return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
      },
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (row) => (
        <span
          className={
            row.rewardAmount == null
              ? "text-[13px] tabular-nums text-muted-foreground"
              : "text-[13px] font-semibold tabular-nums text-foreground"
          }
        >
          {formatReferralReward(row)}
        </span>
      ),
    },
    {
      key: "emailId",
      header: "Email ID",
      render: (row) => (
        <span className="block max-w-[22rem] truncate text-[13px] text-muted-foreground">
          {row.emailId}
        </span>
      ),
    },
  ];
}
