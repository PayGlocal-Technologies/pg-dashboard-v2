"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { type Column, StatusBadge, Button } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";
import { formatCurrency, formatTransactionTimestamp } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { COUNTRY_NAME_MAP } from "@/features/dashboard/transactions/constants";
import type { McaTransaction } from "@/features/dashboard/transactions/types";
import { useApp } from "@/stores/useApp";

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

// ── Row-click wrapper ──────────────────────────────────────────────────────────
// Wraps non-interactive cell content so clicking anywhere in the cell opens the
// transaction details drawer. Deliberately not used on the Actions column —
// it already carries its own click targets (upload/view invoice) and
// shouldn't compete with a row-level click.
function RowClick({
  row,
  onOpenDetails,
  align,
  children,
}: {
  row: McaTransaction;
  onOpenDetails: (row: McaTransaction) => void;
  align?: "left" | "right" | "center";
  children: ReactNode;
}) {
  return (
    <div
      onClick={() => onOpenDetails(row)}
      className={cn(
        "cursor-pointer",
        align === "right" && "flex justify-end",
        align === "center" && "flex justify-center"
      )}
    >
      {children}
    </div>
  );
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
  const flagSrc = `https://static.payglocal.in/images/flags/${resolvedIso2.toLowerCase()}.svg`;

  return (
    // min-w-max: the cell's own natural (max-content) width is never allowed
    // to shrink below the flag+name's combined width, so the column always
    // widens to fit the longest country name instead of clipping it.
    <div className="flex min-w-max items-center gap-1.5">
      <Image
        src={flagSrc}
        alt={name}
        width={20}
        height={14}
        className="h-3.5 w-5 shrink-0 rounded-sm border border-border object-cover"
        unoptimized
      />
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">{name}</span>
    </div>
  );
}

// TODO: wire up the invoice viewing flow once the API/route is available.
function handleViewInvoice(row: McaTransaction) {
  void row;
}

// ── Column definitions ────────────────────────────────────────────────────────
// Upload Invoice now opens the Transaction Details Drawer (its inline upload
// flow) rather than the standalone modal, so the Actions column only needs
// onOpenDetails — see McaTransactionTable's commented-out modal wiring.
export function buildMcaColumns(
  isPartnerUser: boolean,
  onOpenDetails: (row: McaTransaction) => void
): Column<McaTransaction>[] {
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
          <RowClick row={row} onOpenDetails={onOpenDetails} align="right">
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
          <RowClick row={row} onOpenDetails={onOpenDetails}>
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
        <RowClick row={row} onOpenDetails={onOpenDetails}>
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
        <RowClick row={row} onOpenDetails={onOpenDetails}>
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
          <RowClick row={row} onOpenDetails={onOpenDetails}>
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
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon name="upload" className="w-3 h-3" />}
              onClick={() => onOpenDetails(row)}
              className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap"
            >
              Upload Invoice
            </Button>
          );
        }
        return (
          // Hidden until the row is hovered/focused — opacity-only (no
          // display/width change) so revealing it never shifts the layout.
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="eye" className="w-3 h-3" />}
            onClick={() => handleViewInvoice(row)}
            className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            View Invoice
          </Button>
        );
      },
    },
  ];

  if (!isPartnerUser) return cols;

  cols.splice(4, 0, {
    key: "merchantId",
    header: "Merchant ID",
    minWidth: 145,
    render: (row) => (
      <RowClick row={row} onOpenDetails={onOpenDetails}>
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">
          {row.merchantId ?? "—"}
        </span>
      </RowClick>
    ),
  });

  return cols;
}
