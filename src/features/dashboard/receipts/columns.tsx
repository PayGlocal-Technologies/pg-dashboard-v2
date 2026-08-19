"use client";

import { type Column, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { CopyableCell } from "@/components/common/CopyableCell";
import { CountryCell } from "@/features/dashboard/mca-transactions/columns";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import { formatReceiptAmount } from "@/features/dashboard/receipts/utils";
import { RECEIPT_STATUS_LABEL } from "@/features/dashboard/receipts/constants";
import type { Receipt, ReceiptProduct, ReceiptStatus } from "@/features/dashboard/receipts/types";

// ── Status mapping: raw value → display meta ─────────────────────────────────
// Same shape as MCA Transactions' MCA_STATUS_META and MCA Links'
// MCA_LINK_STATUS_META, so all three tables' chips are built from one identical
// component and vocabulary of variants.
type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

const RECEIPT_STATUS_META: Record<ReceiptStatus, StatusMeta> = {
  PAID: { label: RECEIPT_STATUS_LABEL.PAID, variant: "success", trailIcon: "check" },
  ISSUED: { label: RECEIPT_STATUS_LABEL.ISSUED, variant: "info" },
  PENDING: { label: RECEIPT_STATUS_LABEL.PENDING, variant: "warning", trailIcon: "clock" },
  REFUNDED: { label: RECEIPT_STATUS_LABEL.REFUNDED, variant: "muted" },
  VOID: { label: RECEIPT_STATUS_LABEL.VOID, variant: "danger", trailIcon: "x" },
};

export function getReceiptStatusMeta(raw: string): StatusMeta {
  return (
    RECEIPT_STATUS_META[raw as ReceiptStatus] ?? {
      label: raw.replace(/_/g, " ").toLowerCase(),
      variant: "muted",
    }
  );
}

// ── Column definitions ───────────────────────────────────────────────────────
// Widths, typography (text-[13px] body, muted secondary text) and alignment
// conventions mirror buildSkuColumns and buildMcaLinkColumns, so every table in
// the product reads as one system.
//
// Invoice ID and Amount lead in every tab — they are what identifies a receipt
// and what a merchant scans the list for — with Date and Status closing it.
// Country sits between Amount and Date, and only on the MCA tab: a cross-border
// collection is the one case where the remitter's country is part of the record.
// It's built by spreading a one-or-zero-length array (the same shape
// buildSkuColumns uses for its optional MID column) rather than rendering a
// column of dashes, so the other two tabs have no Country column at all instead
// of an empty one.
export function buildReceiptColumns(product: ReceiptProduct): Column<Receipt>[] {
  return [
    {
      key: "invoiceId",
      header: "Invoice ID",
      minWidth: 210,
      // Compact density puts overflow-hidden on every cell, which would clip
      // the hover-revealed copy button; cancelled here the same way the MCA
      // table cancels it for its Country cell.
      cellClassName: "overflow-visible",
      render: (row) => <CopyableCell value={row.invoiceId} label="Invoice ID" monospace />,
    },
    {
      key: "amount",
      header: "Amount",
      minWidth: 150,
      align: "right",
      render: (row) => (
        <div className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
          <span className="text-[13px] font-semibold tabular-nums text-foreground">
            {formatReceiptAmount(row)}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">{row.currency}</span>
        </div>
      ),
    },
    ...(product === "MCA"
      ? [
          {
            key: "remitterCountry",
            header: "Country",
            minWidth: 170,
            // min-w-max inside CountryCell is what grows this column, so its
            // content must never be clipped by compact density's overflow-hidden.
            cellClassName: "overflow-visible",
            render: (row: Receipt) => <CountryCell iso2={row.remitterCountry} />,
          } satisfies Column<Receipt>,
        ]
      : []),
    {
      key: "issuedOn",
      header: "Date",
      minWidth: 150,
      render: (row) => (
        <span className="text-[13px] whitespace-nowrap text-muted-foreground">
          {formatTransactionTimestamp(row.issuedOn)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      minWidth: 130,
      render: (row) => {
        const { label, variant, trailIcon } = getReceiptStatusMeta(row.status);
        return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
      },
    },
  ];
}
