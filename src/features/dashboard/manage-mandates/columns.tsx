"use client";

import type { ReactNode } from "react";
import { type Column, StatusBadge, formatTimestamp } from "@/components/ui";
import { LinkedId } from "@/features/dashboard/manage-mandates/components/LinkedId";
import {
  formatCompactDate,
  formatMandateAmount,
  getMandateStatusMeta,
} from "@/features/dashboard/manage-mandates/helpers";
import type { Mandate } from "@/features/dashboard/manage-mandates/types";

const TEXT = "text-[13px] text-foreground whitespace-nowrap";
const NUMBER = "text-[13px] tabular-nums text-foreground";

export function MandateStatusBadge({ status }: { status: string }) {
  const { label, variant, trailIcon } = getMandateStatusMeta(status);
  return <StatusBadge variant={variant} label={label} trailIcon={trailIcon} size="sm" />;
}

function text(value: string | null | undefined) {
  return <span className={TEXT}>{value || "—"}</span>;
}

/** Dates and times are muted, as in every table (see pa-transactions). */
function dateText(value: string | null | undefined) {
  return (
    <span className="text-[13px] text-muted-foreground whitespace-nowrap">{value || "—"}</span>
  );
}

/**
 * pg-dashboard's mandate columns, every one of them, in its order and under
 * its headers (sentence-cased to match this app). SI ID opens the SI's
 * transactions (on the Transactions page) and Initiate transaction GID the
 * payment that set the mandate up, as there. Which columns show is the merchant's call (Columns picker).
 */
export function buildMandateColumns({
  onOpenSiTransactions,
  onOpenInitiateTransaction,
  renderActions,
}: {
  onOpenSiTransactions: (row: Mandate) => void;
  onOpenInitiateTransaction: (row: Mandate) => void;
  renderActions: (row: Mandate) => ReactNode;
}): Column<Mandate>[] {
  return [
    { key: "mid", header: "Merchant ID", minWidth: 150, render: (row) => text(row.mid) },
    {
      key: "siId",
      header: "SI ID",
      minWidth: 150,
      render: (row) => (
        <LinkedId
          id={row.siId}
          label="SI ID"
          truncate={false}
          onOpen={() => onOpenSiTransactions(row)}
        />
      ),
    },
    {
      key: "maskedMandateId",
      header: "Mandate ID",
      minWidth: 160,
      render: (row) => (
        <span className="tabular-nums text-[12.5px] whitespace-nowrap text-foreground">
          {row.maskedMandateId || "—"}
        </span>
      ),
    },
    {
      key: "mandateStatus",
      header: "Status",
      minWidth: 120,
      render: (row) => <MandateStatusBadge status={row.mandateStatus} />,
    },
    { key: "type", header: "SI type", minWidth: 110, render: (row) => text(row.type) },
    {
      key: "maxAmount",
      header: "SI max amount",
      minWidth: 140,
      render: (row) => (
        <span className="text-[13px] font-semibold tabular-nums whitespace-nowrap text-foreground">
          {formatMandateAmount(row)}
        </span>
      ),
    },
    {
      key: "initiateGid",
      header: "Initiate transaction GID",
      minWidth: 190,
      render: (row) => (
        <LinkedId
          id={row.initiateGid}
          label="Transaction ID"
          onOpen={() => onOpenInitiateTransaction(row)}
        />
      ),
    },
    {
      key: "initiateTxnCurrency",
      header: "Initiate transaction currency",
      minWidth: 200,
      render: (row) => text(row.initiateTxnCurrency),
    },
    {
      key: "initiateProcessorCurrency",
      header: "Initiate processor currency",
      minWidth: 200,
      render: (row) => text(row.initiateProcessorCurrency),
    },
    {
      key: "frequency",
      header: "SI frequency",
      minWidth: 120,
      render: (row) => text(row.frequency),
    },
    {
      key: "numberOfPayments",
      header: "No. of payments",
      minWidth: 130,
      render: (row) => <span className={NUMBER}>{row.numberOfPayments || "—"}</span>,
    },
    {
      key: "numberOfPaymentsProcessed",
      header: "Payments processed",
      minWidth: 150,
      render: (row) => <span className={NUMBER}>{row.numberOfPaymentsProcessed || "—"}</span>,
    },
    {
      key: "numberOfPaymentsRemaining",
      header: "Payments remaining",
      minWidth: 150,
      render: (row) => <span className={NUMBER}>{row.numberOfPaymentsRemaining || "—"}</span>,
    },
    {
      key: "startDate",
      header: "Start date",
      minWidth: 120,
      render: (row) => dateText(formatCompactDate(row.startDate)),
    },
    {
      key: "mandateCreationTime",
      header: "Creation time",
      minWidth: 170,
      render: (row) => dateText(formatTimestamp(row.mandateCreationTime)),
    },
    {
      key: "mandateExpiryTime",
      header: "Expiry time",
      minWidth: 170,
      render: (row) => dateText(formatTimestamp(row.mandateExpiryTime)),
    },
    {
      // Keyed "action" so reorderColumns keeps it last, and pinned to the
      // right edge so the row's menu is in reach however far the grid is
      // scrolled. Its left edge is a 1px rule plus a soft shadow where the
      // scrolling cells pass under it, both as box-shadows: a border on a
      // sticky cell stays behind with the collapsed table borders.
      key: "action",
      header: "Actions",
      minWidth: 80,
      // `mandate-actions` marks the cells for the table's sticky-cell fills
      // (see ManageMandatesTable).
      cellClassName:
        "mandate-actions sticky right-0 z-[2] shadow-[inset_1px_0_0_var(--border),-6px_0_8px_-6px_rgba(0,0,0,0.12)]",
      render: renderActions,
    },
  ];
}
