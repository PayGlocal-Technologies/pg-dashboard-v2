"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  DataTable,
  Separator,
  Shimmer,
  StatusBadge,
  type Column,
} from "@/components/ui";
import { COUNTRIES } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";
import { RowClick } from "@/components/common/table/RowClick";
import { useApp } from "@/stores/useApp";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { CopyableValue } from "@/components/common/CopyableValue";
import { SettlementReportInfoPanel } from "@/features/dashboard/mca-settlement-report/components/SettlementReportInfoPanel";
import {
  computeSettlementSchedule,
  previousCaptureDay,
  type SettlementSchedule,
} from "@/features/dashboard/mca-settlement-report/calendarUtils";
import { getStatusMeta } from "@/features/dashboard/mca-transactions/columns";
import type { McaSettlementPayment } from "@/features/dashboard/mca-settlement-report/types";
import {
  MCA_SETTLEMENT_LIST_PATH,
  mcaSettlementListPathWithDrawer,
} from "@/features/dashboard/mca-settlement-report/routes";
import {
  useMcaTransactionByGid,
  useSettlementCalendar,
  useSettlementDetail,
  useSettlementReportDownload,
} from "@/features/dashboard/mca-settlement-report/hooks";
import { TransactionDetailsDrawer } from "@/features/dashboard/mca-transactions/components/TransactionDetailsDrawer";
import { PlaceholderState } from "@/components/common/PlaceholderState";

/** Mirrors the loaded layout — header, the two cards, the payments table — so
 *  the page does not reflow when the response lands. */
function SettlementDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Shimmer className="h-5 w-20" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Shimmer className="h-3 w-32" />
          <Shimmer className="h-10 w-56" />
          <Shimmer className="h-3 w-40" />
        </div>
        <Shimmer className="h-9 w-40" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Shimmer className="h-64 rounded-xl" />
        <Shimmer className="h-64 rounded-xl" />
      </div>
      <Shimmer className="h-80 rounded-xl" />
    </div>
  );
}

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
function buildMcaPaymentColumns(
  onOpenPayment: (payment: McaSettlementPayment) => void
): Column<McaSettlementPayment>[] {
  const clickable = (payment: McaSettlementPayment, content: React.ReactNode) => (
    <RowClick onClick={() => onOpenPayment(payment)}>{content}</RowClick>
  );
  return [
    {
      key: "amount",
      header: "Amount",
      minWidth: 130,
      cellClassName: "pl-5",
      render: (p) =>
        clickable(
          p,
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
        return clickable(
          p,
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
      render: (p) =>
        clickable(
          p,
          <span className="whitespace-nowrap text-[13px] text-muted-foreground">
            {formatDate(p.createdOn)}
          </span>
        ),
    },
    {
      key: "country",
      header: "Country",
      minWidth: 140,
      render: (p) =>
        clickable(
          p,
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
      render: (p) =>
        clickable(
          p,
          <span className="whitespace-nowrap text-[13px] text-foreground">{p.remitterName}</span>
        ),
    },
  ];
}

interface SettlementDetailsContentProps {
  /** The account this settlement belongs to. Both halves of the key come from
   *  the route — see mcaSettlementDetailPath in routes.ts for why. */
  merchantId: string;
  /** YYYY-MM-DD. */
  settlementDate: string;
  /**
   * "page" (default): Details and Amount Breakdown side by side, as on the
   * full page. "drawer": single column, everything stacked in document order,
   * for the narrower drawer viewport.
   */
  layout?: "page" | "drawer";
  /**
   * Opens the "About this settlement" side panel. Page-only: the panel is an
   * aside docked beside the content, which the drawer has no room for, so the
   * info affordance is simply not rendered when this is absent.
   */
  onShowInfo?: () => void;
}

/**
 * Every section of the settlement detail view: summary, the non-working-day
 * note, Details, Amount Breakdown and the payments table. Rendered as-is by
 * both the full page below and SettlementDetailsDrawer, so the two cannot
 * drift in content or behaviour — only the arrangement differs, via `layout`.
 *
 * It owns its own fetch rather than taking a row, because a settlement's
 * detail comes from its own endpoint keyed by (merchant, date); the list row
 * does not carry any of it.
 */
export function SettlementDetailsContent({
  merchantId,
  settlementDate,
  layout = "page",
  onShowInfo,
}: SettlementDetailsContentProps) {
  const router = useRouter();
  const listPath = MCA_SETTLEMENT_LIST_PATH;
  const isDrawer = layout === "drawer";
  // Same hook the list page uses, so a report downloaded from here and from a
  // row behave identically. See useSettlementReportDownload.
  const { download: downloadSettlementReport } = useSettlementReportDownload();
  const { detail, isLoading, isError } = useSettlementDetail(merchantId, settlementDate);
  /**
   * Clicking a payment opens that transaction in the MCA transactions drawer,
   * the same one the transactions table opens, so a remittance looks identical
   * wherever it is reached from.
   *
   * The settlement response carries only a thin payment (gid, amount, country,
   * remitter), and the drawer needs the full transaction, so the gid is
   * resolved against the transactions endpoint. Held as a gid rather than a
   * row because that fetch is what supplies the row.
   */
  const [openPaymentGid, setOpenPaymentGid] = useState<string | null>(null);
  const { transaction: openPayment } = useMcaTransactionByGid(openPaymentGid);
  const isPartnerUser = useApp((state) => state.isPartnerUser);
  /**
   * Whether a weekend or bank holiday moved this settlement's date, worked out
   * against the LIVE holiday calendar. Not a field on the detail response and
   * not asked for as one: it follows from the settlement date itself.
   */
  const calendar = useSettlementCalendar();
  const paymentReceivedDate = previousCaptureDay(settlementDate, calendar.holidays);
  const schedule = computeSettlementSchedule(paymentReceivedDate, calendar.holidays);

  if (isLoading) return <SettlementDetailSkeleton />;

  if (isError) {
    return (
      <PlaceholderState
        variant="error"
        title="Couldn't load this settlement"
        description="Something went wrong while fetching it."
        className="rounded-xl border border-border bg-card py-14"
        action={
          <Button variant="outline" size="sm" onClick={() => router.push(listPath)}>
            Go back
          </Button>
        }
      />
    );
  }

  if (!detail) {
    return (
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
  /** `settlementAccount` was agreed late and may not be deployed yet, so a
   *  missing block renders a dash rather than crashing on `account.bankName`. */
  const bankAccountLabel = account
    ? [account.bankName, account.maskedAccountNumber].filter(Boolean).join(" ")
    : "—";
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
    // The bare date key from the route, not `settlement.date` — that is the
    // display timestamp and the endpoint cannot parse it. See the hook's doc.
    downloadSettlementReport(settlementDate, merchantId);
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
    <div className="space-y-4">
      {/* Summary. The settlement amount is the view's identity; the date
       * beneath it is the other half of its key. No status chip and no
       * lifecycle line — a settlement only exists here once it has happened,
       * and the timeline has no source. */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Settlement amount</p>
          <p
            className={cn(
              "mt-1 font-bold tracking-tight text-foreground tabular-nums",
              isDrawer ? "text-3xl" : "text-4xl"
            )}
          >
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
          {/* Page-only: it opens the docked aside, which the drawer has no
                  room for. See SettlementDetailsContentProps.onShowInfo. */}
          {onShowInfo && (
            <Button
              type="button"
              variant="ghost"
              onClick={onShowInfo}
              aria-label="About this settlement"
              className="h-9 w-9 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
            >
              <Icon name="info" size={15} />
            </Button>
          )}
        </div>
      </div>

      {/* Not a status line — there is no status. This answers the one
       * question a completed settlement still raises: why did Friday's
       * payments land on Monday. Only shown when a weekend or bank holiday
       * actually moved the date. */}
      {schedule.affectedByNonWorkingDay && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs leading-relaxed text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          <Icon name="alert-triangle" size={13} className="shrink-0" />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">
              {schedule.nonWorkingDayReason === "holiday"
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
      <div className={cn("grid gap-4", !isDrawer && "lg:grid-cols-2")}>
        <section className="flex flex-col">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Details
          </h3>
          <Card className="flex-1 gap-4 p-5">
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
                value={bankAccountLabel}
                copyable={false}
                tooltip={
                  account?.ifscCode
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
        </section>

        <section className="flex min-w-0 flex-col">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Amount Breakdown
          </h3>
          <Card className="min-w-0 flex-1 gap-4 p-5">
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
                    <BreakupRow label="Discount" value={discountAmount} muted negative indent={2} />
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
        </section>
      </div>

      {/* Payments, full width; this table is the settlement's evidence and
       * gets the most visual room. */}
      <section>
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Payments in this settlement
        </h3>
        {/* No count line above the table: the heading already names it and
            the table's own footer already reports "Showing 1-3 of 3 results",
            so a third statement of the same fact only added noise. */}
        <Card className="gap-0 overflow-hidden p-0">
          <DataTable
            columns={buildMcaPaymentColumns((p) => setOpenPaymentGid(p.id))}
            data={payments}
            rowKey={(p) => p.id}
            density="compact"
            tableLayout="content"
            className="rounded-none border-0"
          />
        </Card>
      </section>

      {/* The transactions drawer, reused rather than rebuilt, so a remittance
          reads identically here and on the transactions table. Expand hands off
          to that table's own deep link, since a transaction has no page of its
          own to route to. */}
      <TransactionDetailsDrawer
        row={openPayment}
        open={!!openPaymentGid}
        onOpenChange={(next) => {
          if (!next) setOpenPaymentGid(null);
        }}
        onExpand={(row) => {
          setOpenPaymentGid(null);
          router.push(`/mca-transactions?q=${encodeURIComponent(row.gid)}`);
        }}
        onOpenTransaction={(row) => setOpenPaymentGid(row.gid)}
        isPartnerUser={isPartnerUser}
      />
    </div>
  );
}

interface McaSettlementDetailFeatureProps {
  merchantId: string;
  /** YYYY-MM-DD. */
  settlementDate: string;
}

/**
 * The full-page settlement detail, at
 * /mca-settlement-report/{merchantId}/{settlementDate}.
 *
 * Reached by expanding the drawer, or by opening the URL directly. Everything
 * below the Go Back link is the shared content above; the page adds only the
 * back link and the docked "About this settlement" aside.
 */
export function McaSettlementDetailFeature({
  merchantId,
  settlementDate,
}: McaSettlementDetailFeatureProps) {
  const router = useRouter();
  const [showReportInfo, setShowReportInfo] = useState(false);
  const calendar = useSettlementCalendar();
  const paymentReceivedDate = previousCaptureDay(settlementDate, calendar.holidays);
  const schedule = computeSettlementSchedule(paymentReceivedDate, calendar.holidays);

  return (
    <div className="page-enter mx-auto max-w-[1400px] space-y-4 overflow-x-hidden">
      {/* Back and Collapse, adjacent and left-aligned, same as the transaction
          detail page. Collapse is the inverse of the drawer's Expand: it
          returns to the list with this settlement reopened in the drawer,
          rather than dropping the merchant back to a bare table. */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
          onClick={() => router.push(MCA_SETTLEMENT_LIST_PATH)}
          className="pl-0 text-muted-foreground hover:text-foreground"
        >
          Back to Settlements
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="shrink" className="h-4 w-4" />}
          onClick={() => router.push(mcaSettlementListPathWithDrawer(merchantId, settlementDate))}
          className="text-muted-foreground hover:text-foreground"
        >
          Collapse
        </Button>
      </div>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <SettlementDetailsContent
            merchantId={merchantId}
            settlementDate={settlementDate}
            layout="page"
            onShowInfo={() => setShowReportInfo(true)}
          />
        </div>

        {showReportInfo && (
          <aside className="w-[320px] shrink-0 animate-in fade-in slide-in-from-right-4 duration-300">
            <SettlementReportInfoPanel
              onClose={() => setShowReportInfo(false)}
              settlementDate={settlementDate}
              paymentReceivedDate={paymentReceivedDate}
              schedule={schedule}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
