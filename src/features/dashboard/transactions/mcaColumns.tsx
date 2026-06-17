"use client";

import { type Column, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { formatCurrency } from "@/lib/utils/format";
import { COUNTRY_NAME_MAP } from "@/features/dashboard/transactions/constants";
import type { McaTransaction } from "@/features/dashboard/transactions/types";
import { useApp } from "@/stores/useApp";

// ── Status mapping: raw API value → display meta ──────────────────────────────
type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

const MCA_STATUS_META: Record<string, StatusMeta> = {
  DOCUMENT_PENDING:           { label: "Invoice Pending",       variant: "warning" },
  FUNDS_ON_HOLD:              { label: "Funds on Hold",         variant: "warning" },
  SENT_FOR_REVIEW:            { label: "Sent for Review",       variant: "warning", trailIcon: "clock" },
  SENT_FOR_SETTLEMENT:        { label: "Sent for Settlement",   variant: "warning" },
  SETTLED:                    { label: "Settled",               variant: "success", trailIcon: "check" },
  FIRC_SETTLED:               { label: "FIRC Settled",          variant: "success", trailIcon: "check" },
  REVERSAL_FOR_RISK_REJECTED: { label: "Funds Reversed",        variant: "danger",  trailIcon: "x" },
  REVERSAL_FOR_NOT_SUPPORTED: { label: "Funds Reversed",        variant: "danger",  trailIcon: "x" },
};

function getStatusMeta(raw: string, isFrmPending: boolean): StatusMeta {
  if (isFrmPending) return { label: "Action Required", variant: "orange", trailIcon: "alert" };
  return MCA_STATUS_META[raw] ?? { label: raw.replace(/_/g, " ").toLowerCase(), variant: "muted" };
}

// ── Country cell ──────────────────────────────────────────────────────────────
function CountryCell({ iso2 }: { iso2?: string | null }) {
  const countryCurrencyMap = useApp((s) => s.countryCurrencyMap);

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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={flagSrc}
        alt={name}
        className="h-3.5 w-5 rounded-sm border border-border object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src =
            "https://static.payglocal.in/images/flags/default.svg";
        }}
      />
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">{name}</span>
    </div>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────
export function buildMcaColumns(isPartnerUser: boolean): Column<McaTransaction>[] {
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
          <div className="flex items-baseline gap-1.5 whitespace-nowrap justify-end">
            <span className="font-semibold text-foreground tabular-nums text-[13px]">
              {formatCurrency(amount, currency, "en-US")}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">{currency}</span>
          </div>
        );
      },
    },
    {
      key: "externalStatus",
      header: "Status",
      minWidth: 170,
      render: (row) => {
        const isFrmPending = row.frmStatus === "PENDING_MERCHANT_UPLOAD";
        const { label, variant, trailIcon } = getStatusMeta(row.externalStatus, isFrmPending);
        return (
          <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />
        );
      },
    },
    {
      key: "partnerCustomerCountry",
      header: "Country",
      minWidth: 140,
      render: (row) => <CountryCell iso2={row.partnerCustomerCountry} />,
    },
    {
      key: "partnerMaskedCustomerFullName",
      header: "Remitter name",
      minWidth: 155,
      render: (row) => {
        const name = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName;
        return (
          <span className="text-[13px] text-foreground whitespace-nowrap">
            {name ?? "—"}
          </span>
        );
      },
    },
    {
      key: "formattedCreationDateTime",
      header: "Date and time",
      minWidth: 150,
      render: (row) => (
        <span className="text-[13px] text-muted-foreground whitespace-nowrap">
          {row.formattedCreationDateTime ?? "—"}
        </span>
      ),
    },
  ];

  if (!isPartnerUser) return cols;

  cols.splice(4, 0, {
    key: "merchantId",
    header: "Merchant ID",
    minWidth: 145,
    render: (row) => (
      <span className="text-[13px] text-muted-foreground whitespace-nowrap">
        {row.merchantId ?? "—"}
      </span>
    ),
  });

  return cols;
}
