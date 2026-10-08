"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  StatCardSkeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CompactAmount } from "@/components/common/CompactAmount";
import { formatCurrency } from "@/lib/utils/format";
import { TotalSettledCard } from "@/features/dashboard/settlement-reports/components/TotalSettledCard";
import type { TotalSettledTimeframe } from "@/features/dashboard/settlement-reports/mock-data";
import type { SparklinePoint } from "@/features/dashboard/settlement-reports/types";

interface SettlementBreakupRowProps {
  label: string;
  value: string;
  emphasis?: boolean;
}

/** One line of a settlement breakup popup; shared with the table's ⓘ. */
export function SettlementBreakupRow({ label, value, emphasis }: SettlementBreakupRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className={emphasis ? "font-semibold text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span
        className={
          emphasis ? "font-semibold tabular-nums text-foreground" : "tabular-nums text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

interface UtrCopyButtonProps {
  utrNumber: string;
}

/** Same copy-with-feedback interaction as the settlements table's own UTR
 * cell (SettlementUtrCell), reused here so both surfaces behave identically. */
function UtrCopyButton({ utrNumber }: UtrCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(utrNumber);
      setCopied(true);
      toast.success("UTR copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied, fail silently, non-critical affordance.
    }
  }

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground">UTR</span>
      <span className="whitespace-nowrap tabular-nums text-xs text-foreground">{utrNumber}</span>
      <Button
        type="button"
        variant="ghost"
        onClick={handleCopy}
        aria-label="Copy UTR"
        className="h-5 w-5 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground hover:text-foreground"
      >
        <Icon name={copied ? "check" : "copy"} size={11} />
      </Button>
    </div>
  );
}

interface SettlementStatCardsProps {
  totalSettled: number;
  totalSettledTrendPct: number;
  totalSettledComparisonLabel?: string;
  totalSettledTimeframe: TotalSettledTimeframe;
  onTotalSettledTimeframeChange: (timeframe: TotalSettledTimeframe) => void;
  totalSettledChartData: SparklinePoint[];
  previousSettledAmount: number;
  previousSettledDateLabel: string;
  previousSettledTransactionCount: number;
  // MOCK (hidden for now — no endpoint): rendered only when provided. index.tsx
  // stops passing these; re-enable by un-commenting them there.
  previousSettledTimeLabel?: string;
  previousSettledUtrNumber?: string;
  previousSettledGrossLabel?: string;
  previousSettledTaxLabel?: string;
  previousSettledFeeLabel?: string;
  onShowPreviousSettledInfo: () => void;
  onDownloadPreviousSettled: () => void;
  /** Whether there is a settlement to download a report for. False when the
   * overview returned no previous settlement (a merchant who has never
   * settled), in which case there is no settlement date to key the download
   * endpoint on and the affordance is disabled rather than left clickable with
   * nothing behind it. Defaults to true so the card is unchanged wherever the
   * caller has not resolved this yet. */
  canDownloadPreviousSettled?: boolean;
  /** Amount due in the next settlement, live from the upcoming endpoint.
   * null while it has not resolved (or is unsupported), which renders an em
   * dash rather than a placeholder figure. */
  upcomingSettlementAmount: number | null;
  upcomingSettlementTimeLabel: string;
  /** MCA only, count of transactions still waiting on an invoice upload
   * before they can be bundled into this upcoming settlement. */
  pendingInvoiceCount?: number;
  onUploadInvoice?: () => void;
  /** Show the previous and upcoming amounts in full (₹1,24,890.50) rather
   *  than compact (₹1.25L). Payments sets it; MCA keeps the compact form. */
  fullAmounts?: boolean;
  /** Payments: the upcoming settlement as a row inside Total settled, beside
   *  Previous settled at the same height, instead of a card of its own. */
  combinedLayout?: boolean;
  /** Previous settled's payments by original currency, shown as a bar. */
  previousSettledCurrencySplit?: { currency: string; pct: number }[];
}

/** Segment colours for the currency bar, in order (the app's chart palette). */
const SPLIT_COLORS = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-orange-500",
  "bg-slate-400",
];

/** Previous settled's currency mix: one bar, a 2px gap between segments, and
 *  a legend that names each share (never colour alone). */
function CurrencySplit({ split }: { split: { currency: string; pct: number }[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {split.map((s, i) => (
          <span
            key={s.currency}
            className={`h-full first:rounded-l-full last:rounded-r-full ${SPLIT_COLORS[i % SPLIT_COLORS.length]}`}
            style={{ flexGrow: s.pct, flexBasis: 0 }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {split.map((s, i) => (
          <li key={s.currency} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={`h-2 w-2 rounded-full ${SPLIT_COLORS[i % SPLIT_COLORS.length]}`}
              aria-hidden
            />
            {s.currency} {s.pct}%
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A card's headline amount, compact unless the caller asks for it in full. */
function HeadlineAmount({
  amount,
  full,
  size = "text-2xl",
}: {
  amount: number;
  full: boolean;
  size?: string;
}) {
  const className = `block ${size} font-bold tracking-tight text-foreground tabular-nums`;
  return full ? (
    <span className={className}>{formatCurrency(amount, "INR")}</span>
  ) : (
    <CompactAmount amount={amount} currency="INR" className={className} />
  );
}

export function SettlementStatCards({
  totalSettled,
  totalSettledTrendPct,
  totalSettledComparisonLabel,
  totalSettledTimeframe,
  onTotalSettledTimeframeChange,
  totalSettledChartData,
  previousSettledAmount,
  previousSettledDateLabel,
  previousSettledTimeLabel,
  previousSettledTransactionCount,
  previousSettledUtrNumber,
  previousSettledGrossLabel,
  previousSettledTaxLabel,
  previousSettledFeeLabel,
  onShowPreviousSettledInfo,
  onDownloadPreviousSettled,
  canDownloadPreviousSettled = true,
  upcomingSettlementAmount,
  upcomingSettlementTimeLabel,
  pendingInvoiceCount,
  onUploadInvoice,
  fullAmounts = false,
  combinedLayout = false,
  previousSettledCurrencySplit,
}: SettlementStatCardsProps) {
  const previousCard = (
    <Card className="flex-1 gap-1.5 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Icon name="check" size={14} aria-hidden />
        </span>
        <Button
          type="button"
          variant="ghost"
          onClick={onDownloadPreviousSettled}
          disabled={!canDownloadPreviousSettled}
          aria-label="Download settlement report"
          className="h-7 w-7 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground hover:text-foreground"
        >
          <Icon name="download" size={14} />
        </Button>
      </div>

      <div className="mt-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-[13px] font-medium text-muted-foreground">Previous settled</p>
          <Button
            type="button"
            variant="ghost"
            onClick={onShowPreviousSettledInfo}
            aria-label="About previous settled"
            className="h-4 w-4 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
          >
            <Icon name="info" size={11} />
          </Button>
        </div>
      </div>

      <HeadlineAmount amount={previousSettledAmount} full={fullAmounts} />
      <p className="text-xs text-muted-foreground">
        {previousSettledDateLabel}
        {previousSettledTimeLabel ? `, ${previousSettledTimeLabel}` : ""} ·{" "}
        {previousSettledTransactionCount} transactions
      </p>
      {/* MOCK (hidden): UTR has no endpoint — shown only when passed. */}
      {previousSettledUtrNumber && <UtrCopyButton utrNumber={previousSettledUtrNumber} />}
      {/* Under the UTR, with the rest of the payout's details. MOCK: the
        gross/tax/fee breakup has no endpoint, shown only when passed. */}
      {previousSettledGrossLabel && previousSettledTaxLabel && previousSettledFeeLabel && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="link" className="h-auto w-fit justify-start p-0 text-xs font-semibold">
              Settlement breakup
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="start" className="w-56 space-y-1.5 p-3">
            <SettlementBreakupRow label="Gross amount" value={previousSettledGrossLabel} />
            <SettlementBreakupRow label="Tax" value={`−${previousSettledTaxLabel}`} />
            <SettlementBreakupRow label="Fee" value={`−${previousSettledFeeLabel}`} />
            <div className="border-t border-border pt-1.5">
              <SettlementBreakupRow
                label="Net amount"
                value={formatCurrency(previousSettledAmount, "INR")}
                emphasis
              />
            </div>
          </TooltipContent>
        </Tooltip>
      )}
      {previousSettledCurrencySplit && previousSettledCurrencySplit.length > 0 && (
        <div className="pt-3">
          <CurrencySplit split={previousSettledCurrencySplit} />
        </div>
      )}
    </Card>
  );

  if (combinedLayout) {
    const upcomingRow = (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Icon name="arrow-up-right" size={14} aria-hidden />
          </span>
          <div>
            <p className="text-[13px] font-medium text-primary">Upcoming settlement</p>
            <p className="text-xs text-muted-foreground">{upcomingSettlementTimeLabel}</p>
          </div>
        </div>
        {upcomingSettlementAmount !== null ? (
          <HeadlineAmount amount={upcomingSettlementAmount} full={fullAmounts} size="text-xl" />
        ) : (
          <span className="text-xl font-bold text-foreground">—</span>
        )}
      </div>
    );
    return (
      <div className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
        <TotalSettledCard
          className="lg:col-span-8"
          chartClassName="h-32 lg:h-auto lg:min-h-20 lg:flex-1"
          totalSettled={totalSettled}
          totalSettledTrendPct={totalSettledTrendPct}
          comparisonLabel={totalSettledComparisonLabel}
          timeframe={totalSettledTimeframe}
          onTimeframeChange={onTotalSettledTimeframeChange}
          chartData={totalSettledChartData}
          footer={upcomingRow}
        />
        <div className="flex lg:col-span-4">{previousCard}</div>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
      <TotalSettledCard
        className="lg:col-span-8"
        totalSettled={totalSettled}
        totalSettledTrendPct={totalSettledTrendPct}
        comparisonLabel={totalSettledComparisonLabel}
        timeframe={totalSettledTimeframe}
        onTimeframeChange={onTotalSettledTimeframeChange}
        chartData={totalSettledChartData}
      />

      <div className="flex flex-col gap-3 lg:col-span-4">
        {previousCard}

        <Card className="flex-1 gap-1.5 border-(--primary-border) bg-primary-light/20 p-5">
          <span className="mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Icon name="arrow-up-right" size={14} aria-hidden />
          </span>
          <p className="text-[13px] font-medium text-primary">Upcoming settlement</p>
          {upcomingSettlementAmount !== null ? (
            <HeadlineAmount amount={upcomingSettlementAmount} full={fullAmounts} />
          ) : (
            <span className="block text-2xl font-bold tracking-tight text-foreground tabular-nums">
              —
            </span>
          )}
          <p className="text-xs text-muted-foreground">{upcomingSettlementTimeLabel}</p>

          {!!pendingInvoiceCount && pendingInvoiceCount > 0 && (
            <div className="mt-1 flex flex-col gap-1.5 border-t border-(--primary-border) pt-2.5">
              <p className="text-[11px] text-muted-foreground">
                {pendingInvoiceCount} transaction{pendingInvoiceCount === 1 ? "" : "s"} need
                {pendingInvoiceCount === 1 ? "s" : ""} an invoice uploaded before{" "}
                {pendingInvoiceCount === 1 ? "it" : "they"} can be included in this settlement.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onUploadInvoice}
                leftIcon={<Icon name="upload" className="h-3.5 w-3.5" />}
                className="w-full justify-center bg-card"
              >
                Upload Invoice ({pendingInvoiceCount})
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export function SettlementStatCardsSkeleton() {
  return (
    <div className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
      <div className="lg:col-span-8">
        <StatCardSkeleton />
      </div>
      <div className="flex flex-col gap-3 lg:col-span-4">
        <div className="flex-1">
          <StatCardSkeleton />
        </div>
        <div className="flex-1">
          <StatCardSkeleton />
        </div>
      </div>
    </div>
  );
}
