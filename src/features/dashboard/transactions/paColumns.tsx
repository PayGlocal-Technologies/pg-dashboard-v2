"use client";

import type React from "react";
import { type Column, StatusBadge } from "@/components/ui";
import type { BadgeVariant, BadgeTrailIcon } from "@payglocal_ui/flux-ui";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

// ── Status mapping: raw API value → display meta ──────────────────────────────
type StatusMeta = { label: string; variant: BadgeVariant; trailIcon?: BadgeTrailIcon };

const PA_STATUS_META: Record<string, StatusMeta> = {
  SUCCESS:                { label: "Success",              variant: "success", trailIcon: "check" },
  SENT_FOR_CAPTURE:       { label: "Sent for capture",     variant: "success", trailIcon: "check" },
  AUTHORIZED:             { label: "Authorized",           variant: "warning" },
  REVERSED:               { label: "Reversed",             variant: "success", trailIcon: "check" },
  INPROGRESS:             { label: "In progress",          variant: "warning" },
  IN_PROGRESS:            { label: "In progress",          variant: "warning" },
  CAPTURE_STARTED:        { label: "Capture started",      variant: "warning" },
  SENT_FOR_REFUND:        { label: "Sent for refund",      variant: "refund" },
  REFUND_STARTED:         { label: "Refund started",       variant: "refund" },
  AUTH_REVERSAL_STARTED:  { label: "Auth reversal",        variant: "warning" },
  ISSUER_DECLINE:         { label: "Issuer decline",       variant: "danger",  trailIcon: "x" },
  GENERAL_DECLINE:        { label: "General decline",      variant: "danger",  trailIcon: "x" },
  CUSTOMER_CANCELLED:     { label: "Cancelled",            variant: "danger",  trailIcon: "x" },
  AUTHENTICATION_TIMEOUT: { label: "Auth timeout",         variant: "danger",  trailIcon: "x" },
  SYSTEM_ERROR:           { label: "System error",         variant: "danger",  trailIcon: "x" },
  REQUEST_ERROR:          { label: "Request error",        variant: "danger",  trailIcon: "x" },
  CONFIG_ERROR:           { label: "Config error",         variant: "danger",  trailIcon: "x" },
  SYSTEM_DECLINED:        { label: "System declined",      variant: "danger",  trailIcon: "x" },
  ABANDONED:              { label: "Abandoned",            variant: "danger",  trailIcon: "x" },
  AUTHENTICATION_FAILED:  { label: "Auth failed",          variant: "danger",  trailIcon: "x" },
  ALTPAY_DECLINE:         { label: "Altpay decline",       variant: "danger",  trailIcon: "x" },
  MARKED_AS_FRAUD:        { label: "Marked as fraud",      variant: "danger",  trailIcon: "x" },
  STEP_UP:                { label: "Step up",              variant: "warning" },
};

function getStatusMeta(raw?: string): StatusMeta {
  if (!raw) return { label: "Unknown", variant: "muted" };
  const key = raw.toUpperCase().replace(/ /g, "_");
  return PA_STATUS_META[key] ?? { label: raw.replace(/_/g, " ").toLowerCase(), variant: "muted" };
}

// ── Payment method cell ───────────────────────────────────────────────────────
const STATIC_BASE = "https://static.payglocal.in/";

const CARD_BRAND_LOGO_MAPPER: Record<string, string> = {
  VISA:                   "images/network/visa.v2.svg",
  MASTERCARD:             "images/network/mastercard-new.v1.svg",
  AMEX:                   "images/network/american-express.v3.svg",
  AMERICAN_EXPRESS:       "images/network/american-express.v3.svg",
  DINERS:                 "images/network/diners.v3.svg",
  DINERSCLUBINTERNATIONAL:"images/network/diners.v3.svg",
  JCB:                    "images/network/jcb.v5.svg",
  MAESTRO:                "images/network/maestro.v2.svg",
  RUPAY:                  "images/network/rupay.v3.svg",
  DISCOVER:               "images/network/discover.v3.svg",
};

const PAYMENT_METHOD_ICONS: Record<string, string> = {
  ALTPAY_UPI_INTENT:          "images/payment-methods/upi/upi-name.v2.svg",
  ALTPAY_UPI_COLLECT:         "images/payment-methods/upi/upi-name.v2.svg",
  PAYMENT_ACCOUNT_GOOGLE_PAY: "images/payment-methods/upi/google-pay.v1.svg",
  PAYMENT_ACCOUNT_APPLE_PAY:  "icons/payflow/apple-pay.v2.svg",
};

function MethodImage({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="inline-flex items-center justify-center w-8 h-5 rounded bg-muted border border-border overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-3.5 w-5 object-contain" />
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
  const instrument = row.paymentInstrument?.toUpperCase();
  const last4 = row.maskedCardNumber?.replaceAll("x", "").replaceAll("X", "").trim();

  let logo: React.ReactNode;

  if (row.maskedCardNumber && row.cardBrand) {
    const path = CARD_BRAND_LOGO_MAPPER[row.cardBrand.toUpperCase()];
    logo = path
      ? <MethodImage src={STATIC_BASE + path} alt={row.cardBrand} />
      : <FallbackBrand brand={row.cardBrand} />;
  } else if (instrument && PAYMENT_METHOD_ICONS[instrument]) {
    logo = <MethodImage src={STATIC_BASE + PAYMENT_METHOD_ICONS[instrument]} alt={instrument} />;
  } else {
    logo = <FallbackBrand brand={row.cardBrand} />;
  }

  return (
    <div className="flex items-center gap-1.5">
      {logo}
      <span className="text-[13px] text-muted-foreground font-mono">
        {last4 ? `••• ${last4}` : "•••••••"}
      </span>
    </div>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────
export function buildPaColumns(isPartnerUser: boolean): Column<PaTransaction>[] {
  const cols: Column<PaTransaction>[] = [
    {
      key: "totalAmount",
      header: "Amount",
      minWidth: 135,
      align: "right",
      render: (row) => {
        const currency = row.txnCurrency ?? "INR";
        const amount = parseFloat(row.totalAmount ?? "0");
        return (
          <div className="flex items-baseline gap-1.5 whitespace-nowrap justify-end">
            <span className="font-semibold text-foreground tabular-nums text-[13px]">
              {formatCurrency(amount, currency)}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">{currency}</span>
          </div>
        );
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
      header: "Payment method",
      minWidth: 145,
      render: (row) => <PaymentMethodCell row={row} />,
    },
    {
      key: "customerName",
      header: "Customer name",
      minWidth: 145,
      render: (row) => {
        const name = [
          row.firstName ?? row.billToFirstName,
          row.lastName  ?? row.billToLastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        return (
          <span className="text-[13px] font-medium text-foreground whitespace-nowrap">
            {name || "—"}
          </span>
        );
      },
    },
    {
      key: "encEmailId",
      header: "Email",
      minWidth: 185,
      render: (row) => (
        <span className="text-[13px] text-muted-foreground whitespace-nowrap lowercase">
          {row.encEmailId ?? "—"}
        </span>
      ),
    },
    {
      key: "gid",
      header: "Transaction ID",
      minWidth: 155,
      render: (row) => (
        <span className={cn("text-[13px] font-mono text-primary/70 hover:text-primary transition-colors cursor-pointer whitespace-nowrap")}>
          {row.gid ?? "—"}
        </span>
      ),
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

  // Insert Merchant ID column before Transaction ID for partner users
  cols.splice(5, 0, {
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
