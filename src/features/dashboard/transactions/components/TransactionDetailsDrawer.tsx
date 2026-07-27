"use client";

import type { ReactNode } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  StatusBadge,
  VisuallyHidden,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { CountryCell, getStatusMeta } from "@/features/dashboard/transactions/mcaColumns";
import { UploadInvoiceForm } from "@/features/dashboard/transactions/components/UploadInvoiceForm";
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
}

const REVERSED_STATUSES = new Set(["REVERSAL_FOR_RISK_REJECTED", "REVERSAL_FOR_NOT_SUPPORTED"]);

// Derives a single "how far along" index (0-7) from the coarse status fields
// the API exposes today. Steps 3-5 (the three settlement-transfer
// sub-stages) can't be individually resolved from available data — they
// flip from upcoming to completed together once externalStatus reaches
// SETTLED, since the API doesn't expose per-substage timestamps.
function getCurrentStepIndex(row: McaTransaction): number {
  const { externalStatus, frmStatus } = row;

  if (externalStatus === "FIRC_SETTLED") return 7;
  if (externalStatus === "SETTLED") return 6;
  if (externalStatus === "SENT_FOR_SETTLEMENT" || externalStatus === "FUNDS_ON_HOLD") return 3;
  if (frmStatus === "APPROVED") return 3;
  if (frmStatus === "REVIEW_IN_PROGRESS" || externalStatus === "SENT_FOR_REVIEW") return 2;
  if (REVERSED_STATUSES.has(externalStatus)) return 2;
  return 1;
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
    "Waiting for invoice",
    "Invoice review",
    "Transfer initiated to PayGlocal's India partner bank",
    "Converted to INR",
    `Transfer initiated to your ICICI BANK LIMITED A/C **${acctSuffix}`,
    "FIRC issuance",
  ];

  return labels.map((label, i) => ({
    label,
    status: i < currentIndex ? "completed" : i === currentIndex ? "current" : "upcoming",
  }));
}

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
      <div className={cn(!isLast && "pb-5")}>
        <p
          className={cn(
            "text-[13px] leading-snug",
            step.status === "upcoming" ? "text-muted-foreground" : "font-medium text-foreground"
          )}
        >
          {step.label}
        </p>
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
  return (
    <Drawer open={open} onOpenChange={onOpenChange} side="right">
      <DrawerContent
        className={cn(
          "flex w-[92vw] flex-col gap-0 p-0",
          "sm:w-[560px] sm:max-w-[560px]",
          // The design system's Drawer always renders its own close button
          // (top-right, raw <button> + lucide icon) with no prop to disable
          // it, so it's hidden here in favor of the standard Button + Icon
          // close control used elsewhere in the app (see WidgetLibraryModal).
          "[&>button:last-child]:hidden"
        )}
      >
        <DrawerClose asChild>
          <Button
            type="button"
            variant="ghost"
            aria-label="Close"
            className="absolute left-4 top-4 z-10 h-9 min-h-9 w-9 shrink-0 gap-0 rounded-lg border-0 bg-transparent px-0 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Icon name="x" className="h-4 w-4" />
          </Button>
        </DrawerClose>
        <DrawerTitle asChild>
          <VisuallyHidden>Transaction details</VisuallyHidden>
        </DrawerTitle>
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

  const counterpartyName = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName ?? "—";
  const amount = parseFloat(row.amount ?? "0");
  const currency = row.currency ?? "USD";
  const timeline = buildTimeline(row);

  return (
    <>
      {/* Header — fixed, non-scrolling. Amount + status are the primary anchor. */}
      <div className="shrink-0 border-b border-border px-6 pt-6 pb-5 pl-12">
        <div className="flex justify-end">
          <div className="flex flex-col items-end gap-0.5 text-[12px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>Txn ID</span>
              <CopyableText value={row.gid} />
            </div>
            <span>{row.formattedCreationDateTime ?? "—"}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <span className="text-[26px] font-semibold tabular-nums text-foreground">
            {formatCurrency(amount, currency, "en-US")}
          </span>
          <StatusBadge variant={variant} label={label} trailIcon={trailIcon} />
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">by {counterpartyName}</p>
      </div>

      {/* Body — scrollable sections. */}
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {isReversed && (
          <Alert variant="error">
            <AlertDescription>
              Funds for this transaction were reversed and returned to the remitter.
            </AlertDescription>
          </Alert>
        )}

        {needsAction && !isReversed && (
          <UploadInvoiceForm
            row={row}
            variant="inline"
            onSuccess={() => {
              onUploaded?.(row);
              onOpenChange(false);
            }}
          />
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

        <section>
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Settlement timeline
          </h3>
          <div className="rounded-xl border border-border p-4">
            {timeline.map((step, i) => (
              <TimelineItem key={step.label} step={step} isLast={i === timeline.length - 1} />
            ))}
          </div>
        </section>

        <Accordion type="single" collapsible className="rounded-xl border border-border">
          <AccordionItem value="more-details" className="border-b-0 px-4">
            <AccordionTrigger>More details</AccordionTrigger>
            <AccordionContent>
              <div className="-mt-1 divide-y divide-border border-t border-border">
                <DetailRow label="Internal status" value={row.internalStatus} className="px-0" />
                <DetailRow label="FRM status" value={row.frmStatus} className="px-0" />
                <DetailRow label="Invoice type" value={row.invoiceType} className="px-0" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  );
}
