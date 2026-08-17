"use client";

import type { ReactNode } from "react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  StatusBadge,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatTransactionDateOnly,
  formatTransactionTimestamp,
  truncateMiddle,
} from "@/lib/utils/format";
import {
  CountryCell,
  getStatusMeta,
  MdrOfferBadge,
} from "@/features/dashboard/mca-transactions/columns";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { UploadInvoiceForm } from "@/features/dashboard/mca-transactions/components/UploadInvoiceForm";
import { SettlementTimelineSection } from "@/features/dashboard/mca-transactions/components/SettlementTimelineSection";
import { useFircDownload } from "@/features/dashboard/mca-transactions/hooks";
import { mcaTxnTimelineApi } from "@/features/dashboard/mca-transactions/services";
import { useGet } from "@/lib/api/hooks";
import type {
  McaTransaction,
  TimelineApiResponse,
  TxnAccountDetails,
} from "@/features/dashboard/mca-transactions/types";

interface TransactionDetailsPageProps {
  row: McaTransaction;
  onBack: () => void;
  /** Closes the full page and reopens the same transaction in the drawer. */
  onCollapse: () => void;
  onUploaded?: (row: McaTransaction) => void;
  onOpenTransaction: (row: McaTransaction) => void;
  isPartnerUser: boolean;
  /** Label for the onBack button — this view is shared by more than one
   *  entry point (the Transactions table and Multi Currency Accounts'
   *  Action Required list), so the copy names wherever `onBack` actually
   *  returns to for the caller currently rendering it. */
  backLabel?: string;
}

const REVERSED_STATUSES = new Set(["REVERSAL_FOR_RISK_REJECTED", "REVERSAL_FOR_NOT_SUPPORTED"]);

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

// The virtual account the funds actually landed in, as reported by the
// settlement timeline. Read through the same query key SettlementTimelineSection
// uses, so React Query serves it from cache rather than issuing a second
// request — this is the same response, read by a second consumer.
//
// Deliberately not derived from useApp's countryCurrencyMap: that is a
// country->currency map with one row per country, and several countries share
// a currency, so looking it up by currency code alone returns whichever
// country the API happens to list first rather than the one this account is
// actually held in.
function useReceivingAccount(row: McaTransaction): TxnAccountDetails | null {
  const { data } = useGet<TimelineApiResponse>(
    ["mca-txn-timeline", row.gid],
    mcaTxnTimelineApi(row.gid),
    { enabled: !!row.gid }
  );
  return data?.data?.accountDetails ?? null;
}

// floatTitle floats this section's heading out of flow, for a full-page grid
// row that it shares with a left-column section whose card starts flush at the
// top of the row — that keeps the two cards' top edges aligned. Both current
// call sites pass false, since every left-column section now carries its own
// in-flow title.
function PaymentDetailsSection({
  row,
  currency,
  floatTitle,
}: {
  row: McaTransaction;
  currency: string;
  floatTitle: boolean;
}) {
  const account = useReceivingAccount(row);
  const accountCurrency = account?.currency ?? currency;

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
          <DetailRow
            label="Transaction date"
            value={formatTransactionTimestamp(row.formattedTransactionCreationDateTime)}
          />
          {/* Always shown, even pre-settlement — a "-" placeholder keeps the
              field present across every transaction state instead of the
              row disappearing until settlement. */}
          <DetailRow
            label="Settlement date"
            value={row.settlementDate ? formatTransactionTimestamp(row.settlementDate) : "-"}
          />
          {/* Names the account the funds landed in — its holder, or failing
              that the bank, or failing both the currency it is held in. */}
          <DetailRow
            label="Receiving Account"
            value={account?.accountHolderName ?? account?.bankName ?? `${accountCurrency} Account`}
          />
          {/* Flag + code chip rather than bare text, so the currency is
              recognisable at a glance. Flux's Badge is the chip primitive
              here, with the flag in its leftIcon slot. CountryFlag is the
              same small-flag component every other country chip in the
              product uses (the Transactions table's Country column, the
              Currency filter's own options below), so this one can't drift
              from them in asset, size, or border. The flag is decorative
              beside the code it labels, hence the empty alt; if this
              currency has no matching MOCK_VIRTUAL_ACCOUNTS entry the chip
              shows the code alone instead of a guessed flag. */}
          <DetailRow
            label="Currency"
            value={
              <Badge
                variant="secondary"
                size="md"
                leftIcon={
                  account?.bankCountry ? <CountryFlag iso2={account.bankCountry} /> : undefined
                }
              >
                {accountCurrency}
              </Badge>
            }
          />
          {/* Elided from the middle for the same reason the account number
              is (see VirtualAccountRow): this column is the narrow one, and a
              gid is checked against a reference rather than read. */}
          <DetailRow
            label="Transaction ID"
            value={
              <CopyableText
                value={row.gid}
                displayValue={truncateMiddle(row.gid, 12, 6)}
                className="min-w-0"
                valueClassName="min-w-0 truncate"
              />
            }
          />
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
  backLabel = "Back to Transactions",
}: TransactionDetailsPageProps) {
  return (
    <div>
      {/* Back/Collapse only, both left-aligned and adjacent to each other.
          No Transaction ID here (unlike the drawer's Expand/Close row, see
          TransactionDetailsDrawer.tsx). The expanded page drops it entirely
          rather than relocating it. */}
      <div className="mb-2 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground"
        >
          {backLabel}
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

interface TransactionDetailsContentProps extends Omit<
  TransactionDetailsPageProps,
  "onBack" | "onCollapse"
> {
  /** "page" (default): 2-column grid, as on the full Transaction Details
   * page. "drawer": single column, everything stacked in document order,
   * for the narrower drawer viewport. */
  layout?: "page" | "drawer";
}

// Every section of the transaction detail view: summary, FIRA banner,
// Settlement Timeline (which carries the invoice upload/download and the
// settlement money breakdown inside its own steps), and Payment/Sender
// Details. Rendered as-is by both TransactionDetailsPage (above) and
// TransactionDetailsDrawer, so neither view can drift from the other in
// conditional states or behaviour. Only the arrangement (layout prop)
// differs between them.
//
// onOpenTransaction isn't destructured here (unlike the other props) since
// Linked Transactions, its only consumer, no longer renders, it's left in
// TransactionDetailsContentProps/TransactionDetailsPageProps rather than
// removed there, since callers (TransactionDetailsDrawer, McaTransactionTable,
// VirtualAccountActionRequired) still thread it through for a possible future
// "jump to another transaction" entry point, and dropping it from the shared
// prop contract now would mean re-adding it later across every call site.
export function TransactionDetailsContent({
  row,
  onUploaded,
  isPartnerUser,
  layout = "page",
}: TransactionDetailsContentProps) {
  const isFrmPending = row.frmStatus === "PENDING_MERCHANT_UPLOAD";
  const { label, variant, trailIcon } = getStatusMeta(row.externalStatus, isFrmPending);
  const needsAction = isFrmPending || row.externalStatus === "DOCUMENT_PENDING";
  const isReversed = REVERSED_STATUSES.has(row.externalStatus);

  const counterpartyName = row.partnerMaskedCustomerFullName ?? row.partnerCustomerFullName ?? "—";
  const amount = parseFloat(row.amount ?? "0");
  const currency = row.currency ?? "USD";

  // Only the SETTLED status (not FIRC_SETTLED, which already has its own
  // distinct "FIRC Settled" label) gets its chip text swapped to include the
  // settlement date — same green/success variant and check trailIcon
  // getStatusMeta already returns, just a different label for this one
  // status value.
  const summaryStatusLabel =
    row.externalStatus === "SETTLED" && row.settlementDate
      ? `Settled on ${formatTransactionDateOnly(row.settlementDate)}`
      : label;

  // The invoice upload form is handed to the timeline, which nests it under
  // whichever step is actually awaiting the file. It's offered only while the
  // transaction genuinely needs merchant action.
  const uploadSlot =
    needsAction && !isReversed ? (
      <UploadInvoiceForm row={row} variant="inline" onSuccess={() => onUploaded?.(row)} />
    ) : undefined;

  // pg-dashboard shows "To be updated" rather than a date while the
  // transaction is still on hold or awaiting an invoice: a settlement date
  // exists on the record by then, but it isn't yet a commitment.
  const settlementDateLabel = row.settlementDate
    ? ["FUNDS_ON_HOLD", "DOCUMENT_PENDING"].includes(row.externalStatus)
      ? "To be updated"
      : formatTransactionDateOnly(row.settlementDate)
    : null;

  // Demo/preview transactions are seeded with "mocked" in their gid. Without
  // this they are indistinguishable from real ones.
  const isSampleTransaction = row.gid?.includes("mocked");

  const summary = (
    <div className={layout === "drawer" ? undefined : "mb-9"}>
      {isSampleTransaction && (
        <Alert variant="warning" className="mb-4">
          <AlertDescription>This is a sample transaction shown for preview only.</AlertDescription>
        </Alert>
      )}
      {/* flex-wrap rather than a hard breakpoint: the date drops below the
          amount block on its own once the row runs out of width (the
          drawer's narrower viewport), instead of being hidden outright. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <CountryCell iso2={row.partnerCustomerCountry} />
          <div className="mt-1.5 flex flex-col items-start gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-[26px] font-semibold tabular-nums text-foreground">
                {formatCurrency(amount, currency, "en-US")}
              </span>
              <MdrOfferBadge totalMdrDiscount={row.totalMdrDiscount} />
              <StatusBadge variant={variant} label={summaryStatusLabel} trailIcon={trailIcon} />
            </div>
            {/* Supporting context under the amount, lower emphasis than the
                amount itself (text-[13px], muted label) but still clearly
                readable, with the remitter name itself kept at foreground
                weight so it doesn't disappear entirely. */}
            <p className="text-[13px] text-muted-foreground">
              Charged by <span className="font-medium text-foreground">{counterpartyName}</span>
            </p>
            {/* Settlement date sits with the amount rather than in Payment
                Details, so it is present in the drawer too — that layout
                drops the Payment Details column entirely, which is where the
                date would otherwise have been its only home. Suppressed for
                reversed transactions, which never settle. */}
            {settlementDateLabel && !isReversed && (
              <span className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                Settlement Date: {settlementDateLabel}
              </span>
            )}
          </div>
        </div>

        {/* Drawer only: opposite the amount stack, top-aligned with it via
            the row's items-start. Value only, no label. Transaction ID
            lives in the drawer's own header row beside Expand/Close (see
            TransactionDetailsDrawer.tsx). The expanded page shows neither
            the transaction date nor the transaction ID here: both are
            dropped there entirely, not relocated. */}
        {layout === "drawer" && (
          <span className="shrink-0 text-[13px] text-muted-foreground">
            {formatTransactionTimestamp(row.formattedTransactionCreationDateTime)}
          </span>
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
  );

  if (layout === "drawer") {
    // Single column, in document order: no grid, no row-start math, no
    // floated titles. The drawer is deliberately a lighter view than the full
    // page: Payment Details and Sender Details don't render here at all (see
    // PaymentDetailsSection/SenderDetailsSection below, page-only).
    //
    // The invoice — whether still awaited (uploadSlot) or already uploaded
    // (a download chip) — and the settlement money breakdown all live inside
    // the timeline's own steps rather than as sibling sections, so each
    // appears at the point of the settlement it belongs to. The full page's
    // 2-column grid below nests them identically, just inside its own row.
    //
    return (
      <div className="space-y-9">
        {summary}
        <SettlementTimelineSection row={row} uploadSlot={uploadSlot} />
      </div>
    );
  }

  // The left column is Settlement Timeline alone, whatever the status: the
  // invoice and the settlement breakdown take no rows of their own, since
  // both nest inside the timeline's own steps (see SettlementTimelineSection).
  // The right column (Payment Details + Sender Details) therefore starts on
  // that same row.
  const timelineRow = 1;

  return (
    <div>
      {/* Transaction summary — full-width page header, standalone, no card,
          sitting above the 2-column layout entirely (not part of either
          column). The primary focal point of the page. Transaction Date
          lives in Payment Details — the header never shows a timestamp. */}
      {summary}

      {/* 2-column layout, below the summary. Left column sections use
          explicit row-start classes (rather than a plain space-y stack) so
          the right column can start at whichever row leads the left column
          instead of always row 1. items-start keeps each section sized to
          its own content instead of stretching to match whichever column is
          taller in a shared row. */}
      <div className="grid gap-x-10 gap-y-9 lg:grid-cols-[3fr_1fr] lg:items-start">
        {/* Settlement Timeline. The invoice — awaited (uploadSlot) or
            already uploaded — and the settlement money breakdown all render
            nested inside this card under the timeline step they belong to,
            not as sibling rows. */}
        <div className={cn("lg:col-start-1", ROW_START_CLASS[timelineRow])}>
          <SettlementTimelineSection row={row} uploadSlot={uploadSlot} />
        </div>

        {/* Right column: Payment Details then Sender Details, top-aligned
            with Settlement Timeline across from it. */}
        <div className={cn("space-y-9 lg:col-start-2", ROW_START_CLASS[timelineRow])}>
          <PaymentDetailsSection row={row} currency={currency} floatTitle={false} />
          <SenderDetailsSection
            row={row}
            counterpartyName={counterpartyName}
            isPartnerUser={isPartnerUser}
          />
        </div>
      </div>
    </div>
  );
}
