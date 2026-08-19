"use client";

import { type Column, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { CopyableCell } from "@/components/common/CopyableCell";
import { CountryCell } from "@/features/dashboard/mca-transactions/columns";
import { formatTransactionTimestamp } from "@/lib/utils/format";
import { formatReceiptAmount } from "@/features/dashboard/receipts/utils";
import {
  RECEIPT_COLUMN_LABELS,
  RECEIPT_STATUS_LABEL,
} from "@/features/dashboard/receipts/constants";
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
// conventions mirror buildMcaLinkColumns so the two tables read as one system.
//
// Three headers are named by the selected product rather than fixed, see
// RECEIPT_COLUMN_LABELS: the same `party`/`reference`/`channel` fields mean a
// remitter and a rail on MCA, a customer and a payment method on PA, and a
// billed entity and a service line on Fraud screening.
export function buildReceiptColumns(product: ReceiptProduct): Column<Receipt>[] {
  const labels = RECEIPT_COLUMN_LABELS[product];

  return [
    {
      key: "receiptNumber",
      header: "Receipt number",
      minWidth: 210,
      // Compact density puts overflow-hidden on every cell, which would clip
      // the hover-revealed copy button; cancelled here the same way the MCA
      // table cancels it for its Country cell.
      cellClassName: "overflow-visible",
      render: (row) => <CopyableCell value={row.receiptNumber} label="Receipt number" monospace />,
    },
    {
      key: "issuedOn",
      header: "Issued on",
      minWidth: 150,
      render: (row) => (
        <span className="text-[13px] whitespace-nowrap text-muted-foreground">
          {formatTransactionTimestamp(row.issuedOn)}
        </span>
      ),
    },
    {
      key: "party",
      header: labels.party,
      minWidth: 200,
      render: (row) => (
        // Fixed width + truncate, the same treatment Remitter Name gets on the
        // Transactions table, so a long legal entity name can't stretch the row.
        <span className="block w-[200px] truncate text-[13px] text-foreground" title={row.party}>
          {row.party}
        </span>
      ),
    },
    {
      key: "partyCountry",
      header: "Country",
      minWidth: 160,
      // min-w-max inside CountryCell is what grows this column, so its content
      // must never be clipped by compact density's overflow-hidden.
      cellClassName: "overflow-visible",
      render: (row) => <CountryCell iso2={row.partyCountry} />,
    },
    {
      key: "reference",
      header: labels.reference,
      minWidth: 175,
      render: (row) => (
        <span className="text-[13px] tabular-nums whitespace-nowrap text-muted-foreground">
          {row.reference}
        </span>
      ),
    },
    {
      key: "channel",
      header: labels.channel,
      minWidth: 175,
      render: (row) => (
        <span className="text-[13px] whitespace-nowrap text-foreground">{row.channel}</span>
      ),
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
