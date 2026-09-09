"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, DataTable, Separator, StatusBadge, type Column } from "@/components/ui";
import { COUNTRIES } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { CopyableValue } from "@/components/common/CopyableValue";
import { SettlementReportInfoPanel } from "@/features/dashboard/settlement-reports/components/SettlementReportInfoPanel";
import { mockSettlementDetail } from "@/features/dashboard/settlement-reports/mock-data";
import { getStatusMeta } from "@/features/dashboard/mca-transactions/columns";
import type { McaSettlementPayment } from "@/features/dashboard/settlement-reports/types";
import { settlementListPath } from "@/features/dashboard/settlement-reports/routes";
import { toProductType, type NavContext } from "@/stores/useProductContext";
import { useSettlementReportDownload } from "@/features/dashboard/settlement-reports/hooks";

interface BreakupRowProps {
  label: string;
  value: number;
  muted?: boolean;
  negative?: boolean;
  emphasis?: boolean;
  /** 1 explains the line above it, 2 explains that explanation. Two levels is
   *  the limit: the fee discounts sit at 2 and nothing goes deeper. */
  indent?: 1 | 2;
}

function BreakupRow({ label, value, muted, negative, emphasis, indent }: BreakupRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2.5",
        indent === 1 && "pl-4",
        indent === 2 && "pl-8"
      )}
    >
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

function countryFlag(countryCode: string): string {
  return COUNTRIES.find((c) => c.code === countryCode)?.flag ?? "";
}

/** A settlement bundles individual cross-border remittances, each with its own
 * review history: amount and currency per remittance, a per-payment status,
 * remitter and origin country. Every payment here has already cleared invoice
 * review to be part of this settlement, so there is no "Upload Invoice" action
 * — that only applies to transactions still waiting to be bundled, see the
 * "Upcoming settlement" card's Upload Invoice CTA instead. */
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
      // Badged through mca-transactions' own map, so a payment inside a
      // settlement reads exactly as the same payment does on that table.
      render: (p) => {
        const meta = getStatusMeta(p.status, false);
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
  /** The account this settlement belongs to. Both halves of the key come from
   *  the route — see settlementDetailPath in routes.ts for why. */
  merchantId: string;
  /** YYYY-MM-DD. */
  settlementDate: string;
  /** Which product's list to go back to. Comes from the route, as on the list
   *  screen. */
  product: NavContext;
}

export function SettlementDetailFeature({
  merchantId,
  settlementDate,
  product,
}: SettlementDetailFeatureProps) {
  const router = useRouter();
  const listPath = settlementListPath(product);
  // Same hook the list page uses, so a report downloaded from here and from a
  // row behave identically. See useSettlementReportDownload.
  const { download: downloadSettlementReport } = useSettlementReportDownload(
    toProductType(product)
  );
  const [showReportInfo, setShowReportInfo] = useState(false);
  const detail = mockSettlementDetail(merchantId, settlementDate);

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
              No settlement was found for this date on this account.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.push(listPath)}>
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const {
    settlement,
    account,
    grossAmount,
    discountAmount,
    offerDiscountAmount,
    gst,
    platformFee,
    payments,
  } = detail;
  const netAmountLabel = formatCurrency(settlement.amount, settlement.currency);

  /**
   * PayGlocal's discounts on the platform fee. `platformFee` is already net of
   * them, so they are shown as a nested explanation of that line rather than as
   * deductions of their own: the Amount Breakdown column is something the
   * merchant reads downward and checks against their bank credit, and a row
   * that did not participate in the sum would make it look wrong.
   */
  const feeBeforeDiscount =
    Math.round((platformFee + discountAmount + offerDiscountAmount) * 100) / 100;
  const hasFeeDiscount = discountAmount > 0 || offerDiscountAmount > 0;

  // TODO(integration): wire up to the real settlement report download
  // endpoint once it exists, see the list page's "Export" action, which is
  // the same mock-only placeholder.
  /** Same call a row's Download button makes: one settlement's report, keyed by
   *  its settlement date. No format choice — the endpoint produces one format,
   *  so offering three would have been a menu over a single outcome. */
  function handleDownloadReport() {
    downloadSettlementReport(settlement.date, settlement.merchantId);
  }

  // Always offered: a report is generated for every settlement, including one
  // still processing — it depends on the underlying payments, not on the bank
  // transfer's progress. There is no "not available yet" state to render.
  const downloadReportButton = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleDownloadReport}
      leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
    >
      Download Report
    </Button>
  );

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden">
      <Button
        type="button"
        variant="link"
        className="h-auto w-fit gap-1 p-0 text-sm font-medium"
        leftIcon={<Icon name="chevron-left" size={14} />}
        onClick={() => router.push(listPath)}
      >
        Go Back
      </Button>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          {/* Page header. The settlement amount is the page's identity; the
           * date beneath it is the other half of its key. No status chip and no
           * lifecycle line — a settlement only exists here once it has
           * happened, and the timeline has no source. */}
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Settlement amount</p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-foreground tabular-nums">
                {netAmountLabel}
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  Settled on{" "}
                  {formatDate(settlement.date, {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {downloadReportButton}
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowReportInfo(true)}
                aria-label="About this settlement"
                className="h-9 w-9 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
              >
                <Icon name="info" size={15} />
              </Button>
            </div>
          </div>

          {/* Not a status line — there is no status. This answers the one
           * question a completed settlement still raises: why did Friday's
           * payments land on Monday. Only shown when a weekend or bank holiday
           * actually moved the date. */}
          {settlement.affectedByNonWorkingDay && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <Icon name="alert-triangle" size={13} className="shrink-0" />
              <p className="min-w-0 flex-1">
                <span className="font-semibold">
                  {settlement.nonWorkingDayReason === "holiday"
                    ? "Moved by a bank holiday."
                    : "Moved by the weekend."}
                </span>{" "}
                Banks do not process transfers on non-working days, so this settlement landed on the
                next working day.
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
                  label="Settlement Date"
                  value={formatDate(settlement.date, {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                  copyValue={settlement.id}
                  tooltip="An account settles at most once a day, so the date identifies this settlement."
                />

                <Separator />

                {/* The other half of the key. Shown whenever the settlement
                    names its own merchant, which is what a UCIC-scoped list
                    row does; a single-MID account has nothing to add here. */}
                {settlement.merchantId && (
                  <>
                    <CopyableValue
                      layout="stack"
                      className="gap-1.5 p-0"
                      label="Merchant ID"
                      value={settlement.merchantId}
                      tooltip="The account this settlement belongs to."
                    />

                    <Separator />
                  </>
                )}

                <CopyableValue
                  layout="stack"
                  className="gap-1.5 p-0"
                  label="Bank Account"
                  value={`${account.bankName} ${account.maskedAccountNumber}`}
                  copyable={false}
                  tooltip={
                    account.ifscCode
                      ? `The account this settlement landed in. IFSC ${account.ifscCode}.`
                      : "The account this settlement landed in."
                  }
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
                  indent={1}
                />
                <BreakupRow
                  label="Platform fee charged on payments"
                  value={platformFee}
                  muted
                  negative
                  indent={1}
                />
                {/* Only when something was actually discounted — on most
                    settlements this block is noise. */}
                {hasFeeDiscount && (
                  <>
                    <BreakupRow
                      label="Fee before discount"
                      value={feeBeforeDiscount}
                      muted
                      indent={2}
                    />
                    {discountAmount > 0 && (
                      <BreakupRow
                        label="Discount"
                        value={discountAmount}
                        muted
                        negative
                        indent={2}
                      />
                    )}
                    {offerDiscountAmount > 0 && (
                      <BreakupRow
                        label="Offer discount"
                        value={offerDiscountAmount}
                        muted
                        negative
                        indent={2}
                      />
                    )}
                  </>
                )}
                <BreakupRow label="Net Settlement" value={settlement.amount} emphasis />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Net settlement is the amount transferred to your registered bank account.
              </p>
            </Card>
          </div>

          {/* Payments, full width; this table is the settlement's evidence and
           * gets the most visual room. */}
          <Card className="gap-0 overflow-hidden p-0">
            <div className="px-5 pb-3 pt-5">
              <h2 className="text-sm font-semibold text-foreground">Payments in this settlement</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Payments ({settlement.transactionCount})
              </p>
            </div>
            <DataTable
              columns={buildMcaPaymentColumns()}
              data={payments}
              rowKey={(p) => p.id}
              density="compact"
              tableLayout="content"
              className="rounded-none border-0 border-t border-border"
            />
          </Card>
        </div>

        {showReportInfo && (
          <aside className="w-[320px] shrink-0 animate-in fade-in slide-in-from-right-4 duration-300">
            <SettlementReportInfoPanel
              onClose={() => setShowReportInfo(false)}
              settlement={settlement}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
