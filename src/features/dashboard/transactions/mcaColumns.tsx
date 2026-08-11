"use client";

import { type Column, StatusBadge, Button } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";
import { formatCurrency, formatTransactionTimestamp } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { COUNTRY_NAME_MAP } from "@/features/dashboard/transactions/constants";
import type { McaTransaction } from "@/features/dashboard/transactions/types";
import { useApp } from "@/stores/useApp";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { RowClick } from "@/components/common/table/RowClick";

// ── Status mapping: raw API value → display meta ──────────────────────────────
export type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

const MCA_STATUS_META: Record<string, StatusMeta> = {
  DOCUMENT_PENDING: { label: "Invoice Pending", variant: "warning" },
  FUNDS_ON_HOLD: { label: "Funds on Hold", variant: "warning" },
  SENT_FOR_REVIEW: { label: "Sent for Review", variant: "warning", trailIcon: "clock" },
  SENT_FOR_SETTLEMENT: { label: "Sent for Settlement", variant: "warning" },
  SETTLED: { label: "Settled", variant: "success", trailIcon: "check" },
  FIRC_SETTLED: { label: "FIRC Settled", variant: "success", trailIcon: "check" },
  REVERSAL_FOR_RISK_REJECTED: { label: "Funds Reversed", variant: "danger", trailIcon: "x" },
  REVERSAL_FOR_NOT_SUPPORTED: { label: "Funds Reversed", variant: "danger", trailIcon: "x" },
};

export function getStatusMeta(raw: string, isFrmPending: boolean): StatusMeta {
  if (isFrmPending) return { label: "Action Required", variant: "orange", trailIcon: "alert" };
  return MCA_STATUS_META[raw] ?? { label: raw.replace(/_/g, " ").toLowerCase(), variant: "muted" };
}

// A transaction is "Invoice Pending" exactly when its Settlement Status
// badge reads that label — i.e. not FRM-pending and externalStatus is
// DOCUMENT_PENDING. Deriving it from the same inputs as getStatusMeta keeps
// the Actions column's CTA choice in sync with what the Settlement Status
// column actually displays.
export function isWaitingForInvoice(row: McaTransaction): boolean {
  const isFrmPending = row.frmStatus === "PENDING_MERCHANT_UPLOAD";
  return !isFrmPending && row.externalStatus === "DOCUMENT_PENDING";
}

// ── Country cell ──────────────────────────────────────────────────────────────
export function CountryCell({ iso2 }: { iso2?: string | null }) {
  const countryCurrencyMap = useApp((s) => s.countryCurrencyMap);

  // Normalise whatever the API sends (ISO2, ISO3, or full name) to a real ISO2 code
  // so the CDN flag URL is always correct (e.g. "France" or "FRA" → "FR" → fr.svg)
  if (!iso2) return <span className="text-[13px] text-muted-foreground">—</span>;

  // Normalise whatever the API sends (ISO2, ISO3, or full name) to a real ISO2 code
  // so the CDN flag URL is always correct (e.g. "France" or "FRA" → "FR" → fr.svg)
  const upper = iso2.toUpperCase();
  const entry =
    countryCurrencyMap.find((c) => c.iso2CountryCode.toUpperCase() === upper) ??
    countryCurrencyMap.find((c) => c.countryName.toUpperCase() === upper);

  const resolvedIso2 = entry?.iso2CountryCode ?? iso2;
  const name = entry?.countryName ?? COUNTRY_NAME_MAP[upper] ?? iso2;

  return (
    // min-w-max: the cell's own natural (max-content) width is never allowed
    // to shrink below the flag+name's combined width, so the column always
    // widens to fit the longest country name instead of clipping it.
    <div className="flex min-w-max items-center gap-1.5">
      <CountryFlag iso2={resolvedIso2} alt={name} />
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">{name}</span>
    </div>
  );
}

// TODO: wire up the invoice viewing flow once the API/route is available.
// Exported so TransactionCardList's mobile card action can call the same
// (currently no-op) handler as the table's own View Invoice button below,
// rather than each declaring its own stub that would need updating twice
// once this is wired up for real.
export function handleViewInvoice(row: McaTransaction) {
  void row;
}

// ── Column definitions ────────────────────────────────────────────────────────
// Upload Invoice now opens the Transaction Details Drawer (its inline upload
// flow) rather than the standalone modal, so the Actions column only needs
// onOpenDetails — see McaTransactionTable's commented-out modal wiring.
export function buildMcaColumns(
  isPartnerUser: boolean,
  onOpenDetails: (row: McaTransaction) => void,
  options: { showActions?: boolean } = {}
): Column<McaTransaction>[] {
  const { showActions = true } = options;
  const cols: Column<McaTransaction>[] = [
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
      key: "externalStatus",
      header: "Settlement Status",
      minWidth: 170,
      render: (row) => {
        const isFrmPending = row.frmStatus === "PENDING_MERCHANT_UPLOAD";
        const { label, variant, trailIcon } = getStatusMeta(row.externalStatus, isFrmPending);
        return (
          <RowClick onClick={() => onOpenDetails(row)}>
            <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />
          </RowClick>
        );
      },
    },
    {
      key: "formattedCreationDateTime",
      header: "Date & Time",
      minWidth: 150,
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">
            {formatTransactionTimestamp(row.formattedCreationDateTime)}
          </span>
        </RowClick>
      ),
    },
    {
      key: "partnerCustomerCountry",
      header: "Country",
      minWidth: 140,
      // DataTable's compact-density cells always add overflow-hidden; this
      // column's content must never clip, so it's cancelled here specifically
      // (min-w-max on CountryCell above is what actually grows the column).
      cellClassName: "overflow-visible",
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <CountryCell iso2={row.partnerCustomerCountry} />
        </RowClick>
      ),
    },
    {
      key: "partnerMaskedCustomerFullName",
      header: "Remitter Name",
      minWidth: 200,
      render: (row) => {
        const name = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName;
        return (
          <RowClick onClick={() => onOpenDetails(row)}>
            <span className="block w-[150px] truncate text-[13px] text-foreground">
              {name ?? "—"}
            </span>
          </RowClick>
        );
      },
    },
    {
      key: "action",
      header: "Actions",
      minWidth: 170,
      align: "left",
      render: (row) => {
        if (isWaitingForInvoice(row)) {
          return (
            <RowClick onClick={() => onOpenDetails(row)}>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="upload" className="w-3 h-3" />}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetails(row);
                }}
                className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap"
              >
                Upload Invoice
              </Button>
            </RowClick>
          );
        }
        return (
          <RowClick onClick={() => onOpenDetails(row)}>
            {/* Hidden until the row is hovered/focused, opacity-only (no
                display/width change) so revealing it never shifts the layout. */}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Icon name="eye" className="w-3 h-3" />}
              onClick={(e) => {
                e.stopPropagation();
                handleViewInvoice(row);
              }}
              className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              View Invoice
            </Button>
          </RowClick>
        );
      },
    },
  ];

  if (isPartnerUser) {
    cols.splice(4, 0, {
      key: "merchantId",
      header: "Merchant ID",
      minWidth: 145,
      render: (row) => (
        <RowClick onClick={() => onOpenDetails(row)}>
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">
            {row.merchantId ?? "—"}
          </span>
        </RowClick>
      ),
    });
  }

  // Linked Transactions (on the Transaction Details page) reuses these same
  // columns without the Actions column — everything else (chips, formatting,
  // ordering) stays identical to the Transactions page's own table.
  return showActions ? cols : cols.filter((col) => col.key !== "action");
}
