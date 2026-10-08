import { type Column, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentLinkRow, PaymentLinkStatus } from "@/features/dashboard/payment-links/types";
import { AmountHeader, AmountWithCode } from "@/components/common/AmountCell";

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
