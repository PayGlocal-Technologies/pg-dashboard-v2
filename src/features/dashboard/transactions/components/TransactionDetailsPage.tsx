"use client";

import Image from "next/image";
import { type ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Separator,
  StatusBadge,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatTransactionDateTime,
  formatTransactionTimestamp,
  parseApiDateTime,
} from "@/lib/utils/format";
import { CountryCell, getStatusMeta } from "@/features/dashboard/transactions/mcaColumns";
import { UploadInvoiceForm } from "@/features/dashboard/transactions/components/UploadInvoiceForm";
import { LinkedTransactionsSection } from "@/features/dashboard/transactions/components/LinkedTransactionsSection";
import {
  MCA_FX_RATES_TO_INR,
  MCA_PROCESSING_FEE_RATE,
} from "@/features/dashboard/transactions/constants";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

interface TransactionDetailsPageProps {
  row: McaTransaction;
  onBack: () => void;
  onUploaded?: (row: McaTransaction) => void;
  onOpenTransaction: (row: McaTransaction) => void;
  isPartnerUser: boolean;
}

type StepStatus = "completed" | "current" | "upcoming";
interface TimelineStep {
  label: string;
  status: StepStatus;
  timestamp: string;
}

// Minutes after the transaction's creation time each settlement step
// realistically lands at — used to fill in a plausible, chronologically
// increasing timestamp per step when the API doesn't expose per-substage
// times (see getCurrentStepIndex's note on steps 3-5).
const STEP_OFFSET_MINUTES = [0, 4, 95, 1440, 1470, 1500, 2820];

// Index of the step whose timestamp represents "funds settled" for the
// Settlement chip — the transfer to the merchant's bank account completing,
// one step before FIRC issuance.
const SETTLED_STEP_INDEX = 5;

const REVERSED_STATUSES = new Set(["REVERSAL_FOR_RISK_REJECTED", "REVERSAL_FOR_NOT_SUPPORTED"]);

// Index of "Invoice pending" within buildTimeline's `labels` array below —
// the step that's active (blue dot) while a transaction needs an invoice, and
// the step the inline Upload Invoice form nests under.
const WAITING_FOR_INVOICE_STEP_INDEX = 1;

// Derives a single "how far along" index (0-7) from the coarse status fields
// the API exposes today. Steps 3-5 (the three settlement-transfer
// sub-stages) can't be individually resolved from available data — they
// flip from upcoming to completed together once externalStatus reaches
// SETTLED, since the API doesn't expose per-substage timestamps.
function getCurrentStepIndex(row: McaTransaction): number {
  const { externalStatus, frmStatus } = row;

  // Invoice Pending (DOCUMENT_PENDING) and Action Required (FRM pending)
  // must always show "Invoice pending" as the active step, checked before
  // anything else — frmStatus can independently read APPROVED/REVIEW_IN_PROGRESS
  // for a transaction whose invoice still hasn't been submitted, which would
  // otherwise fast-forward the timeline past a step that hasn't happened yet.
  if (frmStatus === "PENDING_MERCHANT_UPLOAD" || externalStatus === "DOCUMENT_PENDING") {
    return WAITING_FOR_INVOICE_STEP_INDEX;
  }

  if (externalStatus === "FIRC_SETTLED") return 7;
  if (externalStatus === "SETTLED") return 6;
  if (externalStatus === "SENT_FOR_SETTLEMENT" || externalStatus === "FUNDS_ON_HOLD") return 3;
  if (frmStatus === "APPROVED") return 3;
  if (frmStatus === "REVIEW_IN_PROGRESS" || externalStatus === "SENT_FOR_REVIEW") return 2;
  if (REVERSED_STATUSES.has(externalStatus)) return 2;
  return WAITING_FOR_INVOICE_STEP_INDEX;
}

function buildTimeline(row: McaTransaction): TimelineStep[] {
  const currentIndex = getCurrentStepIndex(row);
  const amount = parseFloat(row.amount ?? "0");
  const currency = row.currency ?? "USD";
  // Deterministic pseudo account suffix so each transaction shows a
  // different-looking (but stable) masked settlement account number.
  const acctDigits = row.gid.replace(/\D/g, "");
  const acctSuffix = (acctDigits.slice(-4) || "7890").padStart(4, "0");

  // Once the transaction has moved past the invoice step, its label reflects
  // that the invoice has already been uploaded — same step, same index,
  // purely a label swap based on where currentIndex already says the
  // transaction is (no new state introduced).
  const invoiceStepLabel =
    currentIndex > WAITING_FOR_INVOICE_STEP_INDEX ? "Invoice submitted" : "Invoice pending";

  const labels = [
    `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} received in virtual account`,
    invoiceStepLabel,
    "Invoice review",
    "Transfer initiated to PayGlocal's India partner bank",
    "Converted to INR",
    `Transfer initiated to your ICICI BANK LIMITED A/C **${acctSuffix}`,
    "FIRC issuance",
  ];

  // Anchor the whole timeline to the transaction's own creation time when it
  // parses cleanly; otherwise fall back to a deterministic pseudo date (from
  // the gid, like acctSuffix above) so the dummy timestamps stay stable
  // across re-renders instead of drifting on every render.
  const baseDate =
    parseApiDateTime(row.formattedCreationDateTime) ??
    new Date(2026, 0, 1 + (Number(acctDigits.slice(0, 2)) % 28), 9, 0, 0);

  return labels.map((label, i) => ({
    label,
    status: i < currentIndex ? "completed" : i === currentIndex ? "current" : "upcoming",
    timestamp: formatTransactionDateTime(new Date(baseDate.getTime() + STEP_OFFSET_MINUTES[i] * 60_000)),
  }));
}

// Communicates settlement progress only — merchant actions (e.g. the Upload
// Invoice form) render beside the timeline, not nested inside a step, so
// this component stays focused purely on step status/labels/timestamps.
function TimelineItem({ step, isLast }: { step: TimelineStep; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
            step.status === "completed" && "border-green-600 bg-green-600",
            step.status === "current" && "border-primary bg-primary",
            step.status === "upcoming" && "border-border bg-card"
          )}
        >
          {step.status === "completed" && (
            <Icon name="check" className="h-3 w-3 text-white" strokeWidth={3} />
          )}
        </span>
        {!isLast && (
          <span
            className={cn("my-0.5 w-px flex-1", step.status === "completed" ? "bg-green-600" : "bg-border")}
          />
        )}
      </div>
      <div className={cn("min-w-0 flex-1", !isLast && "pb-5")}>
        <p
          className={cn(
            "text-[13px] leading-snug",
            step.status === "upcoming" ? "text-muted-foreground" : "font-medium text-foreground"
          )}
        >
          {step.label}
        </p>
        {step.status === "completed" && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{step.timestamp}</p>
        )}
      </div>
    </div>
  );
}

// TODO: replace with the real payment method once the API exposes it for MCA
// transactions — McaTransaction has no such field today (unlike PA's
// paymentInstrument/cardBrand, see paColumns.tsx). Visa + a deterministic
// pseudo last-4 (from the gid, same trick as buildTimeline's acctSuffix) is
// shown purely as a temporary visual placeholder so the section isn't empty.
function getMockCardLast4(gid: string): string {
  const digits = gid.replace(/\D/g, "");
  return (digits.slice(-4) || "4242").padStart(4, "0");
}

function PaymentMethodPlaceholder({ gid }: { gid: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-5 w-8 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-white">
        <Image
          src="https://static.payglocal.in/images/network/visa.v2.svg"
          alt="Visa"
          width={32}
          height={20}
          unoptimized
          className="h-3.5 w-5 object-contain"
        />
      </span>
      <span className="font-mono text-[13px] font-medium text-foreground">•••• {getMockCardLast4(gid)}</span>
    </div>
  );
}

// Label above, value below — no divider between rows; each field stands on
// its own with vertical rhythm coming from the parent's spacing only.
function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  if (value == null || value === "") return null;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

// Full-page transaction detail view — replaces the Transactions table in
// place (see McaTransactionTable) rather than overlaying it, so this renders
// as a plain page: no portal, no backdrop, no open/close animation. The Back
// button is the only navigation affordance; the caller (McaTransactionTable)
// keeps the table's own filter/sort/pagination state alive since switching
// back just swaps which JSX this shares a parent with, no unmount involved.
export function TransactionDetailsPage({
  row,
  onBack,
  onUploaded,
  onOpenTransaction,
  isPartnerUser,
}: TransactionDetailsPageProps) {
  const isFrmPending = row.frmStatus === "PENDING_MERCHANT_UPLOAD";
  const { label, variant, trailIcon } = getStatusMeta(row.externalStatus, isFrmPending);
  const needsAction = isFrmPending || row.externalStatus === "DOCUMENT_PENDING";
  const isReversed = REVERSED_STATUSES.has(row.externalStatus);
  const isSettled = row.externalStatus === "SETTLED" || row.externalStatus === "FIRC_SETTLED";

  const counterpartyName = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName ?? "—";
  const amount = parseFloat(row.amount ?? "0");
  const currency = row.currency ?? "USD";
  const fxRate = MCA_FX_RATES_TO_INR[currency] ?? 1;
  const convertedAmount = amount * fxRate;
  const processingFee = convertedAmount * MCA_PROCESSING_FEE_RATE;
  const netAmount = convertedAmount - processingFee;
  const timeline = buildTimeline(row);
  const settledOnTimestamp = timeline[SETTLED_STEP_INDEX]?.timestamp;

  // The Upload Invoice section appears above the timeline only while the
  // transaction actually needs merchant action; otherwise it's hidden and
  // the Settlement Timeline moves up to take its row — see
  // WAITING_FOR_INVOICE_STEP_INDEX for which step this corresponds to.
  const showActionPanel = needsAction && !isReversed;

  // Grid row numbers shift up by one when the Upload Invoice section is
  // hidden, since it no longer occupies row 2. Sender Details stays pinned
  // to row 2 either way, aligning with whichever section (Upload Invoice or
  // Settlement Timeline) is first after the transaction summary.
  const timelineRowClass = showActionPanel ? "lg:row-start-3" : "lg:row-start-2";
  const paymentRowClass = showActionPanel ? "lg:row-start-4" : "lg:row-start-3";

  // The right column (Payment Details + Sender Details) doesn't span its own
  // row — it shares rows 2..N with the left column's Timeline/Payment
  // Breakdown. Without an explicit row-span, a grid row's height is always
  // the max of every cell assigned to it, so if the right column is taller
  // than the left column's content in that same row, the row stretches to
  // fit it and the left column is left with dead space below its own
  // content (the bug this fixes). Spanning the right column across every row
  // the left column occupies lets the grid's sizing algorithm distribute
  // that extra height across those rows instead of dumping it all into one,
  // so any leftover space lands at the true bottom of the grid rather than
  // as a gap in the middle of the left column.
  const detailsColumnRowSpanClass = isSettled
    ? showActionPanel
      ? "lg:row-span-3"
      : "lg:row-span-2"
    : showActionPanel
      ? "lg:row-span-2"
      : "lg:row-span-1";

  return (
    <div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
        onClick={onBack}
        className="-ml-2 mb-2 text-muted-foreground hover:text-foreground"
      >
        Back to Transactions
      </Button>

      {/* Single page surface — same bg-card/border/rounded-xl treatment used
          elsewhere as the app's primary content container (see the
          search/filter bar and error state in McaTransactionTable) — wraps
          the entire details section so it all sits on one white surface
          instead of the page background. */}
      <div className="rounded-xl border border-border bg-card p-6">
        {/* CSS Grid (not flex) specifically so the Timeline and Sender Details
            sections — placed in the same grid row via row-start-2 below — start
            at exactly the same top, regardless of how tall the summary above
            the Timeline ends up being. No vertical divider between the two
            columns; they're separated by the grid gap alone. lg:items-start
            overrides the grid default of stretching every cell to the row's
            tallest item — without it, the Settlement Timeline section (whose
            own content is often shorter than Sender Details + Payment
            Details together) stretches to match that height, leaving blank
            space below the last timeline step and pushing Payment Breakdown
            down with it. items-start lets each section size to its own
            content instead. */}
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[3fr_1fr] lg:items-start">
          {/* Row 1, left column — transaction summary. Remitter name lives in
              Sender Details; Transaction Date has moved to Payment Details
              in the right column, so the header no longer shows a timestamp
              at all, for any transaction state. */}
          <div className="lg:col-start-1 lg:row-start-1">
            <CountryCell iso2={row.partnerCustomerCountry} />
            <div className="mt-1.5 flex flex-col items-start gap-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[26px] font-semibold tabular-nums text-foreground">
                  {formatCurrency(amount, currency, "en-US")}
                </span>
                <StatusBadge variant={variant} label={label} trailIcon={trailIcon} />
              </div>
              {/* Settled transactions replace the old remitter-name/date line
                  beneath the amount with this chip instead; unsettled states
                  simply have nothing there now. Neutral (muted) variant, no
                  trailing icon — a quieter secondary chip than the primary
                  Settlement Status badge above it. */}
              {isSettled && settledOnTimestamp && (
                <StatusBadge variant="muted" label={`Settled on ${settledOnTimestamp}`} size="sm" />
              )}
            </div>

            {isReversed && (
              <Alert variant="error" className="mt-6">
                <AlertDescription>
                  Funds for this transaction were reversed and returned to the remitter.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Row 2, left column — Upload Invoice, the first actionable
              section after the transaction summary. Only rendered while the
              transaction actually needs merchant action; hidden entirely
              otherwise, which is what lets Settlement Timeline below move up
              via timelineRowClass. Sits directly on the page surface (no
              enclosing card), capped at 500px so the form doesn't stretch
              full-width on wide viewports. */}
          {showActionPanel && (
            <section className="max-w-[500px] lg:col-start-1 lg:row-start-2">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Upload invoice
              </h3>
              <UploadInvoiceForm row={row} variant="inline" onSuccess={() => onUploaded?.(row)} />
            </section>
          )}

          {/* Settlement Timeline — no enclosing card, sits directly on the
              page surface. Row shifts up to row 2 when Upload Invoice above
              is hidden. */}
          <section className={cn("lg:col-start-1", timelineRowClass)}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Settlement timeline
            </h3>
            <Separator className="mb-2" />
            <div>
              {timeline.map((step, i) => (
                <TimelineItem key={step.label} step={step} isLast={i === timeline.length - 1} />
              ))}
            </div>
          </section>

          {/* Row 2, right column — Payment Details then Sender Details,
              top-aligned with whichever section leads row 2 in the left
              column (Upload Invoice when present, otherwise Settlement
              Timeline). No surrounding card and no divider within either
              section — separation from the left column comes from the grid
              gap alone; the 36px gap between the two sections is explicit
              (mt-9) since that's wider than the space-y-4 used for fields
              within a section. */}
          <div className={cn("lg:col-start-2 lg:row-start-2", detailsColumnRowSpanClass)}>
            <div>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Payment Details
              </h3>
              <Separator className="mb-2" />
              <div className="space-y-4">
                <DetailRow label="Transaction date" value={formatTransactionTimestamp(row.formattedCreationDateTime)} />
                {row.settlementDate && (
                  <DetailRow label="Settlement date" value={formatTransactionTimestamp(row.settlementDate)} />
                )}
                <DetailRow label="Payment method" value={<PaymentMethodPlaceholder gid={row.gid} />} />
                <DetailRow label="Currency" value={currency} />
                <DetailRow label="Transaction ID" value={<CopyableText value={row.gid} />} />
              </div>
            </div>

            <div className="mt-9">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Sender Details
              </h3>
              <Separator className="mb-2" />
              <div className="space-y-4">
                <DetailRow label="Remitter name" value={counterpartyName} />
                <DetailRow label="Country" value={<CountryCell iso2={row.partnerCustomerCountry} />} />
                {isPartnerUser && <DetailRow label="Merchant ID" value={row.merchantId} />}
              </div>
            </div>
          </div>

          {/* This section only ever renders for settled transactions. The
              grid's own row gap (gap-y-6 = 24px) already separates it from
              Settlement Timeline above; mt-3 adds the remaining 12px so the
              gap from the timeline's actual content (items-start keeps the
              timeline section sized to its own content, no trailing
              whitespace) to here totals the requested 36px. */}
          {isSettled && (
            <section className={cn("lg:col-start-1 mt-3", paymentRowClass)}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Payment breakdown
              </h3>
              <div>
                <div className="flex items-center justify-between gap-4 pb-2.5 text-[13px]">
                  <span className="text-muted-foreground">
                    Payment amount
                    <span className="ml-1 text-[11px]">(using live FX)</span>
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    {formatCurrency(convertedAmount, "INR", "en-IN")}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4 py-2.5 text-[13px]">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    PayGlocal processing fee
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto min-h-0 px-0 py-0 text-[12px]"
                      onClick={() => {
                        // TODO: link to the processing-fee explainer once one exists.
                      }}
                    >
                      Learn more
                    </Button>
                  </span>
                  <span className="font-medium tabular-nums text-foreground">
                    − {formatCurrency(processingFee, "INR", "en-IN")}
                  </span>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4 py-2.5 text-[13px]">
                  <span className="font-semibold text-foreground">Net settlement amount</span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(netAmount, "INR", "en-IN")}
                  </span>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Linked Transactions — a separate grid instance (not another row in
            the one above) reusing the same lg:grid-cols-[3fr_1fr] split just
            to constrain its width to the 3/4 column, with col2 left empty.
            Keeping it out of the grid above avoids having to keep a
            right-column row-span in sync with yet another row. */}
        <div className="mt-9 grid lg:grid-cols-[3fr_1fr]">
          <div className="lg:col-start-1">
            <LinkedTransactionsSection
              row={row}
              isPartnerUser={isPartnerUser}
              onOpenTransaction={onOpenTransaction}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
