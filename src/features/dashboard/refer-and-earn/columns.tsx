"use client";

import { Button, type Column, StatusBadge, VisuallyHidden } from "@/components/ui";
import type { BadgeTrailIcon, BadgeVariant } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils/format";
import type { Referral, ReferralStatus } from "@/features/dashboard/refer-and-earn/types";

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
 * The reward, or a dash while it is still unearned — a zero amount would read
 * as "this referral earned nothing" rather than "not yet".
 */
export function formatReferralReward(row: Referral): string {
  if (row.rewardAmount == null) return "—";
  return formatCurrency(parseFloat(row.rewardAmount), row.rewardCurrency, "en-US");
}

// ── Remind action ────────────────────────────────────────────────────────────

export interface ReferralRemindActions {
  /** Sends the nudge for one row. */
  onRemind: (row: Referral) => void;
  /**
   * Rows already reminded in this session. Held by the caller rather than by
   * each button so the state survives paging between the table and the card
   * list, which render the same rows from the same set.
   */
  remindedIds: ReadonlySet<string>;
}

/**
 * The row action, shared by the desktop table and the mobile cards so there is
 * one button treatment and one sent-state rule across both.
 *
 * `h-8` rather than the size's own 36px: the table's comfortable density gives
 * a 56px row, and 32px is what fits inside it once the cell's padding is
 * trimmed (see the column's `cellClassName`) without the action becoming what
 * sets the row height.
 */
export function ReferralRemindButton({
  row,
  onRemind,
  remindedIds,
}: { row: Referral } & ReferralRemindActions) {
  const sent = remindedIds.has(row.id);

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={sent}
      onClick={() => onRemind(row)}
      leftIcon={<Icon name={sent ? "check" : "send-horizontal"} size={13} />}
      aria-label={sent ? `Reminder already sent to ${row.fullName}` : `Remind ${row.fullName}`}
      className="h-8 min-h-8"
    >
      {sent ? "Sent" : "Remind"}
    </Button>
  );
}

// ── Column definitions ───────────────────────────────────────────────────────
// The table renders with tableLayout="content", so every column sizes to its own
// content and the table ends after the last one — no `minWidth`/`maxWidth` hints
// here, since those only feed the `fixed` layout's colgroup and would be dead
// config in this mode. The two free-text columns instead cap themselves with a
// max-width on their block-level cell content, which is what actually bounds a
// column under the automatic table algorithm: a long name or address truncates
// rather than stretching the whole table.
export function buildReferralColumns(actions: ReferralRemindActions): Column<Referral>[] {
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
    {
      key: "remind",
      // No visible header — the buttons label themselves. The name is still in
      // the accessibility tree so the column is announced like the other four.
      header: <VisuallyHidden>Reminder</VisuallyHidden>,
      // Trims the comfortable density's `py-4` to `py-2` for this cell alone:
      // 32px of button inside 8px of padding is 48px, under the row's own 56px
      // minimum, so the action costs the row no height. `cellClassName` is
      // merged last by DataTable, which is what lets it win over the density
      // padding rather than sitting alongside it.
      cellClassName: "py-2",
      render: (row) => <ReferralRemindButton row={row} {...actions} />,
    },
  ];
}
