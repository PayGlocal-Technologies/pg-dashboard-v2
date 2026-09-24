"use client";

import type { ReactNode } from "react";
import {
  Alert,
  AlertDescription,
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
import { SettlementActionCard } from "@/features/dashboard/mca-transactions/components/SettlementActionCard";
import { SettlementTimelineSection } from "@/features/dashboard/mca-transactions/components/SettlementTimelineSection";
import { SettlementBatchDetailsSection } from "@/features/dashboard/mca-transactions/components/SettlementBatchDetailsSection";
import { useFircDownload } from "@/features/dashboard/mca-transactions/hooks";
import { getMockUtrNumber } from "@/features/dashboard/mca-transactions/mock-data";
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
      <Card size="sm" className="shadow-none">
        <CardContent className="space-y-4">
          <DetailRow
            label="Transaction date"
            value={formatTransactionTimestamp(row.formattedTransactionCreationDateTime)}
          />
          {/* Always shown, even pre-settlement — a "Not generated yet"
              placeholder keeps the field present across every transaction
              state instead of the row disappearing until settlement. */}
          <DetailRow
            label="Settlement date"
            value={
              row.settlementDate ? formatTransactionTimestamp(row.settlementDate) : "Not generated yet"
            }
          />
          {/* Same placeholder pattern as Settlement date above, gated on the
              same field: a real UTR only exists once settlement has
              actually happened. See mock-data.ts's getMockUtrNumber for why
              this is still a placeholder. */}
          <DetailRow
            label="UTR number"
            value={row.settlementDate ? getMockUtrNumber(row.gid) : "Not generated yet"}
          />
          {/* Names the account the funds landed in — its holder, or failing
              that the bank, or failing both the currency it is held in. */}
          <DetailRow
            label="Receiving Account"
            value={account?.accountHolderName ?? account?.bankName ?? `${accountCurrency} Account`}
          />
          {/* Flag + code as plain inline text (no chip). CountryFlag is the
              same small-flag component every other country reference in the
              product uses, so this can't drift from them in asset or size;
              the flag is decorative beside the code it labels, and is simply
              omitted when the account carries no country. */}
          <DetailRow
            label="Currency"
            value={
              <span className="flex items-center gap-1.5">
                {account?.bankCountry ? <CountryFlag iso2={account.bankCountry} /> : null}
                {accountCurrency}
              </span>
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
      <Card size="sm" className="shadow-none">
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
    <div className="relative">
      {/* Back/Collapse only, both left-aligned and adjacent to each other.
          No Transaction ID here (unlike the drawer's Expand/Close row, see
          TransactionDetailsDrawer.tsx). The expanded page drops it entirely
          rather than relocating it. */}
      <div className="relative z-10 mb-2 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
          onClick={onBack}
          className="pl-0 text-primary hover:text-primary-hover"
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

// Every section of the transaction detail view: summary, SettlementActionCard
// (the invoice-upload form or the FIRC-ready banner, when there's one to
// show), Settlement Timeline (the settlement money breakdown still renders
// nested inside its own steps), and Payment/Sender Details. Rendered as-is by
// both TransactionDetailsPage (above) and TransactionDetailsDrawer, so
// neither view can drift from the other in conditional states or behaviour.
// Only the arrangement (layout prop) differs between them.
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
  const isReversed = REVERSED_STATUSES.has(row.externalStatus);
  // The two terminal "money has actually arrived" statuses — see
  // columns.tsx's STATUS_META, which is the only other place these two are
  // grouped together (both get the same green "success" badge there). Every
  // other status is still some step short of that, so Payment/Sender
  // Details — read date, UTR, receiving account — would mostly be showing
  // "-" placeholders rather than real values.
  const isSettled = row.externalStatus === "SETTLED" || row.externalStatus === "FIRC_SETTLED";

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

  // Demo/preview transactions are seeded with "mocked" in their gid. Without
  // this they are indistinguishable from real ones.
  const isSampleTransaction = row.gid?.includes("mocked");

  const summary = (
    <div className={layout === "drawer" ? undefined : "mb-6"}>
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
              <span className="text-[34px] font-semibold tabular-nums text-foreground">
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
              Charged to <span className="font-medium text-foreground">{counterpartyName}</span>
            </p>
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
    // floated titles.
    //
    // SettlementActionCard (the invoice-upload form, or the FIRC-ready
    // banner) sits as its own card above Settlement Timeline now, rather
    // than nested inside it — it renders nothing when there's no action, so
    // it never leaves a stray gap when it doesn't apply. The settlement
    // money breakdown still lives inside the timeline's own steps. The full
    // page's 2-column grid below nests both identically, just inside its
    // own column.
    //
    // Payment Details and Sender Details, the same two sections the full
    // page's right column shows, join the stack once settlement is actually
    // done (isSettled) — not before. Both are read straight through the
    // exact same PaymentDetailsSection/SenderDetailsSection the page uses
    // (floatTitle={false} either way: floating only matters for sharing a
    // grid row with a taller sibling, which a single-column stack never
    // does), so there is nothing here that could drift from the page's own
    // version of these two cards. Gating on isSettled rather than always
    // showing them: before settlement, every field either of them displays
    // is still a "-" placeholder (see DetailRow/getMockUtrNumber above), and
    // the drawer is meant to stay the lighter of the two views up to that
    // point.
    return (
      <div className="space-y-4">
        {summary}
        <SettlementActionCard row={row} onUploaded={onUploaded} />
        <SettlementTimelineSection row={row} />
        {isSettled && (
          <>
            <PaymentDetailsSection row={row} currency={currency} floatTitle={false} />
            <SenderDetailsSection
              row={row}
              counterpartyName={counterpartyName}
              isPartnerUser={isPartnerUser}
            />
            {/* The settlement BATCH's own Details/Amount Breakdown — a
                different, wider question than Payment Details above answers
                (that one is this one transaction's own record; this is the
                whole settlement it landed in). See
                SettlementBatchDetailsSection's own doc for the distinction
                from SettlementBreakdown nested in the timeline above. */}
            <SettlementBatchDetailsSection row={row} layout="drawer" />
          </>
        )}
      </div>
    );
  }

  // The left column starts with SettlementActionCard (when there's an
  // action — it renders nothing otherwise) followed by Settlement Timeline,
  // both stacked in the SAME row-1 grid cell rather than each claiming a
  // row of their own — the settlement breakdown still takes no row of its
  // own, since it nests inside the timeline's own steps (see
  // SettlementTimelineSection). The right column (Payment Details + Sender
  // Details) therefore still starts on that same row 1.
  const timelineRow = 1;

  return (
    <div className="relative z-10">
      {/* Transaction summary — full-width page header, standalone, no card,
          sitting above the 2-column layout entirely (not part of either
          column). The primary focal point of the page. Transaction Date
          lives in Payment Details — the header never shows a timestamp.
          z-10: a non-positioned element like this one would otherwise paint
          BELOW the page's absolutely-positioned invoiceimg.png decoration
          regardless of DOM order (static elements always sit under
          positioned ones), which hid Payment Details' text under the
          illustration — see TransactionDetailsPage's own root above. */}
      {summary}

      {/* 2-column layout, below the summary. Left column sections use
          explicit row-start classes (rather than a plain space-y stack) so
          the right column can start at whichever row leads the left column
          instead of always row 1. items-start keeps each section sized to
          its own content instead of stretching to match whichever column is
          taller in a shared row. */}
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[3fr_1fr] lg:items-start">
        {/* SettlementActionCard, then Settlement Timeline: the settlement
            money breakdown still renders nested inside the timeline card
            under the step it belongs to, not as a sibling row — only the
            invoice-upload/FIRC action moved out, into its own card above
            it. space-y-6 matches the right column's own gap so the two
            columns' internal rhythm reads the same. */}
        <div className={cn("space-y-6 lg:col-start-1", ROW_START_CLASS[timelineRow])}>
          <SettlementActionCard row={row} onUploaded={onUploaded} />
          <SettlementTimelineSection row={row} />
        </div>

        {/* Right column: Payment Details then Sender Details, top-aligned
            with Settlement Timeline across from it. */}
        <div className={cn("space-y-6 lg:col-start-2", ROW_START_CLASS[timelineRow])}>
          <PaymentDetailsSection row={row} currency={currency} floatTitle={false} />
          <SenderDetailsSection
            row={row}
            counterpartyName={counterpartyName}
            isPartnerUser={isPartnerUser}
          />
        </div>
      </div>

      {/* Full width, below the 2-column grid rather than squeezed into the
          1fr right column: SettlementBatchDetailsSection runs its own two
          cards side by side from lg up (matching the standalone settlement
          page), which the narrow right column has no room for. */}
      {isSettled && (
        <div className="mt-6">
          <SettlementBatchDetailsSection row={row} layout="page" />
        </div>
      )}
    </div>
  );
}
