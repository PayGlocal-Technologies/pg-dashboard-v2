"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Card,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Separator,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type Column,
} from "@/components/ui";
import { COUNTRIES } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { CopyableValue } from "@/components/common/CopyableValue";
import { SettlementReportInfoPanel } from "@/features/dashboard/settlement-reports/components/SettlementReportInfoPanel";
import { ReleasedFromHoldInfoPanel } from "@/features/dashboard/settlement-reports/components/ReleasedFromHoldInfoPanel";
import { FundsOnHoldCard } from "@/features/dashboard/settlement-reports/components/FundsOnHoldCard";
import {
  SETTLEMENT_STATUS_META,
  isSettlementComplete,
} from "@/features/dashboard/settlement-reports/columns";
import { settlementDetailsById } from "@/features/dashboard/settlement-reports/mock-data";
import {
  processingBannerCopy,
  utrPendingReason,
} from "@/features/dashboard/settlement-reports/settlementCopy";
import type {
  McaPaymentStatus,
  McaSettlementPayment,
  SettlementPayment,
} from "@/features/dashboard/settlement-reports/types";

const LIST_PATH = "/reports/settlement-report";

/** "UTR2603120001" → "UTR26....0001" */
function truncateMiddle(value: string): string {
  if (value.length <= 9) return value;
  return `${value.slice(0, 5)}....${value.slice(-4)}`;
}

interface BreakupRowProps {
  label: string;
  value: number;
  muted?: boolean;
  negative?: boolean;
  emphasis?: boolean;
  indent?: boolean;
}

function BreakupRow({ label, value, muted, negative, emphasis, indent }: BreakupRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 py-2.5", indent && "pl-4")}>
      <span
        className={cn(
          "text-sm",
          emphasis
            ? "font-semibold text-foreground"
            : muted
              ? "text-muted-foreground"
              : "font-medium text-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums text-sm",
          emphasis
            ? "font-semibold text-foreground"
            : muted
              ? "text-muted-foreground"
              : "font-medium text-foreground"
        )}
      >
        {negative ? "−" : ""}
        {formatCurrency(Math.abs(value), "INR")}
      </span>
    </div>
  );
}

function buildPaymentColumns(onReleasedInfoClick: () => void): Column<SettlementPayment>[] {
  return [
    {
      key: "createdOn",
      header: "Created on",
      minWidth: 160,
      cellClassName: "pl-5",
      render: (p) => (
        <span className="whitespace-nowrap text-[13px] text-muted-foreground">
          {formatDate(p.createdOn)}
        </span>
      ),
    },
    {
      key: "id",
      header: "Transaction ID",
      minWidth: 190,
      render: (p) => (
        <div className="flex flex-col items-start gap-1">
          <span className="whitespace-nowrap font-mono text-[13px] text-primary/80">{p.id}</span>
          {p.releasedFromHold && (
            <div className="flex items-center gap-1">
              <StatusBadge variant="info" label="Released from hold" trailIcon="check" size="sm" />
              <Button
                type="button"
                variant="ghost"
                onClick={onReleasedInfoClick}
                aria-label="About released holds"
                className="h-4 w-4 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
              >
                <Icon name="info" size={11} />
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "paymentMethod",
      header: "Payment method",
      minWidth: 130,
      render: (p) => <span className="text-[13px] text-muted-foreground">{p.paymentMethod}</span>,
    },
    {
      key: "grossAmount",
      header: "Gross amount",
      minWidth: 130,
      align: "right",
      render: (p) => (
        <span className="whitespace-nowrap tabular-nums text-[13px] font-medium text-foreground">
          {formatCurrency(p.grossAmount, "INR")}
        </span>
      ),
    },
    {
      key: "deductions",
      header: "Deductions",
      minWidth: 130,
      align: "right",
      render: (p) => (
        <span className="whitespace-nowrap tabular-nums text-[13px] text-foreground">
          −{formatCurrency(p.deductions, "INR")}
        </span>
      ),
    },
    {
      key: "netAmount",
      header: "Net amount",
      minWidth: 130,
      align: "right",
      cellClassName: "pr-5",
      render: (p) => (
        <span className="whitespace-nowrap tabular-nums text-[13px] font-semibold text-foreground">
          {formatCurrency(p.netAmount, "INR")}
        </span>
      ),
    },
  ];
}

// invoice_pending/under_review never appear here, see the McaPaymentStatus
// doc comment in types.ts, but the map stays exhaustive over the full type.
const MCA_PAYMENT_STATUS_META: Record<
  McaPaymentStatus,
  { label: string; variant: "success" | "warning" | "info"; trailIcon: "check" | "clock" }
> = {
  invoice_pending: { label: "Invoice Upload", variant: "warning", trailIcon: "clock" },
  under_review: { label: "Under Review", variant: "info", trailIcon: "clock" },
  processing: { label: "Processing", variant: "warning", trailIcon: "clock" },
  settled: { label: "Settled", variant: "success", trailIcon: "check" },
};

function countryFlag(countryCode: string): string {
  return COUNTRIES.find((c) => c.code === countryCode)?.flag ?? "";
}

/** MCA settlements bundle individual cross-border remittances, each with its
 * own review history, rather than card/UPI/Net Banking payments split off
 * one settlement total, so this table is shaped completely differently from
 * buildPaymentColumns above: amount + currency per remittance, a per-payment
 * status, remitter and origin country. Every payment here has already
 * cleared invoice review to be part of this settlement, so unlike an earlier
 * version of this table there's no "Upload Invoice" action, that only
 * applies to transactions still waiting to be bundled, see the "Upcoming
 * settlement" card's Upload Invoice CTA instead. */
function buildMcaPaymentColumns(): Column<McaSettlementPayment>[] {
  return [
    {
      key: "amount",
      header: "Amount",
      minWidth: 130,
      cellClassName: "pl-5",
      render: (p) => (
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="font-semibold tabular-nums text-[13px] text-foreground">
            {formatCurrency(p.amount, p.currency)}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">{p.currency}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Settlement Status",
      minWidth: 150,
      render: (p) => {
        const meta = MCA_PAYMENT_STATUS_META[p.status];
        return (
          <StatusBadge
            variant={meta.variant}
            label={meta.label}
            trailIcon={meta.trailIcon}
            size="sm"
          />
        );
      },
    },
    {
      key: "createdOn",
      header: "Date & Time",
      minWidth: 160,
      render: (p) => (
        <span className="whitespace-nowrap text-[13px] text-muted-foreground">
          {formatDate(p.createdOn)}
        </span>
      ),
    },
    {
      key: "country",
      header: "Country",
      minWidth: 140,
      render: (p) => (
        <span className="whitespace-nowrap text-[13px] text-foreground">
          {countryFlag(p.countryCode)} {p.countryName}
        </span>
      ),
    },
    {
      key: "remitterName",
      header: "Remitter Name",
      minWidth: 130,
      cellClassName: "pr-5",
      render: (p) => (
        <span className="whitespace-nowrap text-[13px] text-foreground">{p.remitterName}</span>
      ),
    },
  ];
}

interface SettlementDetailFeatureProps {
  settlementId: string;
}

export function SettlementDetailFeature({ settlementId }: SettlementDetailFeatureProps) {
  const router = useRouter();
  const [showReportInfo, setShowReportInfo] = useState(false);
  const [showReleasedInfo, setShowReleasedInfo] = useState(false);
  const detail = settlementDetailsById[settlementId];

  if (!detail) {
    return (
      <div className="page-enter mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Icon name="alert-circle" size={22} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Settlement not found</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              This settlement ID doesn&apos;t match any record.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(LIST_PATH)}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const {
    settlement,
    grossAmount,
    gst,
    platformFee,
    initiatedAt,
    depositedAt,
    expectedAt,
    payments,
    mcaPayments,
    heldFunds,
  } = detail;
  const isSettled = isSettlementComplete(settlement.status);
  const statusMeta = SETTLEMENT_STATUS_META[settlement.status];
  const netAmountLabel = formatCurrency(settlement.amount, settlement.currency);
  const bannerCopy = processingBannerCopy(settlement);
  const releasedPayments = payments.filter((p) => p.releasedFromHold);

  // Only one side panel shows at a time, opening one closes the other rather
  // than stacking two asides.
  function openReportInfo() {
    setShowReleasedInfo(false);
    setShowReportInfo(true);
  }

  function openReleasedInfo() {
    setShowReportInfo(false);
    setShowReleasedInfo(true);
  }

  // TODO(integration): wire up to the real settlement report download
  // endpoint once it exists, see the list page's "Export" action, which is
  // the same mock-only placeholder.
  function handleDownloadReport(format: "CSV" | "Excel" | "PDF") {
    toast.success("Download started", {
      description: `Preparing ${format} report for ${settlement.id}`,
    });
  }

  // A report can exist mid-processing (see settlement.reportAvailable), it's
  // deliberately independent of `isSettled`, a report being ready never
  // implies the bank transfer itself is complete. Format choice is an
  // inline dropdown menu, not a modal, so picking a format doesn't
  // interrupt whatever else the merchant is doing on this page.
  const downloadReportButton = settlement.reportAvailable ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
        >
          Download Report
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownloadReport("CSV")}>
          <Icon name="file-text" className="h-3.5 w-3.5" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownloadReport("Excel")}>
          <Icon name="file-text" className="h-3.5 w-3.5" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownloadReport("PDF")}>
          <Icon name="file-text" className="h-3.5 w-3.5" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              aria-disabled
              title="Report not available yet"
              leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
            >
              Download Report
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Report not available yet
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden">
      <Button
        type="button"
        variant="link"
        className="h-auto w-fit gap-1 p-0 text-sm font-medium"
        leftIcon={<Icon name="chevron-left" size={14} />}
        onClick={() => router.push(LIST_PATH)}
      >
        Go Back
      </Button>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          {/* Page header, the settlement amount is the page's identity, status
           * sits inline next to it as a compact chip, not a floating summary
           * widget. */}
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                {isSettled ? "Settlement amount" : "Expected settlement amount"}
              </p>
              <div className="mt-1 flex items-center gap-3">
                <p className="text-4xl font-bold tracking-tight text-foreground tabular-nums">
                  {netAmountLabel}
                </p>
                <StatusBadge
                  variant={statusMeta.variant}
                  label={statusMeta.label}
                  trailIcon={statusMeta.trailIcon}
                  size="sm"
                />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {isSettled ? (
                  <span>
                    Deposited on{" "}
                    {formatDate(depositedAt!, {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                ) : (
                  <>
                    <span>
                      Initiated on{" "}
                      {formatDate(initiatedAt, {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                    <Separator orientation="vertical" className="h-3" />
                    <span>
                      Expected settlement:{" "}
                      {formatDate(expectedAt, {
                        month: "short",
                        day: "2-digit",
                        year: "numeric",
                      })}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {downloadReportButton}
              <Button
                type="button"
                variant="ghost"
                onClick={openReportInfo}
                aria-label="About this settlement"
                className="h-9 w-9 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
              >
                <Icon name="info" size={15} />
              </Button>
            </div>
          </div>

          {/* Processing only, a settled settlement needs no further
           * explanation beyond the status chip above. A thin single-strip
           * banner, not a boxed callout, so it reads as a status line rather
           * than an alarming block. Ties the exact same copy used by the
           * table's UTR tooltip (see settlementCopy.ts) so the wording never
           * contradicts itself across the two surfaces. */}
          {!isSettled && (
            <div
              className={cn(
                "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-1.5 text-xs leading-relaxed",
                settlement.affectedByNonWorkingDay
                  ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                  : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200"
              )}
            >
              <Icon
                name={settlement.affectedByNonWorkingDay ? "alert-triangle" : "info"}
                size={13}
                className="shrink-0"
              />
              <p className="min-w-0 flex-1">
                <span className="font-semibold">{bannerCopy.title}.</span> {bannerCopy.body}
              </p>
            </div>
          )}

          {/* Details and Amount Breakdown, separate cards, side by side. Grid
           * items stretch (default, no items-start) so both cards share the same
           * height regardless of which has more rows, Details uses a tighter
           * gap-3/gap-4 rhythm than the original gap-5/gap-6 specifically so its
           * natural height stays close to Amount Breakdown's instead of
           * stretching it with empty space. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="gap-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">Details</h2>
              {/* All fields share the same value typography, separated by the
               * same Separator used elsewhere, no quadrant grid / cross-dividers. */}
              <div className="flex flex-col gap-3">
                <CopyableValue
                  layout="stack"
                  className="gap-1.5 p-0"
                  label="Settlement ID"
                  value={settlement.id}
                  tooltip="Unique identifier for this settlement batch."
                />

                <Separator />

                <div className="flex flex-col gap-1.5">
                  {settlement.utrNumber ? (
                    <CopyableValue
                      layout="stack"
                      className="gap-1.5 p-0"
                      label="UTR Number"
                      value={truncateMiddle(settlement.utrNumber)}
                      copyValue={settlement.utrNumber}
                      tooltip="Unique Transaction Reference issued by the bank."
                      valueClassName="text-primary"
                    />
                  ) : (
                    <CopyableValue
                      layout="stack"
                      className="gap-1.5 p-0"
                      label="UTR Number"
                      value="Not generated yet"
                      copyable={false}
                      tooltip={utrPendingReason(settlement)}
                      valueClassName="text-muted-foreground"
                    />
                  )}
                </div>

                <Separator />

                <CopyableValue
                  layout="stack"
                  className="gap-1.5 p-0"
                  label="Bank Account"
                  value={settlement.bankAccount}
                  copyable={false}
                />

                <Separator />

                <CopyableValue
                  layout="stack"
                  className="gap-1.5 p-0"
                  label="Transactions"
                  value={`${settlement.transactionCount} Transactions`}
                  copyable={false}
                />
              </div>
            </Card>

            <Card className="min-w-0 gap-4 p-5">
              <h2 className="text-sm font-semibold text-foreground">Amount Breakdown</h2>
              <div className="divide-y divide-border">
                <BreakupRow label="Gross Settlements" value={grossAmount} />
                <BreakupRow label="Payment" value={grossAmount} muted />
                <BreakupRow label="Deductions" value={gst + platformFee} negative />
                <BreakupRow
                  label="Goods and services tax (GST)"
                  value={gst}
                  muted
                  negative
                  indent
                />
                <BreakupRow
                  label="Platform fee charged on payments"
                  value={platformFee}
                  muted
                  negative
                  indent
                />
                <BreakupRow
                  label={isSettled ? "Net Settlement" : "Expected Net Settlement"}
                  value={settlement.amount}
                  emphasis
                />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Net settlement is the amount{" "}
                {isSettled ? "transferred" : "scheduled to be transferred"} to your registered bank
                account.
              </p>
            </Card>
          </div>

          {/* Funds on Hold, only rendered when this settlement actually has
           * held transactions, so it never appears as empty/placeholder chrome.
           * Sits between the Details/Amount Breakdown row and the Payments
           * table per the requested hierarchy. */}
          {heldFunds && <FundsOnHoldCard heldFunds={heldFunds} currency={settlement.currency} />}

          {/* Payments, full width; this table is the settlement's evidence and
           * gets the most visual room, no longer sharing a row with Timeline. */}
          <Card className="gap-0 overflow-hidden p-0">
            <div className="px-5 pb-3 pt-5">
              <h2 className="text-sm font-semibold text-foreground">Payments in this settlement</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Payments ({settlement.transactionCount})
              </p>
              {releasedPayments.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1">
                  <StatusBadge
                    variant="info"
                    label={`${releasedPayments.length} released from hold`}
                    trailIcon="check"
                    size="sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={openReleasedInfo}
                    aria-label="About released holds"
                    className="h-4 w-4 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
                  >
                    <Icon name="info" size={11} />
                  </Button>
                </div>
              )}
            </div>
            {mcaPayments ? (
              <DataTable
                columns={buildMcaPaymentColumns()}
                data={mcaPayments}
                rowKey={(p) => p.id}
                density="compact"
                tableLayout="content"
                className="rounded-none border-0 border-t border-border"
              />
            ) : (
              <DataTable
                columns={buildPaymentColumns(openReleasedInfo)}
                data={payments}
                rowKey={(p) => p.id}
                density="compact"
                tableLayout="content"
                className="rounded-none border-0 border-t border-border"
              />
            )}
          </Card>
        </div>

        {(showReportInfo || showReleasedInfo) && (
          <aside className="w-[320px] shrink-0 animate-in fade-in slide-in-from-right-4 duration-300">
            {showReportInfo && (
              <SettlementReportInfoPanel
                onClose={() => setShowReportInfo(false)}
                settlement={settlement}
              />
            )}
            {showReleasedInfo && (
              <ReleasedFromHoldInfoPanel
                onClose={() => setShowReleasedInfo(false)}
                payments={releasedPayments}
              />
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
