"use client";

import { type Column, StatusBadge, Button } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";
import { formatCurrency, formatTransactionTimestamp } from "@/lib/utils/format";
import { RowClick } from "@/components/common/table/RowClick";
import { CountryCell } from "@/features/dashboard/mca-transactions/columns";
import type { McaLink, McaLinkStatus } from "@/features/dashboard/mca-links/types";

// ── Status mapping: raw value → display meta ─────────────────────────────────
// Same shape as MCA Transactions' MCA_STATUS_META, so both tables' chips are
// built from one identical component and vocabulary of variants.
type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

const MCA_LINK_STATUS_META: Record<McaLinkStatus, StatusMeta> = {
  ACTIVE: { label: "Active", variant: "success", trailIcon: "check" },
  DISABLED: { label: "Disabled", variant: "muted", trailIcon: "x" },
  EXPIRED: { label: "Expired", variant: "warning", trailIcon: "clock" },
};

export function getLinkStatusMeta(raw: string): StatusMeta {
  return (
    MCA_LINK_STATUS_META[raw as McaLinkStatus] ?? {
      label: raw.replace(/_/g, " ").toLowerCase(),
      variant: "muted",
    }
  );
}

// ── Column definitions ───────────────────────────────────────────────────────
export function buildMcaLinkColumns(
  onOpenDetails: (row: McaLink) => void,
  onCopyLink: (row: McaLink) => void
): Column<McaLink>[] {
  return [
    {
      key: "amount",
      header: "Amount",
      minWidth: 135,
      align: "right",
      render: (row) => {
        const amount = parseFloat(row.amount ?? "0");
        const currency = row.currency ?? "USD";
        return (
          <RowClick onClick={() => onOpenDetails(row)} align="right">
            <div className="flex items-baseline gap-1.5 whitespace-nowrap justify-end">
              <span className="font-semibold text-foreground tabular-nums text-[13px]">
                {formatCurrency(amount, currency, "en-US")}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">{currency}</span>
            </div>
          </RowClick>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      minWidth: 130,
      render: (row) => {
        const { label, variant, trailIcon } = getLinkStatusMeta(row.status);
        return (
          <RowClick onClick={() => onOpenDetails(row)}>
            <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />
          </RowClick>
        );
      },
    },
    {
      key: "customerCountry",
      header: "Customer Country",
      minWidth: 170,
      // DataTable's compact-density cells always add overflow-hidden; this
      // column's content must never clip, so it's cancelled here specifically
      // (min-w-max inside CountryCell is what actually grows the column).
      cellClassName: "overflow-visible",
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <CountryCell iso2={row.customerCountry} />
        </RowClick>
      ),
    },
    {
      key: "invoiceNumber",
      header: "Invoice Number",
      minWidth: 160,
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <span className="text-[13px] text-foreground whitespace-nowrap">
            {row.invoiceNumber || "—"}
          </span>
        </RowClick>
      ),
    },
    {
      key: "description",
      header: "Description",
      minWidth: 220,
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          {/* Fixed width + truncate, the same treatment Remitter Name gets on
              the Transactions table, so a long merchant description can't
              stretch the row. */}
          <span className="block w-[220px] truncate text-[13px] text-muted-foreground" title={row.description ?? undefined}>
            {row.description || "—"}
          </span>
        </RowClick>
      ),
    },
    {
      key: "createdOn",
      header: "Created On",
      minWidth: 150,
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">
            {formatTransactionTimestamp(row.createdOn)}
          </span>
        </RowClick>
      ),
    },
    {
      key: "expiresAt",
      header: "Expires At",
      minWidth: 150,
      // An already-elapsed expiry keeps showing its timestamp exactly as any
      // other does: the Status chip is what communicates "Expired", so
      // styling the date differently here would say the same thing twice.
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">
            {formatTransactionTimestamp(row.expiresAt)}
          </span>
        </RowClick>
      ),
    },
    {
      key: "action",
      header: "Action",
      minWidth: 130,
      align: "left",
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="copy" className="w-3 h-3" />}
            // stopPropagation so copying never also opens the row's details —
            // same guard the Transactions table's row-level buttons use.
            onClick={(e) => {
              e.stopPropagation();
              onCopyLink(row);
            }}
            className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap"
          >
            Copy Link
          </Button>
        </RowClick>
      ),
    },
  ];
}
