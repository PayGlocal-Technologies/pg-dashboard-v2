"use client";

import { type Column, StatusBadge } from "@/components/ui";
import type { BadgeTrailIcon, BadgeVariant } from "@payglocal_ui/flux-ui";
import { formatCurrency, formatEpochDate } from "@/lib/utils/format";
import type {
  Referral,
  ReferralRedemption,
  ReferralStatus,
} from "@/features/dashboard/refer-and-earn/types";

// ── Status mapping: raw value → display meta ─────────────────────────────────
// Same shape as MCA Links' MCA_LINK_STATUS_META, so every table in the
// dashboard builds its chips from one component and one vocabulary of variants.
type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

// Four stored statuses, three chips. Pending and Activated are both stages
// before the qualifying transaction, so they share the "In progress" chip: the
// column then speaks exactly the vocabulary the analytics row above it is
// counted in — In progress, Completed, Waived — and a row's chip can never
// disagree with the bucket its figure landed in. Waived is its own terminal
// state rather than a shade of Completed, because the merchant is looking for
// which rewards have actually come off their MDR.
const REFERRAL_STATUS_META: Record<ReferralStatus, StatusMeta> = {
  PENDING: { label: "In progress", variant: "warning", trailIcon: "clock" },
  ACTIVATED: { label: "In progress", variant: "warning", trailIcon: "clock" },
  REWARD_EARNED: { label: "Completed", variant: "success", trailIcon: "check" },
  WAIVED: { label: "Waived", variant: "info", trailIcon: "check" },
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
 * The reward this referral accrued. Always a figure, never a dash: the credit
 * carries its full amount from the moment it is minted, and `isRewardReleased`
 * below is what distinguishes money already available from money still held.
 */
export function formatReferralReward(row: Referral): string {
  return formatCurrency(parseFloat(row.rewardAmount), row.rewardCurrency, "en-US");
}

/**
 * Whether the reward has actually been released to the wallet, which is what
 * decides whether the figure is set solid or greyed back. A held reward is real
 * money the merchant has accrued, so it is shown — just not as emphatically as
 * one they can already spend.
 */
export function isRewardReleased(row: Referral): boolean {
  return row.status === "REWARD_EARNED" || row.status === "WAIVED";
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
            isRewardReleased(row)
              ? "text-[13px] font-semibold tabular-nums text-foreground"
              : "text-[13px] tabular-nums text-muted-foreground"
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
    {
      key: "createdAt",
      header: "Referred on",
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] tabular-nums text-muted-foreground">
          {formatEpochDate(row.createdAt)}
        </span>
      ),
    },
  ];
}

// ── Redeemed tab ─────────────────────────────────────────────────────────────

/**
 * The redeemed table's columns — reference, amount, date, the same three
 * pg-dashboard shows for its "Redeemed Referrals" tab.
 *
 * There is no name or email column here and there cannot be one: a redemption is
 * a drawdown of the wallet as a whole, with no referral behind it to name (see
 * ReferralRedemption). The amount is signed and coloured as a deduction, since
 * this is money leaving the reward wallet to come off an invoice.
 */
export function buildRedemptionColumns(): Column<ReferralRedemption>[] {
  return [
    {
      key: "id",
      header: "Reference number",
      render: (row) => (
        <span className="block max-w-[20rem] truncate font-mono text-[12px] text-muted-foreground">
          {row.id}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Redeemed amount",
      align: "right",
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-foreground">
          −{formatCurrency(parseFloat(row.amount), row.currency, "en-US")}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Redeemed on",
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] tabular-nums text-muted-foreground">
          {formatEpochDate(row.createdAt)}
        </span>
      ),
    },
  ];
}
