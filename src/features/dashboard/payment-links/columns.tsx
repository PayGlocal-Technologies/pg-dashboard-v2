import { type Column, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentLinkRow, PaymentLinkStatus } from "@/features/dashboard/payment-links/types";

export type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

export const PAYMENT_LINK_STATUS_META: Record<PaymentLinkStatus, StatusMeta> = {
  ACTIVE: { label: "Active", variant: "info" },
  PAID: { label: "Paid", variant: "success", trailIcon: "check" },
  EXPIRED: { label: "Expired", variant: "warning", trailIcon: "clock" },
  DEACTIVATED: { label: "Deactivated", variant: "muted", trailIcon: "x" },
};

export const paymentLinkColumns: Column<PaymentLinkRow>[] = [
  {
    key: "amount",
    header: "Amount",
    minWidth: 135,
    align: "right",
    render: (row) => (
      <div className="flex items-baseline gap-1.5 whitespace-nowrap justify-end">
        <span className="font-semibold text-foreground tabular-nums text-[13px]">
          {formatCurrency(row.amount, row.currency)}
        </span>
        <span className="text-[11px] text-muted-foreground font-medium">{row.currency}</span>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    minWidth: 130,
    render: (row) => {
      const { label, variant, trailIcon } = PAYMENT_LINK_STATUS_META[row.status];
      return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
    },
  },
  {
    key: "customerName",
    header: "Customer",
    minWidth: 145,
    render: (row) => (
      <span className="text-[13px] font-medium text-foreground whitespace-nowrap">
        {row.customerName}
      </span>
    ),
  },
  {
    key: "customerDetails",
    header: "Customer Details",
    minWidth: 190,
    render: (row) => (
      <span className="text-[13px] text-muted-foreground whitespace-nowrap lowercase">
        {row.customerDetails}
      </span>
    ),
  },
  {
    key: "paymentLinkUrl",
    header: "Payment Link",
    minWidth: 175,
    render: (row) => (
      <span className="text-[13px] font-mono text-primary/70 hover:text-primary transition-colors cursor-pointer whitespace-nowrap">
        {row.paymentLinkUrl}
      </span>
    ),
  },
  {
    key: "paymentFor",
    header: "Payment For",
    minWidth: 160,
    render: (row) => (
      <span className="text-[13px] text-foreground whitespace-nowrap">{row.paymentFor}</span>
    ),
  },
  {
    key: "createdAt",
    header: "Created At",
    minWidth: 150,
    render: (row) => (
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">
        {formatDate(row.createdAt)}
      </span>
    ),
  },
];

/**
 * Wraps every column's cell in a click handler that opens the row's details —
 * DataTable has no row-level onClick, only a hover action slot, so this makes
 * "click anywhere on the row" work by reclaiming the `<td>`'s own padding via
 * negative margins (`-mx-3 -my-2.5` matches this table's `density="compact"`
 * cell padding exactly) rather than covering just the rendered content.
 */
export function withRowClick<T>(columns: Column<T>[], onRowClick: (row: T) => void): Column<T>[] {
  return columns.map((col) => ({
    ...col,
    render: (row: T, index: number) => (
      <div
        onClick={() => onRowClick(row)}
        className={cn(
          "-mx-3 -my-2.5 flex min-h-[inherit] cursor-pointer items-center px-3 py-2.5",
          col.align === "right" && "justify-end",
          col.align === "center" && "justify-center"
        )}
      >
        {col.render(row, index)}
      </div>
    ),
  }));
}
