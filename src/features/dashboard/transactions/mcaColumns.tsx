"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { type Column, StatusBadge, Button } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { COUNTRY_NAME_MAP } from "@/features/dashboard/transactions/constants";
import type { McaTransaction } from "@/features/dashboard/transactions/types";
import { useApp } from "@/stores/useApp";

// ── Status mapping: raw API value → display meta ──────────────────────────────
export type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

const MCA_STATUS_META: Record<string, StatusMeta> = {
  DOCUMENT_PENDING: { label: "Waiting for Invoice", variant: "warning" },
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

// A transaction is "Waiting for Invoice" exactly when its Settlement Status
// badge reads that label — i.e. not FRM-pending and externalStatus is
// DOCUMENT_PENDING. Deriving it from the same inputs as getStatusMeta keeps
// the Action column's CTA choice in sync with what the Settlement Status
// column actually displays.
export function isWaitingForInvoice(row: McaTransaction): boolean {
  const isFrmPending = row.frmStatus === "PENDING_MERCHANT_UPLOAD";
  return !isFrmPending && row.externalStatus === "DOCUMENT_PENDING";
}

// ── Row-click wrapper ──────────────────────────────────────────────────────────
// Wraps non-interactive cell content so clicking anywhere in the cell opens the
// transaction details drawer. Deliberately not used on the Transaction ID or
// Action columns — those already carry their own click targets (copy, upload/
// view invoice) and shouldn't compete with a row-level click.
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
    <div className="flex items-center gap-1.5">
      <Image
        src={flagSrc}
        alt={name}
        width={20}
        height={14}
        className="h-3.5 w-5 rounded-sm border border-border object-cover"
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
export function buildMcaColumns(
  isPartnerUser: boolean,
  onUploadInvoice: (row: McaTransaction) => void,
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
      key: "partnerMaskedCustomerFullName",
      header: "Remitter Name",
      minWidth: 200,
      render: (row) => {
        const name = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName;
        return (
          <RowClick row={row} onOpenDetails={onOpenDetails}>
            <span className="block w-[170px] truncate text-[13px] text-foreground">
              {name ?? "—"}
            </span>
          </RowClick>
        );
      },
    },
    {
      key: "gid",
      header: "Transaction ID",
      minWidth: 108,
      render: (row) => (
        <div className="w-[108px]">
          <CopyableText value={row.gid} variant="cell" />
        </div>
      ),
    },
    {
      key: "formattedCreationDateTime",
      header: "Date & Time",
      minWidth: 150,
      render: (row) => (
        <RowClick row={row} onOpenDetails={onOpenDetails}>
          <span className="text-[13px] text-muted-foreground whitespace-nowrap">
            {row.formattedCreationDateTime ?? "—"}
          </span>
        </RowClick>
      ),
    },
    {
      key: "partnerCustomerCountry",
      header: "Country",
      minWidth: 140,
      render: (row) => (
        <RowClick row={row} onOpenDetails={onOpenDetails}>
          <CountryCell iso2={row.partnerCustomerCountry} />
        </RowClick>
      ),
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
      key: "action",
      header: "Action",
      minWidth: 170,
      align: "left",
      render: (row) => {
        if (isWaitingForInvoice(row)) {
          return (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon name="upload" className="w-3 h-3" />}
              onClick={() => onUploadInvoice(row)}
              className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap"
            >
              Upload Invoice
            </Button>
          );
        }
        return (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="eye" className="w-3 h-3" />}
            onClick={() => handleViewInvoice(row)}
            className="h-auto min-h-0 gap-1 rounded-md px-2 py-1 text-[11px] whitespace-nowrap"
          >
            View Invoice
          </Button>
        );
      },
    },
  ];

  if (!isPartnerUser) return cols;

  cols.splice(3, 0, {
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
