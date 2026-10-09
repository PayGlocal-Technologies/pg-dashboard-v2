"use client";

import type React from "react";
import { AppImage } from "@/components/common/AppImage";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { type Column, CopyableCell, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { formatCurrency, formatTimestamp, truncateId } from "@/lib/utils/format";
import type { PaTransaction } from "@/features/dashboard/pa-transactions/types";
import { AmountHeader, AmountWithCode } from "@/components/common/AmountCell";

// ── Status mapping: raw API value → display meta ──────────────────────────────
type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

const PA_STATUS_META: Record<string, StatusMeta> = {
  SUCCESS: { label: "Success", variant: "success", trailIcon: "check" },
  SENT_FOR_CAPTURE: { label: "Sent for capture", variant: "success", trailIcon: "check" },
  AUTHORIZED: { label: "Authorised", variant: "warning" },
  REVERSED: { label: "Reversed", variant: "success", trailIcon: "check" },
  INPROGRESS: { label: "In progress", variant: "warning" },
  IN_PROGRESS: { label: "In progress", variant: "warning" },
  CAPTURE_STARTED: { label: "Capture started", variant: "warning" },
  SENT_FOR_REFUND: { label: "Sent for refund", variant: "refund" },
  REFUND_STARTED: { label: "Refund started", variant: "refund" },
  AUTH_REVERSAL_STARTED: { label: "Auth reversal", variant: "warning" },
  ISSUER_DECLINE: { label: "Issuer decline", variant: "danger", trailIcon: "x" },
  GENERAL_DECLINE: { label: "General decline", variant: "danger", trailIcon: "x" },
  CUSTOMER_CANCELLED: { label: "Customer cancelled", variant: "danger", trailIcon: "x" },
  AUTHENTICATION_TIMEOUT: { label: "Authentication timeout", variant: "danger", trailIcon: "x" },
  SYSTEM_ERROR: { label: "System error", variant: "danger", trailIcon: "x" },
  REQUEST_ERROR: { label: "Request error", variant: "danger", trailIcon: "x" },
  CONFIG_ERROR: { label: "Config error", variant: "danger", trailIcon: "x" },
  SYSTEM_DECLINED: { label: "System declined", variant: "danger", trailIcon: "x" },
  ABANDONED: { label: "Abandoned", variant: "danger", trailIcon: "x" },
  AUTHENTICATION_FAILED: { label: "Auth failed", variant: "danger", trailIcon: "x" },
  ALTPAY_DECLINE: { label: "Altpay decline", variant: "danger", trailIcon: "x" },
  MARKED_AS_FRAUD: { label: "Marked as fraud", variant: "danger", trailIcon: "x" },
  STEP_UP: { label: "Step up", variant: "warning" },
};

export function getStatusMeta(raw?: string): StatusMeta {
  if (!raw) return { label: "Unknown", variant: "muted" };
  const key = raw.toUpperCase().replace(/ /g, "_");
  return PA_STATUS_META[key] ?? { label: raw.replace(/_/g, " ").toLowerCase(), variant: "muted" };
}

// ── Payment method cell ───────────────────────────────────────────────────────
const STATIC_BASE = "https://static.payglocal.in/";

const CARD_BRAND_LOGO_MAPPER: Record<string, string> = {
  VISA: "images/network/visa.v2.svg",
  MASTERCARD: "images/network/mastercard-new.v1.svg",
  AMEX: "images/network/american-express.v3.svg",
  AMERICAN_EXPRESS: "images/network/american-express.v3.svg",
  DINERS: "images/network/diners.v3.svg",
  DINERSCLUBINTERNATIONAL: "images/network/diners.v3.svg",
  JCB: "images/network/jcb.v5.svg",
  MAESTRO: "images/network/maestro.v2.svg",
  RUPAY: "images/network/rupay.v3.svg",
  DISCOVER: "images/network/discover.v3.svg",
};

const PAYMENT_METHOD_ICONS: Record<string, string> = {
  ALTPAY_UPI_INTENT: "images/payment-methods/upi/upi-name.v2.svg",
  ALTPAY_UPI_COLLECT: "images/payment-methods/upi/upi-name.v2.svg",
  PAYMENT_ACCOUNT_GOOGLE_PAY: "images/payment-methods/upi/google-pay.v1.svg",
  PAYMENT_ACCOUNT_APPLE_PAY: "icons/payflow/apple-pay.v2.svg",
};

function MethodImage({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-5 rounded bg-muted border border-border overflow-hidden">
      {/* Absolute STATIC_BASE URL, and next.config declares no remotePatterns,
          so it is served unoptimized with explicit dimensions (h-3.5/w-5 in
          px), per CLAUDE.md. AppImage leaves absolute URLs untouched. */}
      <AppImage
        src={src}
        alt={alt}
        width={20}
        height={14}
        unoptimized
        className="h-3.5 w-5 object-contain"
      />
    </span>
  );
}

function FallbackBrand({ brand }: { brand?: string }) {
  return (
    <span className="inline-flex items-center justify-center min-w-8 h-5 px-1 rounded text-[9px] font-bold text-muted-foreground bg-muted border border-border">
      {brand ? brand.slice(0, 4).toUpperCase() : "CARD"}
    </span>
  );
}

function PaymentMethodCell({ row }: { row: PaTransaction }) {
  // The customer cancelled before paying, so no method was ever used: a dash,
  // not a placeholder card glyph that reads as "paid by some card".
  if (row.externalStatus === "CUSTOMER_CANCELLED") {
    return <span className="text-[13px] text-muted-foreground">{"\u2014"}</span>;
  }
  const instrument = row.paymentInstrument?.toUpperCase();
  const last4 = row.maskedCardNumber?.replaceAll("x", "").replaceAll("X", "").trim();

  let logo: React.ReactNode;

  if (row.maskedCardNumber && row.cardBrand) {
    const path = CARD_BRAND_LOGO_MAPPER[row.cardBrand.toUpperCase()];
    logo = path ? (
      <MethodImage src={STATIC_BASE + path} alt={row.cardBrand} />
    ) : (
      <FallbackBrand brand={row.cardBrand} />
    );
  } else if (instrument && PAYMENT_METHOD_ICONS[instrument]) {
    logo = <MethodImage src={STATIC_BASE + PAYMENT_METHOD_ICONS[instrument]} alt={instrument} />;
  } else {
    logo = <FallbackBrand brand={row.cardBrand} />;
  }

  return (
    <div className="flex items-center gap-1.5">
      {logo}
      <span className="text-[13px] text-foreground font-mono">
        {last4 ? `••• ${last4}` : "•••••••"}
      </span>
    </div>
  );
}

// ── Customer flag ─────────────────────────────────────────────────────────────
/**
 * The flag beside a customer's email: their country (`iso2Code`, the same
 * field PA's country filter searches) when the row has one, else the
 * transaction currency's country, since ISO 4217 codes lead with it (USD →
 * US, INR → IN; EUR has the EU flag), INR when that is missing too.
 */
function flagIso2(row: PaTransaction): string | undefined {
  const country = row.iso2Code?.trim();
  if (country && /^[A-Za-z]{2}$/.test(country)) return country.toUpperCase();
  // INR when unset, the same default the Amount column shows it in.
  const currency = (row.txnCurrency?.trim() || "INR").toUpperCase();
  if (currency.length !== 3) return undefined;
  return currency === "EUR" ? "EU" : currency.slice(0, 2);
}

// ── Column definitions ────────────────────────────────────────────────────────
export function buildPaColumns(isPartnerUser: boolean): Column<PaTransaction>[] {
  const cols: Column<PaTransaction>[] = [
    {
      key: "totalAmount",
      header: <AmountHeader />,
      align: "right",
      minWidth: 135,
      render: (row) => {
        const currency = row.txnCurrency ?? "INR";
        const amount = parseFloat(row.totalAmount ?? "0");
        return <AmountWithCode amount={formatCurrency(amount, currency)} code={currency} />;
      },
    },
    {
      key: "externalStatus",
      header: "Status",
      minWidth: 155,
      render: (row) => {
        const { label, variant, trailIcon } = getStatusMeta(row.externalStatus);
        return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
      },
    },
    {
      key: "paymentInstrument",
      header: "Payment Method",
      minWidth: 145,
      render: (row) => <PaymentMethodCell row={row} />,
    },
    {
      key: "encEmailId",
      header: "Customer Email",
      minWidth: 210,
      render: (row) => {
        const iso2 = flagIso2(row);
        // No email (or the backend's "N/A" placeholder) reads as a dash.
        const email = row.encEmailId?.trim();
        if (!email || email.toLowerCase() === "n/a") {
          return <span className="text-[13px] text-muted-foreground">—</span>;
        }
        return (
          <span className="flex items-center gap-2 whitespace-nowrap">
            {iso2 && <CountryFlag iso2={iso2} alt="" />}
            {/* Copy button revealed on row hover; it stops propagation, so
                copying never also opens the row's drawer. */}
            <CopyableCell
              value={email}
              label="Email"
              valueClassName="text-[13px] text-foreground lowercase"
            />
          </span>
        );
      },
    },
    {
      key: "gid",
      header: "Transaction ID",
      minWidth: 155,
      render: (row) => (
        // Shortened in the middle so the column stays narrow; the full ID is
        // what's copied (and in the tooltip), via the copy button revealed on
        // row hover.
        <CopyableCell
          value={row.gid}
          display={row.gid ? truncateId(row.gid) : undefined}
          label="Transaction ID"
          valueClassName="text-[13px] text-muted-foreground whitespace-nowrap"
        />
      ),
    },
    {
      key: "formattedCreationDateTime",
      header: "Date & Time",
      minWidth: 150,
      // Sent as `DD/MM/YYYY HH:mm:ss`. Rendering it straight through left this
      // one column reading in a form nothing else in either app uses.
      render: (row) => (
        <span className="text-[13px] text-muted-foreground whitespace-nowrap tabular-nums">
          {formatTimestamp(row.formattedCreationDateTime)}
        </span>
      ),
    },
  ];

  if (!isPartnerUser) return cols;

  // Insert Merchant ID column before Transaction ID for partner users
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
