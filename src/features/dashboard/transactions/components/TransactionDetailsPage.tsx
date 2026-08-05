"use client";

import { useState, type ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  IconButton,
  Separator,
  StatusBadge,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { cn } from "@/lib/utils";
import { useApp } from "@/stores/useApp";
import {
  formatCurrency,
  formatFileSize,
  formatTransactionDateOnly,
  formatTransactionDateTime,
  formatTransactionTimestamp,
  parseApiDateTime,
} from "@/lib/utils/format";
import { CountryCell, getStatusMeta } from "@/features/dashboard/transactions/mcaColumns";
import { UploadInvoiceForm } from "@/features/dashboard/transactions/components/UploadInvoiceForm";
import { InvoicePreviewDialog } from "@/features/dashboard/transactions/components/InvoicePreviewDialog";
import { LinkedTransactionsSection } from "@/features/dashboard/transactions/components/LinkedTransactionsSection";
import {
  MCA_FX_RATES_TO_INR,
  MCA_PROCESSING_FEE_RATE,
} from "@/features/dashboard/transactions/constants";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

interface TransactionDetailsPageProps {
  row: McaTransaction;
  onBack: () => void;
  /** Closes the full page and reopens the same transaction in the drawer. */
  onCollapse: () => void;
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

const REVERSED_STATUSES = new Set(["REVERSAL_FOR_RISK_REJECTED", "REVERSAL_FOR_NOT_SUPPORTED"]);

// Exported so other consumers of a transaction row (e.g. the drawer's
// settlement feedback prompt) can check the same "is this settled" condition
// TransactionDetailsContent uses below, instead of re-deriving it and
// risking drift between the two.
export function isSettledTransaction(row: McaTransaction): boolean {
  return row.externalStatus === "SETTLED" || row.externalStatus === "FIRC_SETTLED";
}

// Literal Tailwind row-start/row-span classes, looked up by number rather
// than interpolated into a template string — Tailwind's build-time class
// scanner needs each full class name to appear verbatim in the source, which
// a computed string like `lg:row-start-${n}` would not satisfy.
const ROW_START_CLASS: Record<number, string> = {
  1: "lg:row-start-1",
  2: "lg:row-start-2",
  3: "lg:row-start-3",
  4: "lg:row-start-4",
  5: "lg:row-start-5",
  6: "lg:row-start-6",
};
const ROW_SPAN_CLASS: Record<number, string> = {
  2: "lg:row-span-2",
  3: "lg:row-span-3",
  4: "lg:row-span-4",
  5: "lg:row-span-5",
  6: "lg:row-span-6",
};

// Index of "Invoice pending" within buildTimeline's `labels` array below —
// the step that's active (blue dot) while a transaction needs an invoice, and
// the step the inline Upload Invoice form nests under.
const WAITING_FOR_INVOICE_STEP_INDEX = 1;

// Derives a single "how far along" index (0-7) from the coarse status fields
// the API exposes today. Steps 3-5 (the three settlement-transfer
// sub-stages) can't be individually resolved from available data — they
// flip from upcoming to completed together once externalStatus reaches
// SETTLED, since the API doesn't expose per-substage timestamps. Both
// SETTLED and FIRC_SETTLED return past the last step index (7, one past
// "FIRC issuance" at index 6) so every step, including FIRC issuance, shows
// as completed for any settled transaction — not just once FIRC_SETTLED is
// reached.
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

  if (externalStatus === "FIRC_SETTLED" || externalStatus === "SETTLED") return 7;
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

// Communicates settlement progress, plus an optional `children` slot for
// content that belongs to a specific step rather than the timeline as a
// whole (see SettlementTimelineSection's use of it for the uploaded invoice
// row, nested under the "Invoice submitted" step). Merchant actions like the
// Upload Invoice form still render beside the timeline, not inside a step.
function TimelineItem({
  step,
  isLast,
  children,
}: {
  step: TimelineStep;
  isLast: boolean;
  children?: ReactNode;
}) {
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
        {children}
      </div>
    </div>
  );
}

// TODO: replace with the real uploaded-invoice filename/size once the API
// exposes it for MCA transactions. McaTransaction carries no such field
// today, and no invoice-metadata fetch endpoint exists (see
// InvoiceDropzone.tsx). Deterministic pseudo name/size (from the gid, same
// trick as acctSuffix above) so the placeholder stays
// stable across re-renders instead of changing on every render.
function getMockUploadedInvoice(gid: string): { name: string; size: number } {
  const digits = gid.replace(/\D/g, "");
  const suffix = digits.slice(-6) || "100000";
  return {
    name: `invoice-${suffix}.pdf`,
    size: 40_000 + (Number(suffix) % 200_000),
  };
}

// Resolves the receiving virtual account's country from the transaction's
// settlement currency via the live countryCurrencyMap (from useApp, fetched
// from the countryCurrencyMap API), so the label reflects whichever virtual
// account actually received the funds instead of a fixed/guessed country.
// Falls back to the raw currency code if the map has no matching entry.
function useReceivingAccountLabel(currency: string): string {
  const countryCurrencyMap = useApp((s) => s.countryCurrencyMap);
  const entry = countryCurrencyMap.find(
    (c) => c.currencyCode.toUpperCase() === currency.toUpperCase()
  );
  return `${entry?.countryName ?? currency} Account`;
}

// Rendered (see the isSettled check at the call site) in the left column
// only, alongside Settlement Timeline/Linked Transactions, never spanning
// into the Payment Details/Sender Details column. The illustration slot is
// an empty, fixed-size placeholder reserved for a future asset,
// intentionally not filled with interim art. The referral promotion is a
// separate, lower-priority banner (see ReferEarnBanner below), not part of
// this one, so this card stays focused purely on the FIRA outcome and its
// download action.
function FiraReceivedBanner() {
  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4 md:flex-row md:items-start">
        <div className="h-24 w-24 shrink-0 rounded-lg bg-muted" aria-hidden="true" />

        <div className="flex-1 space-y-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-base font-semibold text-foreground">FIRA Received Instantly</h3>
            <StatusBadge variant="success" label="Success" trailIcon="check" size="sm" />
          </div>
          <p className="max-w-md text-[13px] text-muted-foreground">
            Fast, seamless, and hassle-free documentation for your international payments.
          </p>

          <Button
            type="button"
            leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
            onClick={() => {
              // TODO: wire up once a FIRA download endpoint exists.
            }}
          >
            Download FIRA
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact, lower-priority companion banner directly below FiraReceivedBanner:
// no illustration, smaller type, and a ghost (not primary) CTA, so it reads
// as a secondary promotion rather than competing with the FIRA outcome above
// it for attention, while still being clearly visible and clickable.
function ReferEarnBanner() {
  return (
    <Card size="sm">
      <CardContent className="flex items-center justify-between gap-4 py-3">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground">Refer & Earn</h3>
          <p className="text-[12px] text-muted-foreground">
            Invite other exporters to PayGlocal and earn rewards.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          rightIcon={<Icon name="arrow-right" className="h-3.5 w-3.5" />}
          onClick={() => {
            // TODO: wire up once a referral flow exists.
          }}
        >
          Refer Now
        </Button>
      </CardContent>
    </Card>
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

// Below: one small component per section, each just the "title outside +
// card inside" module on its own — no positioning classes. TransactionDetails
// Content (further down) arranges these differently depending on layout: the
// full page places them in a 2-column grid with explicit row placement,
// while the drawer stacks them in a single column in document order. Sharing
// these components (rather than duplicating their JSX per layout) is what
// keeps the two views from drifting apart.

function UploadInvoiceSection({
  row,
  onUploaded,
}: {
  row: McaTransaction;
  onUploaded?: (row: McaTransaction) => void;
}) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Upload invoice
      </h3>
      <Card size="sm">
        <CardContent>
          <UploadInvoiceForm row={row} variant="inline" onSuccess={() => onUploaded?.(row)} />
        </CardContent>
      </Card>
    </section>
  );
}

// Nested inside the "Invoice submitted" TimelineItem (see
// SettlementTimelineSection below) once an invoice has actually been
// submitted for this transaction, rather than shown as its own section: a
// compact bordered row, not a full Card, so it reads as part of that step
// instead of a sibling module. Shows only the latest uploaded file; a
// replacement upload would overwrite the same underlying record rather than
// appending one, so there's nothing here to list beyond the single current
// file.
function UploadedInvoiceRow({ row }: { row: McaTransaction }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const invoice = getMockUploadedInvoice(row.gid);

  return (
    <>
      <div className="mt-2 flex items-center gap-2.5 rounded-md border border-border bg-muted/30 px-2.5 py-2">
        <Icon name="file-text" className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-foreground">{invoice.name}</p>
          <p className="text-[11px] text-muted-foreground">{formatFileSize(invoice.size)}</p>
        </div>
        <IconButton aria-label="Preview invoice" variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
          <Icon name="eye" className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      <InvoicePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        fileName={invoice.name}
        fileSize={invoice.size}
      />
    </>
  );
}

function SettlementTimelineSection({
  timeline,
  row,
  showUploadedInvoice,
}: {
  timeline: TimelineStep[];
  row: McaTransaction;
  showUploadedInvoice: boolean;
}) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Settlement timeline
      </h3>
      <Card size="sm">
        <CardContent>
          {timeline.map((step, i) => (
            <TimelineItem key={step.label} step={step} isLast={i === timeline.length - 1}>
              {showUploadedInvoice && i === WAITING_FOR_INVOICE_STEP_INDEX && <UploadedInvoiceRow row={row} />}
            </TimelineItem>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

function PaymentBreakdownSection({
  convertedAmount,
  processingFee,
  netAmount,
}: {
  convertedAmount: number;
  processingFee: number;
  netAmount: number;
}) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Payment breakdown
      </h3>
      <Card size="sm">
        <CardContent>
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
        </CardContent>
      </Card>
    </section>
  );
}

// floatTitle exists for the full page's 2-column grid, for a case where this
// section's row is shared with a left-column section that has no title
// above its own card, so its card starts flush at the top of the row.
// Floating this title out of flow keeps this section's own box equal to
// just the Card's box, aligning the two cards' top edges. Both current call
// sites pass floatTitle={false}: Payment Breakdown, which now leads the
// settled left column (see TransactionDetailsContent), has its own in-flow
// title just like Payment Details does, so no floating is needed there
// either. Left in place for a future row-1 section that lacks a title.
function PaymentDetailsSection({
  row,
  currency,
  floatTitle,
}: {
  row: McaTransaction;
  currency: string;
  floatTitle: boolean;
}) {
  const receivingAccountLabel = useReceivingAccountLabel(currency);

  return (
    <section className={cn(floatTitle && "relative")}>
      <h3
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
          floatTitle ? "absolute -top-7 left-0" : "mb-3"
        )}
      >
        Payment Details
      </h3>
      <Card size="sm">
        <CardContent className="space-y-4">
          <DetailRow label="Transaction date" value={formatTransactionTimestamp(row.formattedCreationDateTime)} />
          {/* Always shown, even pre-settlement — a "-" placeholder keeps the
              field present across every transaction state instead of the
              row disappearing until settlement. */}
          <DetailRow
            label="Settlement date"
            value={row.settlementDate ? formatTransactionTimestamp(row.settlementDate) : "-"}
          />
          <DetailRow label="Receiving Account" value={receivingAccountLabel} />
          <DetailRow label="Currency" value={currency} />
          <DetailRow label="Transaction ID" value={<CopyableText value={row.gid} />} />
        </CardContent>
      </Card>
    </section>
  );
}

function SenderDetailsSection({
  row,
  counterpartyName,
  isPartnerUser,
}: {
  row: McaTransaction;
  counterpartyName: string;
  isPartnerUser: boolean;
}) {
  return (
    <section>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sender Details
      </h3>
      <Card size="sm">
        <CardContent className="space-y-4">
          <DetailRow label="Remitter name" value={counterpartyName} />
          <DetailRow label="Country" value={<CountryCell iso2={row.partnerCustomerCountry} />} />
          {isPartnerUser && <DetailRow label="Merchant ID" value={row.merchantId} />}
        </CardContent>
      </Card>
    </section>
  );
}

// Full-page transaction detail view — replaces the Transactions table in
// place (see McaTransactionTable) rather than overlaying it, so this renders
// as a plain page: no portal, no backdrop, no open/close animation. The Back
// button is the only navigation affordance; the caller (McaTransactionTable)
// keeps the table's own filter/sort/pagination state alive since switching
// back just swaps which JSX this shares a parent with, no unmount involved.
//
// The details themselves live in TransactionDetailsContent below, shared
// verbatim with TransactionDetailsDrawer so the drawer and the full page stay
// functionally identical. This wrapper only adds the page's own Back
// navigation on top of it.
export function TransactionDetailsPage({
  row,
  onBack,
  onCollapse,
  onUploaded,
  onOpenTransaction,
  isPartnerUser,
}: TransactionDetailsPageProps) {
  return (
    <div>
      <div className="-ml-2 mb-2 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          Back to Transactions
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="shrink" className="h-4 w-4" />}
          onClick={onCollapse}
          className="text-muted-foreground hover:text-foreground"
        >
          Collapse
        </Button>
      </div>

      <TransactionDetailsContent
        row={row}
        onUploaded={onUploaded}
        onOpenTransaction={onOpenTransaction}
        isPartnerUser={isPartnerUser}
      />
    </div>
  );
}

interface TransactionDetailsContentProps extends Omit<TransactionDetailsPageProps, "onBack" | "onCollapse"> {
  /** "page" (default): 2-column grid, as on the full Transaction Details
   * page. "drawer": single column, everything stacked in document order,
   * for the narrower drawer viewport. */
  layout?: "page" | "drawer";
}

// Every section of the transaction detail view: summary, FIRA banner, Upload
// Invoice, Settlement Timeline, Payment Breakdown, Payment/Sender Details,
// and Linked Transactions. Rendered as-is by both TransactionDetailsPage
// (above) and TransactionDetailsDrawer, so neither view can drift from the
// other in conditional states or behaviour. Only the arrangement (layout
// prop) differs between them.
export function TransactionDetailsContent({
  row,
  onUploaded,
  onOpenTransaction,
  isPartnerUser,
  layout = "page",
}: TransactionDetailsContentProps) {
  const isFrmPending = row.frmStatus === "PENDING_MERCHANT_UPLOAD";
  const { label, variant, trailIcon } = getStatusMeta(row.externalStatus, isFrmPending);
  const needsAction = isFrmPending || row.externalStatus === "DOCUMENT_PENDING";
  const isReversed = REVERSED_STATUSES.has(row.externalStatus);
  const isSettled = isSettledTransaction(row);
  // Invoice review is the step right after invoice-pending in buildTimeline's
  // labels (see WAITING_FOR_INVOICE_STEP_INDEX). Once the timeline has moved
  // past that step, an invoice has actually been submitted for this
  // transaction, so the Uploaded Invoice section has something real to show.
  const showUploadedInvoice = getCurrentStepIndex(row) > WAITING_FOR_INVOICE_STEP_INDEX;

  const counterpartyName = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName ?? "—";
  const amount = parseFloat(row.amount ?? "0");
  const currency = row.currency ?? "USD";
  const fxRate = MCA_FX_RATES_TO_INR[currency] ?? 1;
  const convertedAmount = amount * fxRate;
  const processingFee = convertedAmount * MCA_PROCESSING_FEE_RATE;
  const netAmount = convertedAmount - processingFee;
  const timeline = buildTimeline(row);

  // Only the SETTLED status (not FIRC_SETTLED, which already has its own
  // distinct "FIRC Settled" label) gets its chip text swapped to include the
  // settlement date — same green/success variant and check trailIcon
  // getStatusMeta already returns, just a different label for this one
  // status value.
  const summaryStatusLabel =
    row.externalStatus === "SETTLED" && row.settlementDate
      ? `Settled on ${formatTransactionDateOnly(row.settlementDate)}`
      : label;

  // The Upload Invoice section appears only while the transaction actually
  // needs merchant action.
  const showActionPanel = needsAction && !isReversed;

  const summary = (
    <div className={layout === "drawer" ? undefined : "mb-9"}>
      <CountryCell iso2={row.partnerCustomerCountry} />
      <div className="mt-1.5 flex flex-col items-start gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[26px] font-semibold tabular-nums text-foreground">
            {formatCurrency(amount, currency, "en-US")}
          </span>
          <StatusBadge variant={variant} label={summaryStatusLabel} trailIcon={trailIcon} />
        </div>
        {/* Supporting context under the amount — lower emphasis than the
            amount itself (text-[13px], muted label) but still clearly
            readable, with the remitter name itself kept at foreground
            weight so it doesn't disappear entirely. */}
        <p className="text-[13px] text-muted-foreground">
          Charged by <span className="font-medium text-foreground">{counterpartyName}</span>
        </p>
      </div>

      {isReversed && (
        <Alert variant="error" className="mt-6">
          <AlertDescription>
            Funds for this transaction were reversed and returned to the remitter.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  if (layout === "drawer") {
    // Single column, in document order: no grid, no row-start math, no
    // floated titles. Every section keeps the same title-outside/card-inside
    // structure as the page; only how they're arranged differs.
    //
    // Settled transactions lead with Payment Breakdown (financial summary
    // first), then FIRA Received + Refer & Earn, then Settlement Timeline
    // (with the uploaded invoice nested under its Invoice Submitted step).
    // This ordering is drawer-only: the full page's 2-column grid below is
    // untouched, and showActionPanel is never true for a settled
    // transaction, so there's no conflict with the non-settled branch.
    return (
      <div className="space-y-9">
        {summary}
        {isSettled ? (
          <>
            <PaymentBreakdownSection
              convertedAmount={convertedAmount}
              processingFee={processingFee}
              netAmount={netAmount}
            />
            <FiraReceivedBanner />
            <ReferEarnBanner />
            <SettlementTimelineSection timeline={timeline} row={row} showUploadedInvoice={showUploadedInvoice} />
          </>
        ) : (
          <>
            {showActionPanel && <UploadInvoiceSection row={row} onUploaded={onUploaded} />}
            <SettlementTimelineSection timeline={timeline} row={row} showUploadedInvoice={showUploadedInvoice} />
          </>
        )}
        <PaymentDetailsSection row={row} currency={currency} floatTitle={false} />
        <SenderDetailsSection row={row} counterpartyName={counterpartyName} isPartnerUser={isPartnerUser} />
        <LinkedTransactionsSection row={row} isPartnerUser={isPartnerUser} onOpenTransaction={onOpenTransaction} />
      </div>
    );
  }

  // Row numbers for the left column, within the 2-column grid that starts
  // below the full-width transaction summary. For settled transactions,
  // Payment Breakdown now leads at row 1 (financial summary first, same
  // priority as the drawer's own settled ordering), then FIRA Received, its
  // companion Refer & Earn banner, then Settlement Timeline. showActionPanel
  // (Upload Invoice) is never true for a settled transaction, so there's no
  // conflict over row 1 between the two. Linked Transactions stacks after
  // Settlement Timeline. The uploaded invoice no longer takes its own row:
  // it's nested inside Settlement Timeline's card (see
  // SettlementTimelineSection), under the "Invoice submitted" step.
  const breakdownRow = 1;
  const firaRow = isSettled ? breakdownRow + 1 : 1;
  const referEarnRow = firaRow + 1;
  const timelineRow = isSettled ? referEarnRow + 1 : showActionPanel ? 2 : 1;
  const linkedRow = timelineRow + 1;

  // The right column (Payment Details + Sender Details) aligns with
  // whichever section leads the left column: Upload Invoice's row (row 1)
  // for Invoice Pending transactions, Payment Breakdown's row (also row 1)
  // for settled transactions, and Settlement Timeline's row otherwise. It
  // spans through to Linked Transactions' row so the grid's row-height
  // algorithm distributes any extra height across those rows instead of
  // forcing it all into one row alone (which would otherwise leave dead
  // space, the same issue solved in an earlier round).
  const detailsColumnRowStart = isSettled ? breakdownRow : showActionPanel ? 1 : timelineRow;
  const detailsColumnRowSpan = linkedRow - detailsColumnRowStart + 1;

  return (
    <div>
      {/* Transaction summary — full-width page header, standalone, no card,
          sitting above the 2-column layout entirely (not part of either
          column). The primary focal point of the page. Transaction Date
          lives in Payment Details — the header never shows a timestamp. */}
      {summary}

      {/* 2-column layout, below the summary. Left column sections use
          explicit row-start classes (rather than a plain space-y stack) so
          the right column can start at Settlement Timeline's row instead of
          row 1 — aligning Payment Details with the Timeline card, not the
          top of the page or Upload Invoice above it. items-start keeps each
          section sized to its own content instead of stretching to match
          whichever column is taller in a shared row. */}
      <div className="grid gap-x-10 gap-y-9 lg:grid-cols-[3fr_1fr] lg:items-start">
        {/* Payment Breakdown leads for settled transactions: financial
            summary first, ahead of the settlement-progress sections below
            it, matching the drawer's own settled ordering. */}
        {isSettled && (
          <div className={cn("lg:col-start-1", ROW_START_CLASS[breakdownRow])}>
            <PaymentBreakdownSection
              convertedAmount={convertedAmount}
              processingFee={processingFee}
              netAmount={netAmount}
            />
          </div>
        )}

        {/* FIRA Received: left column only, same width as Settlement
            Timeline/Linked Transactions (never spans into the Payment
            Details/Sender Details column). showActionPanel (Upload Invoice)
            is never true at the same time, so there's no row conflict
            between the two. */}
        {isSettled && (
          <div className={cn("lg:col-start-1", ROW_START_CLASS[firaRow])}>
            <FiraReceivedBanner />
          </div>
        )}

        {/* Refer & Earn: immediately below the FIRA banner, above
            Settlement Timeline. Lower visual priority than the FIRA banner
            (see ReferEarnBanner's own compact styling) but still its own
            row, not nested inside the FIRA card. */}
        {isSettled && (
          <div className={cn("lg:col-start-1", ROW_START_CLASS[referEarnRow])}>
            <ReferEarnBanner />
          </div>
        )}

        {/* Upload Invoice — always row 1 when present. */}
        {showActionPanel && (
          <div className={cn("lg:col-start-1", ROW_START_CLASS[1])}>
            <UploadInvoiceSection row={row} onUploaded={onUploaded} />
          </div>
        )}

        {/* Settlement Timeline: for non-settled transactions, the right
            column's Payment Details card aligns with this row instead (see
            detailsColumnRowStart). The uploaded invoice (once the timeline's
            past invoice-pending) renders nested inside this card, under the
            "Invoice submitted" step, not as a sibling row. */}
        <div className={cn("lg:col-start-1", ROW_START_CLASS[timelineRow])}>
          <SettlementTimelineSection timeline={timeline} row={row} showUploadedInvoice={showUploadedInvoice} />
        </div>

        {/* Linked Transactions — its own table already provides sufficient
            visual separation, so it gets no title-outside/card treatment
            here; the table itself is the module boundary. */}
        <div className={cn("lg:col-start-1", ROW_START_CLASS[linkedRow])}>
          <LinkedTransactionsSection
            row={row}
            isPartnerUser={isPartnerUser}
            onOpenTransaction={onOpenTransaction}
          />
        </div>

        {/* Right column: Payment Details then Sender Details. Starts at
            whichever section leads the left column: Upload Invoice's row for
            Invoice Pending transactions, Payment Breakdown's row for settled
            transactions, and Settlement Timeline's row otherwise. Spans
            through Linked Transactions' row so its top aligns with whichever
            card it starts at. */}
        <div
          className={cn(
            "space-y-9 lg:col-start-2",
            ROW_START_CLASS[detailsColumnRowStart],
            ROW_SPAN_CLASS[detailsColumnRowSpan]
          )}
        >
          <PaymentDetailsSection row={row} currency={currency} floatTitle={false} />
          <SenderDetailsSection row={row} counterpartyName={counterpartyName} isPartnerUser={isPartnerUser} />
        </div>
      </div>
    </div>
  );
}
