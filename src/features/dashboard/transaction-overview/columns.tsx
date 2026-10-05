"use client";

import { Button, type Column, StatusBadge } from "@/components/ui";
import { formatCurrency, formatTransactionTimestamp } from "@/lib/utils/format";
import {
  CountryCell,
  getStatusMeta as getMcaStatusMeta,
} from "@/features/dashboard/mca-transactions/columns";
import {
  getStatusMeta as getPaStatusMeta,
  PaymentMethodCell,
} from "@/features/dashboard/pa-transactions/columns";
import { MCA_CURRENCY_FILTERS } from "@/features/dashboard/mca-transactions/constants";
import { MerchantLink } from "@/features/dashboard/merchant-portfolio/components/MerchantLink";
import type {
  PartnerTransaction,
  TransactionRail,
} from "@/features/dashboard/transaction-overview/types";

/**
 * Columns for the partner Transaction Overview. The cells are the ones the
 * Multi-Currency Accounts and Payments tables already render (same status
 * badges, payment-method logos, country cell, amount and timestamp treatment),
 * so this table reads exactly like theirs.
 *
 * The two tabs carry different columns, as they do in pg-dashboard's partner
 * view: Payment Gateway leads with payment method, customer and email;
 * Multi-Currency Accounts with the remitter's country and name, like the
 * merchant-side MCA table.
 */

/** Payment method filter options (Payment Gateway tab). */
export const METHOD_OPTIONS: { value: string; label: string }[] = [
  { value: "CARD", label: "Card" },
  { value: "UPI", label: "UPI" },
  { value: "GOOGLE_PAY", label: "Google Pay" },
  { value: "APPLE_PAY", label: "Apple Pay" },
];

/** How each MCA rail is named in the details drawer. */
export const MCA_METHOD_LABELS: Record<string, string> = {
  SWIFT: "SWIFT",
  ACH: "ACH",
  SEPA: "SEPA",
  FPS: "Faster Payments",
};

/** Currency filter options (Multi-Currency Accounts tab): the MCA table's own. */
export const CURRENCY_OPTIONS = MCA_CURRENCY_FILTERS;

/** Currencies the "Others" option stands for: anything not listed by name. */
const NAMED_CURRENCIES = MCA_CURRENCY_FILTERS.filter((o) => o.value !== "OTHER").map(
  (o) => o.value
);

export function matchesCurrencyFilter(currency: string, selected: string[]) {
  if (selected.length === 0) return true;
  if (selected.includes(currency)) return true;
  return selected.includes("OTHER") && !NAMED_CURRENCIES.includes(currency);
}

/** Status filter options per tab, labelled the way the badges are. */
export const STATUS_OPTIONS: Record<TransactionRail, { value: string; label: string }[]> = {
  PG: ["SUCCESS", "INPROGRESS", "AUTHORIZED", "SENT_FOR_REFUND", "ISSUER_DECLINE"].map((value) => ({
    value,
    label: getPaStatusMeta(value).label,
  })),
  MCA: [
    "FUNDS_ON_HOLD",
    "DOCUMENT_PENDING",
    "SENT_FOR_REVIEW",
    "SENT_FOR_SETTLEMENT",
    "SETTLED",
    "FIRC_SETTLED",
  ].map((value) => ({ value, label: getMcaStatusMeta(value, false).label })),
};

export function statusMetaFor(row: PartnerTransaction) {
  return row.rail === "PG" ? getPaStatusMeta(row.status) : getMcaStatusMeta(row.status, false);
}

export function methodLabel(row: PartnerTransaction) {
  if (row.rail === "MCA") return MCA_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod;
  return METHOD_OPTIONS.find((o) => o.value === row.paymentMethod)?.label ?? "—";
}

/** Always shown: a transaction row is unreadable without these. */
export const FIXED_COLUMN_KEYS = ["amount", "status", "createdAt"];

type Col = Column<PartnerTransaction>;

export const amountColumn: Col = {
  key: "amount",
  header: "Amount",
  minWidth: 135,
  align: "left",
  render: (row) => (
    <span className="flex items-baseline gap-1.5 whitespace-nowrap">
      <span className="font-semibold text-foreground tabular-nums text-[13px]">
        {formatCurrency(row.amount, row.currency, "en-US")}
      </span>
      <span className="text-[11px] text-muted-foreground font-medium">{row.currency}</span>
    </span>
  ),
};

export const statusColumn: Col = {
  key: "status",
  header: "Status",
  minWidth: 170,
  render: (row) => {
    const { label, variant, trailIcon } = statusMetaFor(row);
    return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
  },
};

export const paymentMethodColumn: Col = {
  key: "paymentMethod",
  header: "Payment method",
  minWidth: 145,
  render: (row) => <PaymentMethodCell row={row} />,
};

const customerNameColumn: Col = {
  key: "customerName",
  header: "Customer name",
  minWidth: 150,
  render: (row) => (
    <span className="block w-37.5 truncate text-[13px] text-foreground">
      {row.customerName || "—"}
    </span>
  ),
};

const emailColumn: Col = {
  key: "email",
  header: "Email",
  minWidth: 200,
  render: (row) => (
    <span className="text-[13px] text-muted-foreground whitespace-nowrap lowercase">
      {row.email || "—"}
    </span>
  ),
};

const countryColumn: Col = {
  key: "country",
  header: "Country",
  minWidth: 140,
  // Same override the MCA table uses so the flag + name never clips.
  cellClassName: "overflow-visible",
  render: (row) => <CountryCell iso2={row.country} />,
};

const remitterNameColumn: Col = {
  key: "customerName",
  header: "Remitter name",
  minWidth: 200,
  render: (row) => (
    <span className="block w-37.5 truncate text-[13px] text-foreground">
      {row.customerName || "—"}
    </span>
  ),
};

const merchantIdColumn: Col = {
  key: "merchantId",
  header: "Merchant",
  minWidth: 170,
  // The merchant's name and ID, opening its Merchant Portfolio page.
  render: (row) => <MerchantLink merchantId={row.merchantId} showId />,
};

export const transactionIdColumn: Col = {
  key: "transactionId",
  header: "Transaction ID",
  minWidth: 170,
  render: (row) => (
    <span className="text-[13px] font-mono text-muted-foreground whitespace-nowrap">{row.id}</span>
  ),
};

export const dateColumn: Col = {
  key: "createdAt",
  header: "Date & Time",
  minWidth: 150,
  render: (row) => (
    <span className="text-[13px] text-muted-foreground whitespace-nowrap">
      {formatTransactionTimestamp(row.createdAt)}
    </span>
  ),
};

/** The row's "open" control: hidden until hover/focus, opacity only so it
 *  never shifts the layout. Same treatment as the MCA table's. */
function actionColumn(onOpenDetails: (row: PartnerTransaction) => void): Col {
  return {
    key: "action",
    header: "",
    minWidth: 120,
    render: (row) => (
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails(row);
          }}
          className="h-auto min-h-0 rounded-md px-2 py-1 text-[11px] whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          View details
        </Button>
      </div>
    ),
  };
}

export function buildTransactionOverviewColumns(
  rail: TransactionRail,
  { onOpenDetails }: { onOpenDetails: (row: PartnerTransaction) => void }
): Col[] {
  const data =
    rail === "PG"
      ? [
          amountColumn,
          statusColumn,
          paymentMethodColumn,
          customerNameColumn,
          emailColumn,
          merchantIdColumn,
          transactionIdColumn,
          dateColumn,
        ]
      : [
          amountColumn,
          statusColumn,
          countryColumn,
          remitterNameColumn,
          merchantIdColumn,
          transactionIdColumn,
          dateColumn,
        ];
  return [...data, actionColumn(onOpenDetails)];
}
