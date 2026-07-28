"use client";

import type { ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  Separator,
  StatusBadge,
  useBreakpoint,
  VisuallyHidden,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { CountryCell, getStatusMeta } from "@/features/dashboard/transactions/mcaColumns";
import { UploadInvoiceForm } from "@/features/dashboard/transactions/components/UploadInvoiceForm";
import {
  MCA_FX_RATES_TO_INR,
  MCA_PROCESSING_FEE_RATE,
} from "@/features/dashboard/transactions/constants";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

interface TransactionDetailsDrawerProps {
  row: McaTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded?: (row: McaTransaction) => void;
  isPartnerUser: boolean;
}

type StepStatus = "completed" | "current" | "upcoming";
interface TimelineStep {
  label: string;
  status: StepStatus;
  timestamp: string;
}

// Parses the app's "DD/MM/YYYY HH:mm:ss" display format. Date.parse can't be
// trusted with slash-separated dates (it assumes MM/DD/YYYY in en-US), so this
// is matched manually.
function parseDisplayDateTime(display: string | undefined | null): Date | null {
  if (!display) return null;
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yyyy, hh, min, ss] = match;
  const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss));
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatDDMMYYYYHHmmss(date: Date): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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

  const labels = [
    `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} received in virtual account`,
    "Invoice pending",
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
    parseDisplayDateTime(row.formattedCreationDateTime) ??
    new Date(2026, 0, 1 + (Number(acctDigits.slice(0, 2)) % 28), 9, 0, 0);

  return labels.map((label, i) => ({
    label,
    status: i < currentIndex ? "completed" : i === currentIndex ? "current" : "upcoming",
    timestamp: formatDDMMYYYYHHmmss(new Date(baseDate.getTime() + STEP_OFFSET_MINUTES[i] * 60_000)),
  }));
}

function TimelineItem({
  step,
  isLast,
  content,
}: {
  step: TimelineStep;
  isLast: boolean;
  content?: ReactNode;
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
        {content && (
          <div className="mt-3 rounded-xl border border-border bg-muted/40 p-4">{content}</div>
        )}
      </div>
    </div>
  );
}

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
    <div className={cn("flex items-center justify-between gap-4 px-4 py-3", className)}>
      <span className="shrink-0 text-[12px] text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center justify-end gap-1.5 text-[13px] font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

export function TransactionDetailsDrawer({
  row,
  open,
  onOpenChange,
  onUploaded,
  isPartnerUser,
}: TransactionDetailsDrawerProps) {
  const { isMobile } = useBreakpoint();

  return (
    <Drawer open={open} onOpenChange={onOpenChange} side={isMobile ? "bottom" : "right"}>
      <DrawerContent
        className={cn(
          "flex flex-col gap-0 p-0",
          // Desktop: fixed-width side panel. Mobile: the Drawer's own "bottom"
          // side classes already provide w-full/max-h/rounded-t/border-t, so
          // they're left untouched rather than fighting them with a width
          // override meant for the right-side desktop layout.
          !isMobile && "w-[92vw] sm:w-[560px] sm:max-w-[560px]",
          // The design system's Drawer always renders its own close button
          // (top-right, raw <button> + lucide icon) with no prop to disable
          // it, so it's hidden here in favor of the standard Button + Icon
          // close control used elsewhere in the app (see WidgetLibraryModal).
          "[&>button:last-child]:hidden"
        )}
      >
        <DrawerTitle asChild>
          <VisuallyHidden>Transaction details</VisuallyHidden>
        </DrawerTitle>

        {/* Header container — close button + Transaction ID, horizontally aligned. */}
        <div className="flex shrink-0 items-center justify-between px-6 pt-4 pb-3">
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="Close"
              className="-ml-2 h-9 min-h-9 w-9 shrink-0 gap-0 rounded-lg border-0 bg-transparent px-0 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon name="x" className="h-4 w-4" />
            </Button>
          </DrawerClose>
          {row && (
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <span>Txn ID</span>
              <CopyableText value={row.gid} />
            </div>
          )}
        </div>

        {row && <DrawerBody row={row} onOpenChange={onOpenChange} onUploaded={onUploaded} isPartnerUser={isPartnerUser} />}
      </DrawerContent>
    </Drawer>
  );
}

function DrawerBody({
  row,
  onOpenChange,
  onUploaded,
  isPartnerUser,
}: {
  row: McaTransaction;
  onOpenChange: (open: boolean) => void;
  onUploaded?: (row: McaTransaction) => void;
  isPartnerUser: boolean;
}) {
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

  return (
    <>
      {/* Content container — Country → Amount → Date&Time, a single left-aligned stack. */}
      <div className="shrink-0 border-b border-border px-6 pt-1 pb-5">
        <div className="flex flex-col items-start gap-1.5">
          <CountryCell iso2={row.partnerCustomerCountry} />
          <div className="flex w-full flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[26px] font-semibold tabular-nums text-foreground">
                {formatCurrency(amount, currency, "en-US")}
              </span>
              <StatusBadge variant={variant} label={label} trailIcon={trailIcon} />
            </div>
            {isSettled && settledOnTimestamp && (
              <Badge variant="secondary" size="sm">
                Settled on: {settledOnTimestamp}
              </Badge>
            )}
          </div>
          <p className="text-[13px] leading-snug">
            <span className="font-medium text-foreground">by {counterpartyName}</span>{" "}
            <span className="text-muted-foreground">at {row.formattedCreationDateTime ?? "—"}</span>
          </p>
        </div>
      </div>

      {/* Body — scrollable sections. */}
      <div className="flex-1 space-y-6 overflow-y-auto px-6 pt-6 pb-5">
        {isReversed && (
          <Alert variant="error">
            <AlertDescription>
              Funds for this transaction were reversed and returned to the remitter.
            </AlertDescription>
          </Alert>
        )}

        {/* Transaction details — temporarily disabled, kept for later restoration.
        <section>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Transaction details
          </h3>
          <div className="divide-y divide-border rounded-xl border border-border">
            <DetailRow label="Remitter name" value={counterpartyName} />
            <DetailRow label="Country" value={<CountryCell iso2={row.partnerCustomerCountry} />} />
            <DetailRow label="Currency" value={currency} />
            {isPartnerUser && <DetailRow label="Merchant ID" value={row.merchantId} />}
            {row.settlementAmount && (
              <DetailRow
                label="Settlement amount"
                value={formatCurrency(
                  parseFloat(row.settlementAmount),
                  row.settlementCurrency ?? currency,
                  "en-US"
                )}
              />
            )}
            {row.settlementDate && <DetailRow label="Settlement date" value={row.settlementDate} />}
          </div>
        </section>
        */}

        {isSettled && (
          // mb-8 overrides the space-y-6 gap below this section (24px) to 32px —
          // space-y's margin is applied via a zero-specificity :where() selector,
          // so a direct margin utility here replaces it cleanly for this child only.
          <section className="mb-8">
            <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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

        <section>
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Settlement timeline
          </h3>
          <div>
            {timeline.map((step, i) => (
              <TimelineItem
                key={step.label}
                step={step}
                isLast={i === timeline.length - 1}
                content={
                  i === WAITING_FOR_INVOICE_STEP_INDEX && needsAction && !isReversed ? (
                    <UploadInvoiceForm
                      row={row}
                      variant="inline"
                      onSuccess={() => onUploaded?.(row)}
                    />
                  ) : undefined
                }
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
