import { type Column, CopyableCell, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { formatCurrency } from "@/lib/utils";
import { formatTransactionTimestamp, parseApiDate, truncateMiddle } from "@/lib/utils/format";
import type { PaymentLinkRow } from "@/features/dashboard/payment-links/types";
import { AmountHeader, AmountWithCode } from "@/components/common/AmountCell";

export type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

/** The backend's statuses, labelled as pg-dashboard's PAYMENT_LINKS_STATUS_MAPPING does. */
const PAYMENT_LINK_STATUS_META: Record<string, StatusMeta> = {
  ACTIVE: { label: "Active", variant: "info" },
  AUTHORIZED: { label: "Authorized", variant: "success" },
  TRANSACTED: { label: "Paid", variant: "success", trailIcon: "check" },
  EXPIRED: { label: "Expired", variant: "warning", trailIcon: "clock" },
  DISABLED: { label: "Deactivated", variant: "muted", trailIcon: "x" },
  EXHAUSTED: { label: "Exhausted", variant: "muted" },
};

/** A status the map doesn't know still shows, title-cased, rather than crashing the row. */
export function paymentLinkStatusMeta(status: string): StatusMeta {
  return (
    PAYMENT_LINK_STATUS_META[status.toUpperCase()] ?? {
      label: status
        ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, " ")
        : "—",
      variant: "muted",
    }
  );
}

/** An empty value reads as a dash, as in every other table. */
const DASH = <span className="text-[13px] text-muted-foreground">—</span>;

const MINUTES_PER_DAY = 24 * 60;

/**
 * Whole days until an Active link expires, rounded up, as pg-dashboard's
 * getDaysRemaining counts them (1 minute left is "1 day"); 0 once it has
 * passed or when the expiry can't be read.
 */
function daysRemaining(expiresAt: string, nowMs: number): number {
  const expiry = parseApiDate(expiresAt);
  if (!expiry) return 0;
  const minutes = Math.floor((expiry.getTime() - nowMs) / 60_000);
  return minutes > 0 ? Math.ceil(minutes / MINUTES_PER_DAY) : 0;
}

/** The chip only shows in a link's last week... */
const EXPIRY_CHIP_DAYS = 7;
/** ...and turns to a warning in its last 3 days, as pg-dashboard flags it. */
const EXPIRY_WARNING_DAYS = 3;

/**
 * The time left on an Active link in its last 7 days, for the Expires At
 * chip: "Expires in 6 days", then pg-dashboard's own "Expiring in 2 days" in
 * the warning colour for the last 3. Null further out, for any other status
 * (its Status badge already says what happened), or for an unreadable date.
 */
export function expiryChip(
  row: PaymentLinkRow,
  nowMs: number
): { label: string; warning: boolean } | null {
  if (row.status.toUpperCase() !== "ACTIVE") return null;
  const days = daysRemaining(row.expiresAt, nowMs);
  if (days <= 0 || days > EXPIRY_CHIP_DAYS) return null;
  const span = `${days} ${days > 1 ? "days" : "day"}`;
  return days <= EXPIRY_WARNING_DAYS
    ? { label: `Expiring in ${span}`, warning: true }
    : { label: `Expires in ${span}`, warning: false };
}

/**
 * `nowMs` is the moment the page loaded (captured once, never read during
 * render), which the Expires At column measures its chip against.
 */
export const buildPaymentLinkColumns = (nowMs: number): Column<PaymentLinkRow>[] => [
  {
    key: "amount",
    header: <AmountHeader />,
    minWidth: 135,
    align: "right",
    render: (row) => (
      <AmountWithCode amount={formatCurrency(row.amount, row.currency)} code={row.currency} />
    ),
  },
  {
    key: "status",
    header: "Status",
    minWidth: 130,
    render: (row) => {
      const { label, variant, trailIcon } = paymentLinkStatusMeta(row.status);
      return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
    },
  },
  {
    key: "customerName",
    header: "Customer",
    minWidth: 145,
    render: (row) =>
      row.customerName ? (
        <span className="text-[13px] font-medium text-foreground whitespace-nowrap">
          {row.customerName}
        </span>
      ) : (
        DASH
      ),
  },
  {
    key: "customerDetails",
    header: "Customer Email",
    minWidth: 190,
    // Copy button revealed on row hover (CopyableCell); it stops
    // propagation, so copying never also opens the row.
    render: (row) =>
      row.customerDetails ? (
        <CopyableCell
          value={row.customerDetails}
          label="Email"
          valueClassName="text-[13px] text-muted-foreground whitespace-nowrap lowercase"
        />
      ) : (
        DASH
      ),
  },
  {
    key: "paymentLinkUrl",
    header: "Payment Link",
    minWidth: 175,
    render: (row) =>
      row.paymentLinkUrl ? (
        // Middle-truncated, keeping the host and the link's last characters
        // ("pay.pgcl.com/7b…a91f2c"); the copy button still copies the full
        // link, with its scheme, so it opens when pasted.
        <CopyableCell
          value={`https://${row.paymentLinkUrl}`}
          display={truncateMiddle(row.paymentLinkUrl, 16, 6)}
          label="Payment link"
          valueClassName="text-[13px] text-primary whitespace-nowrap"
        />
      ) : (
        DASH
      ),
  },
  {
    key: "paymentFor",
    header: "Payment For",
    minWidth: 160,
    render: (row) =>
      row.paymentFor ? (
        <span className="text-[13px] text-foreground whitespace-nowrap">{row.paymentFor}</span>
      ) : (
        DASH
      ),
  },
  {
    key: "createdAt",
    header: "Created At",
    minWidth: 150,
    render: (row) => (
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">
        {formatTransactionTimestamp(row.createdAt)}
      </span>
    ),
  },
  {
    // pg-dashboard's "Expires at" column (formattedExpiryTime).
    key: "expiresAt",
    header: "Expires At",
    minWidth: 150,
    render: (row) => {
      const chip = expiryChip(row, nowMs);
      return (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[13px] text-muted-foreground">
            {formatTransactionTimestamp(row.expiresAt)}
          </span>
          {chip && (
            <StatusBadge
              variant={chip.warning ? "warning" : "muted"}
              label={chip.label}
              size="sm"
            />
          )}
        </span>
      );
    },
  },
];
