"use client";

import { useState } from "react";
import { Button, type Column, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";
import { cn, formatDate } from "@/lib/utils";
import { CURRENCY_SYMBOLS } from "@/features/dashboard/payment-pages/constants";
import type { PaymentPageRow, PaymentPageStatus } from "@/features/dashboard/payment-pages/types";

export type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

export const PAYMENT_PAGE_STATUS_META: Record<PaymentPageStatus, StatusMeta> = {
  LIVE: { label: "Live", variant: "success", trailIcon: "check" },
  PAUSED: { label: "Paused", variant: "warning", trailIcon: "clock" },
  DRAFT: { label: "Draft", variant: "muted" },
};

// Page amounts are heterogeneous — a fixed price ("$5,000") or payer-chosen
// ("Customer decides"), so this renders a plain grouped amount without the
// forced 2 decimals that formatCurrency applies.
function amountDisplay(amount: number | null, currency: string): string {
  if (amount == null) return "Customer decides";
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${amount.toLocaleString("en-IN")}`;
}

export const paymentPageColumns: Column<PaymentPageRow>[] = [
  {
    key: "product",
    header: "Product",
    minWidth: 220,
    render: (row) => (
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon name="package" className="h-3.5 w-3.5" />
        </span>
        <span className="text-[13px] font-semibold text-foreground whitespace-nowrap">
          {row.product}
        </span>
      </div>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    minWidth: 140,
    render: (row) => (
      <span
        className={cn(
          "text-[13px] whitespace-nowrap",
          row.amount == null
            ? "text-muted-foreground"
            : "font-semibold tabular-nums text-foreground"
        )}
      >
        {amountDisplay(row.amount, row.currency)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    minWidth: 120,
    render: (row) => {
      const { label, variant, trailIcon } = PAYMENT_PAGE_STATUS_META[row.status];
      return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
    },
  },
  {
    key: "createdAt",
    header: "Created on",
    minWidth: 130,
    render: (row) => (
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">
        {formatDate(row.createdAt, { hour: undefined, minute: undefined })}
      </span>
    ),
  },
  {
    key: "link",
    header: "Link",
    // Grows to absorb slack (fixed layout) so the trailing actions column sits
    // flush against the right edge of the table.
    width: "minmax(16rem, 1fr)",
    minWidth: 260,
    render: (row) => <LinkCell link={row.link} />,
  },
];

/** Hosted-page link with a copy button that appears on hover. */
function LinkCell({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(link);
    setCopied(true);
    // Runs in an event handler, not render — safe per the hooks-purity rules.
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group/link flex items-center gap-2">
      <span className="truncate font-mono text-[13px] text-primary/70 transition-colors group-hover/link:text-primary">
        {link}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Copy link"
        onClick={copy}
        className="h-6 w-6 min-h-0 min-w-0 shrink-0 cursor-pointer rounded-md p-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/link:opacity-100"
      >
        <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

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
