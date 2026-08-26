"use client";

import { useState, type ReactNode } from "react";
import { Alert, AlertDescription, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  SettlementBreakdown,
  DownloadFircButton,
} from "@/features/dashboard/mca-transactions/components/SettlementBreakdown";
import { VirtualAccountRow } from "@/features/dashboard/mca-transactions/components/VirtualAccountRow";
import { getMockUtrNumber } from "@/features/dashboard/mca-transactions/mock-data";
import { mcaTxnFilePath } from "@/features/dashboard/mca-transactions/services";
import {
  fileNameFrom,
  formatAmount,
  formatEpochMillis,
  formatEventTime,
} from "@/features/dashboard/mca-transactions/timeline/format";
import { currencySymbol } from "@/lib/utils/format";
import { accountNumberOf } from "@/features/dashboard/multi-currency/utils";
import type {
  SettlementStepStatus,
  SettlementTimelineStep,
} from "@/features/dashboard/mca-transactions/components/SettlementTimelineStepper";
import type {
  McaTransaction,
  MultipleTimelineEvents,
  PaymentTimelineData,
  TimelineStatus,
  TxnAccountDetails,
} from "@/features/dashboard/mca-transactions/types";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

// Maps the timeline API's event bag into the ordered list of steps the
// stepper renders. Port of pg-dashboard's TimeLineMapper, keeping its step
// order, titles and — importantly — its early-exit behaviour: a reversal
// terminates the timeline at the step it happened on, because everything
// after it never occurred.
//
// No step carries subtext except the reversal, matching pg-dashboard exactly.
// Its createTimelineItem accepts a subtitle argument and returns it for no
// status, so the several subtitle strings it builds are never rendered; those
// strings are simply not built here rather than computed and thrown away.
// Anything a subtitle would have said is already on screen: the uploaded
// file name is the download chip under the step, the rejection reason is its
// alert, the FX rate is in the conversion step's own title, and the remitter
// is in the details summary above the card.

/** The four states the API reports per event, before a reversal is folded in. */
type ApiStatus = "PENDING" | "SUCCESS" | "ERROR" | "IN_PROGRESS";

interface TimelineEventWithStatus {
  STATUS?: string;
  FORMATTED_DATE_TIME?: string;
}

const isReversalDone = (status?: string): boolean => status === "REVERSAL_DONE";

const statusOrPending = (status?: string): ApiStatus =>
  (status as ApiStatus | undefined) ?? "PENDING";

function toStepStatus(status: ApiStatus): SettlementStepStatus {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "ERROR":
      return "error";
    case "IN_PROGRESS":
      return "inProgress";
    default:
      return "pending";
  }
}

function createStep(
  title: string,
  status: ApiStatus,
  children: ReactNode,
  date: string
): SettlementTimelineStep {
  // A pending step is a placeholder for something that hasn't happened, so it
  // shows its title alone — no timestamp, no nested content.
  if (status === "PENDING") return { status: "pending", title };
  // In progress: no timestamp either. The event's time is when the step
  // started, which reads as a completion time beside a step that hasn't
  // completed.
  if (status === "IN_PROGRESS") return { status: "inProgress", title, children };
  return { status: toStepStatus(status), title, children, date };
}

function createReversalStep(formattedDateTime?: string): SettlementTimelineStep {
  const when = formatEventTime(formattedDateTime);
  return {
    status: "reversal",
    title: "Funds reversed",
    subtitle: when ? `Initiated · ${when}` : "Initiated",
  };
}

/** Pushes `step`, unless the event reversed — in which case a reversal step
 *  goes in instead and the caller stops building. Returns true if it did. */
function appendStep(
  steps: SettlementTimelineStep[],
  event: TimelineEventWithStatus | undefined,
  step: SettlementTimelineStep
): boolean {
  if (isReversalDone(event?.STATUS)) {
    steps.push(createReversalStep(event?.FORMATTED_DATE_TIME));
    return true;
  }
  steps.push(step);
  return false;
}

const REJECTION_PREVIEW_LENGTH = 50;

/** Compliance's rejection remark, clamped with a Show more/less toggle since
 *  these run long and would otherwise dominate the step. */
function RejectionReason({ reason }: { reason: string }) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = reason.trim();
  const shouldTruncate = trimmed.length > REJECTION_PREVIEW_LENGTH;
  const shown =
    shouldTruncate && !expanded
      ? `${trimmed.slice(0, REJECTION_PREVIEW_LENGTH).trimEnd()}…`
      : trimmed;

  return (
    <Alert variant="warning" className="mt-2">
      <AlertDescription className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[12px]">
        <span className="font-medium">Rejected:</span>
        <span className="min-w-0">{shown}</span>
        {shouldTruncate && (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="ml-auto h-auto min-h-0 px-0 py-0 text-[12px] font-normal"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Show less" : "Show more"}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/** The uploaded invoice as a downloadable attachment chip. */
function InvoiceAttachment({ fileName, onDownload }: { fileName: string; onDownload: () => void }) {
  return (
    <button
      type="button"
      onClick={onDownload}
      className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
    >
      <Icon name="paperclip" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-[12px] font-medium text-primary">{fileName}</span>
      <Icon name="download" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

export interface BuildTimelineArgs {
  data: PaymentTimelineData;
  multipleTimelineEvents?: MultipleTimelineEvents;
  /** documentsPresent from the documents endpoint — the legacy source of the
   *  uploaded file name, for transactions whose timeline predates FILE_NAME. */
  documents: string[];
  row: McaTransaction;
  isAmzTxn: boolean;
  isFundDelayed: boolean;
  isSameBankSettlement: boolean;
  accountDetails?: TxnAccountDetails | null;
  /** The merchant's real virtual accounts (from useVirtualAccounts("general")),
   *  used to look up a masked account number by currency when this
   *  transaction's own accountDetails doesn't carry one. */
  virtualAccounts?: VirtualAccount[];
  onDownloadDocument: (documentPath: string) => void;
  onDownloadFirc: () => void;
  isFircDownloading?: boolean;
  /** Rendered under the invoice-upload step while it is awaiting the
   *  merchant's file, so the upload form sits at the point in the timeline it
   *  belongs to rather than beside it. */
  uploadSlot?: ReactNode;
}

export function buildSettlementTimeline({
  data,
  multipleTimelineEvents,
  documents,
  row,
  isAmzTxn,
  isFundDelayed,
  isSameBankSettlement,
  accountDetails,
  virtualAccounts,
  onDownloadDocument,
  onDownloadFirc,
  isFircDownloading,
  uploadSlot,
}: BuildTimelineArgs): SettlementTimelineStep[] {
  // Transactions predating multipleTimelineEvents carry one upload/approval
  // pair on the root instead. Normalising to a list here means the loop below
  // handles both without branching on every access.
  const isLegacySingleInvoice =
    !multipleTimelineEvents?.INVOICE || multipleTimelineEvents.INVOICE.length === 0;
  const invoiceEvents = isLegacySingleInvoice
    ? [{ INVOICE_UPLOAD: data?.INVOICE_UPLOAD, INVOICE_APPROVED: data?.INVOICE_APPROVED }]
    : multipleTimelineEvents.INVOICE!;

  const invoiceSteps: SettlementTimelineStep[] = [];

  for (let idx = 0; idx < invoiceEvents.length; idx += 1) {
    const upload = invoiceEvents[idx]?.INVOICE_UPLOAD;
    const approval = invoiceEvents[idx]?.INVOICE_APPROVED;

    if (isReversalDone(upload?.STATUS)) {
      invoiceSteps.push(createReversalStep(upload?.FORMATTED_DATE_TIME));
      break;
    }

    const uploadStatus = statusOrPending(upload?.STATUS);
    const approvalStatus = statusOrPending(approval?.STATUS);

    const uploadedFileName = fileNameFrom(upload?.FILE_NAME);
    const legacyDocumentKey =
      isLegacySingleInvoice && idx === 0 && documents.length > 0 ? documents[0]! : null;

    let displayFileName = "";
    if (uploadedFileName) displayFileName = uploadedFileName;
    else if (legacyDocumentKey) displayFileName = fileNameFrom(legacyDocumentKey);

    // The presign endpoint takes a path suffix, which is either built from the
    // file name or is the documentsPresent entry as-is.
    let downloadPath = "";
    if (uploadedFileName && row.merchantId && row.gid) {
      downloadPath = mcaTxnFilePath(row.merchantId, row.gid, uploadedFileName);
    } else if (legacyDocumentKey) {
      downloadPath = legacyDocumentKey;
    }

    const uploadTitle = idx > 0 ? "Invoice re-uploaded" : "Upload invoice";
    const reviewTitle = {
      ERROR: "Invoice rejected",
      PENDING: "Invoice review",
      IN_PROGRESS: "Invoice review",
      SUCCESS: "Invoice approved",
    }[approvalStatus];

    let uploadChildren: ReactNode = null;
    if (uploadStatus === "SUCCESS" && displayFileName && downloadPath) {
      uploadChildren = (
        <InvoiceAttachment
          fileName={displayFileName}
          onDownload={() => onDownloadDocument(downloadPath)}
        />
      );
    }
    if (uploadStatus === "IN_PROGRESS" && uploadSlot) {
      uploadChildren = <div className="mt-3">{uploadSlot}</div>;
    }

    const approvalChildren =
      approvalStatus === "ERROR" && approval?.REMARK ? (
        <RejectionReason reason={approval.REMARK} />
      ) : null;

    invoiceSteps.push(
      createStep(
        uploadTitle,
        uploadStatus,
        uploadChildren,
        formatEventTime(upload?.FORMATTED_DATE_TIME, uploadStatus !== "IN_PROGRESS")
      )
    );

    if (isReversalDone(approval?.STATUS)) {
      invoiceSteps.push(createReversalStep(approval?.FORMATTED_DATE_TIME));
      break;
    }

    invoiceSteps.push(
      createStep(
        reviewTitle,
        approvalStatus,
        approvalChildren,
        formatEventTime(approval?.FORMATTED_DATE_TIME, approvalStatus !== "PENDING")
      )
    );
  }

  const txnCurrency = data?.FUND_RECEIVED?.TXN_CURRENCY || row.currency || "INR";
  // Symbol, amount, then the currency code, matching the format the first
  // timeline step's title is built from below ("$1 USD received in USD
  // Account ••••1234").
  const receivedMoney = `${currencySymbol(txnCurrency)}${formatAmount(data?.FUND_RECEIVED?.TXN_AMOUNT, txnCurrency)} ${txnCurrency}`;
  // Prefer this transaction's own recorded funding account (accountDetails,
  // the same object VirtualAccountRow renders below this step). When the
  // timeline API hasn't attached one, fall back to the merchant's real
  // virtual account for this currency, and if the currency isn't one of the
  // named accounts (USD/GBP/EUR/CAD/AUD) fall back again to the "GLOBAL"
  // SWIFT catch-all account, which is what actually receives every other
  // currency in the real system (see mapAccounts.ts's isGlobal). A masked
  // number should always be resolvable this way; the only case it can't is a
  // merchant with no virtual accounts at all yet.
  const fallbackVirtualAccount =
    virtualAccounts?.find((account) => account.currency === txnCurrency) ??
    virtualAccounts?.find((account) => account.isGlobal);
  const resolvedAccountNumber =
    accountDetails?.accountNumber || (fallbackVirtualAccount && accountNumberOf(fallbackVirtualAccount)) || "";
  // Last 4 digits only, bullet-masked, same convention RecentActivityTable
  // already uses for card numbers elsewhere in the product.
  const maskedAccountSuffix = resolvedAccountNumber
    ? `••••${resolvedAccountNumber.slice(-4)}`
    : "";
  // See getMockUtrNumber's own TODO (mock-data.ts): no per-transaction UTR
  // field exists in the API yet, so this is a placeholder rather than the
  // real thing. Kept truthy-checked below regardless, so the "don't show if
  // no UTR exists" behaviour is already correct once a real, nullable field
  // replaces this.
  const utrNumber = getMockUtrNumber(row.gid);

  const pgHouseStatus = data?.PG_HOUSE_FUND_RECEIVED?.STATUS;
  const fircStatus = data?.FIRC_RECEIVED?.STATUS;

  const steps: SettlementTimelineStep[] = [];

  // ── Funds received ────────────────────────────────────────────────────────
  const fundsReceivedSucceeded = data?.FUND_RECEIVED?.STATUS === "SUCCESS";
  const fundsInTransitAlert =
    row.externalStatus === "FUNDS_IN_TRANSIT" && row.valueDateTime ? (
      <Alert variant="warning" className="mt-2">
        <AlertDescription className="text-[12px]">
          We have received notification of your payment. The funds are currently being processed
          through the banking network and are expected to be credited on{" "}
          {formatEpochMillis(row.valueDateTime)}.
        </AlertDescription>
      </Alert>
    ) : null;

  const fundReceivedChildren =
    accountDetails || fundsInTransitAlert ? (
      <>
        {accountDetails && <VirtualAccountRow accountDetails={accountDetails} />}
        {fundsInTransitAlert}
      </>
    ) : null;

  const fundsPendingTitle =
    row.externalStatus === "FUNDS_IN_TRANSIT"
      ? "Funds in Transit"
      : "Funds received in virtual account";

  if (
    appendStep(
      steps,
      data?.FUND_RECEIVED,
      createStep(
        fundsReceivedSucceeded
          ? `${receivedMoney} received in ${txnCurrency} Account${maskedAccountSuffix ? ` ${maskedAccountSuffix}` : ""}`
          : fundsPendingTitle,
        statusOrPending(data?.FUND_RECEIVED?.STATUS),
        fundReceivedChildren,
        formatEventTime(data?.FUND_RECEIVED?.FORMATTED_DATE_TIME)
      )
    )
  ) {
    return steps;
  }

  // ── Invoice upload / review ───────────────────────────────────────────────
  // Amazon transactions settle without a merchant invoice, so the whole
  // upload/review pair is skipped for them.
  if (!isAmzTxn) {
    steps.push(...invoiceSteps);
    if (steps[steps.length - 1]?.status === "reversal") return steps;
  }

  // ── Transfer to PayGlocal's partner bank ──────────────────────────────────
  if (
    appendStep(
      steps,
      data?.PG_HOUSE_FUND_RECEIVED,
      createStep(
        `${pgHouseStatus === "SUCCESS" ? "Transferred" : "Transfer initiated"} to PayGlocal's India partner bank`,
        statusOrPending(pgHouseStatus),
        isFundDelayed ? (
          <Alert variant="warning" className="mt-2">
            <AlertDescription className="text-[12px]">
              <span className="font-medium">Bank Holiday:</span> Payments made during holiday
              periods may take longer to settle, so this one could take an additional 1–2 business
              days.
            </AlertDescription>
          </Alert>
        ) : null,
        formatEventTime(data?.PG_HOUSE_FUND_RECEIVED?.FORMATTED_DATE_TIME)
      )
    )
  ) {
    return steps;
  }

  // ── FX conversion ─────────────────────────────────────────────────────────
  if (data?.FX_BOOKED) {
    const fx = data.FX_BOOKED;
    const fxSucceeded = fx.STATUS === "SUCCESS";
    if (
      appendStep(
        steps,
        fx,
        createStep(
          fxSucceeded
            ? `Converted to INR: ${fx.payoutCurrency} → INR at ₹${fx.conversionRate} / ${fx.payoutCurrency}`
            : "Converted to INR",
          statusOrPending(fx.STATUS),
          null,
          formatEventTime(fx.FORMATTED_DATE_TIME)
        )
      )
    ) {
      return steps;
    }
  }

  // ── Settlement to the merchant's bank ─────────────────────────────────────
  if (
    appendStep(
      steps,
      data?.SETTLED,
      createStep(
        `Transfer initiated to your ${data?.SETTLED?.bankName ?? "bank"} A/C ${data?.SETTLED?.accountNumber ?? ""}`.trim(),
        statusOrPending(data?.SETTLED?.STATUS),
        data?.FX_BOOKED || data?.SETTLED ? (
          <SettlementBreakdown data={data.FX_BOOKED ?? data.SETTLED} />
        ) : null,
        formatEventTime(data?.SETTLED?.FORMATTED_DATE_TIME)
      )
    )
  ) {
    return steps;
  }

  // ── FIRC issuance ─────────────────────────────────────────────────────────
  // Same-bank settlements never produce a FIRC, so the step is omitted rather
  // than shown permanently pending.
  if (!isSameBankSettlement) {
    appendStep(
      steps,
      data?.FIRC_RECEIVED,
      createStep(
        "FIRC issuance",
        statusOrPending(fircStatus),
        fircStatus === "SUCCESS" ? (
          <>
            <DownloadFircButton onDownload={onDownloadFirc} isLoading={isFircDownloading} />
            {/* Part of this same FIRC issuance step, not a separate section:
                rendered right after the download action, visually secondary
                (smaller, muted) the same way RejectionReason and other
                children elsewhere in this timeline read as supporting detail
                rather than a primary line. Omitted entirely when there's no
                UTR to show, rather than rendering an empty "UTR:" line. */}
            {utrNumber && (
              <p className="mt-1.5 text-[11px] text-muted-foreground">UTR: {utrNumber}</p>
            )}
          </>
        ) : null,
        formatEventTime(data?.FIRC_RECEIVED?.FORMATTED_DATE_TIME, fircStatus === "SUCCESS")
      )
    );
  }

  return steps;
}

/** True when any timeline event reports a reversal — drives the page-level
 *  "funds reversed" banner, which replaces the other status alerts. */
export function hasTimelineReversal(
  data: PaymentTimelineData | undefined,
  multipleTimelineEvents?: MultipleTimelineEvents
): boolean {
  if (!data) return false;
  const invoiceEvents =
    multipleTimelineEvents?.INVOICE && multipleTimelineEvents.INVOICE.length > 0
      ? multipleTimelineEvents.INVOICE
      : [{ INVOICE_UPLOAD: data.INVOICE_UPLOAD, INVOICE_APPROVED: data.INVOICE_APPROVED }];

  const events: Array<{ STATUS?: TimelineStatus } | undefined> = [
    data.FUND_RECEIVED,
    ...invoiceEvents.flatMap((e) => [e?.INVOICE_UPLOAD, e?.INVOICE_APPROVED]),
    data.PG_HOUSE_FUND_RECEIVED,
    data.FX_BOOKED,
    data.SETTLED,
    data.FIRC_RECEIVED,
  ];

  return events.some((event) => isReversalDone(event?.STATUS));
}

/** The alert copy shown while a transaction sits in DOCUMENT_PENDING —
 *  which differs depending on whether an earlier invoice was rejected. */
export function getDocumentPendingMessage(multipleTimelineEvents?: MultipleTimelineEvents): string {
  const invoiceEvents = multipleTimelineEvents?.INVOICE ?? [];
  const hasRejection = invoiceEvents.some((e) => e?.INVOICE_APPROVED?.STATUS === "ERROR");
  const hasResubmission =
    hasRejection && invoiceEvents.some((e) => e?.INVOICE_APPROVED?.STATUS === "IN_PROGRESS");

  if (hasResubmission) return "Revised invoice received. Compliance review in progress.";
  if (hasRejection)
    return "Invoice does not match the payment, upload a corrected invoice to proceed";
  return "Upload your invoice to proceed with settlement";
}
