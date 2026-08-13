"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  StatCardSkeleton,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { RollingNumber } from "@/components/common/RollingNumber";
import { TotalSettledCard } from "@/features/dashboard/settlement-reports/components/TotalSettledCard";
import type { TotalSettledTimeframe } from "@/features/dashboard/settlement-reports/mock-data";
import type { SparklinePoint } from "@/features/dashboard/settlement-reports/types";

interface SettlementBreakupRowProps {
  label: string;
  value: string;
  emphasis?: boolean;
}

function SettlementBreakupRow({ label, value, emphasis }: SettlementBreakupRowProps) {
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
      <span className="whitespace-nowrap font-mono text-xs text-foreground">{utrNumber}</span>
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
  totalSettledLabel: string;
  totalSettledTrendPct: number;
  totalSettledChartsByTimeframe: Record<TotalSettledTimeframe, SparklinePoint[]>;
  previousSettledLabel: string;
  previousSettledDateLabel: string;
  previousSettledTimeLabel: string;
  previousSettledTransactionCount: number;
  previousSettledUtrNumber: string;
  previousSettledGrossLabel: string;
  previousSettledTaxLabel: string;
  previousSettledFeeLabel: string;
  onShowPreviousSettledInfo: () => void;
  onDownloadPreviousSettled: () => void;
  upcomingSettlementLabel: string;
  upcomingSettlementTimeLabel: string;
  /** MCA only, count of transactions still waiting on an invoice upload
   * before they can be bundled into this upcoming settlement. */
  pendingInvoiceCount?: number;
  onUploadInvoice?: () => void;
}

export function SettlementStatCards({
  totalSettledLabel,
  totalSettledTrendPct,
  totalSettledChartsByTimeframe,
  previousSettledLabel,
  previousSettledDateLabel,
  previousSettledTimeLabel,
  previousSettledTransactionCount,
  previousSettledUtrNumber,
  previousSettledGrossLabel,
  previousSettledTaxLabel,
  previousSettledFeeLabel,
  onShowPreviousSettledInfo,
  onDownloadPreviousSettled,
  upcomingSettlementLabel,
  upcomingSettlementTimeLabel,
  pendingInvoiceCount,
  onUploadInvoice,
}: SettlementStatCardsProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-12 lg:items-stretch">
      <TotalSettledCard
        className="lg:col-span-8"
        totalSettledLabel={totalSettledLabel}
        totalSettledTrendPct={totalSettledTrendPct}
        chartsByTimeframe={totalSettledChartsByTimeframe}
      />

      <div className="flex flex-col gap-3 lg:col-span-4">
        <Card className="flex-1 gap-1.5 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Icon name="check" size={14} aria-hidden />
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={onDownloadPreviousSettled}
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
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="link"
                    className="h-auto w-fit justify-start p-0 text-xs font-semibold"
                  >
                    Settlement breakup
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="end" className="w-56 space-y-1.5 p-3">
                  <SettlementBreakupRow label="Gross amount" value={previousSettledGrossLabel} />
                  <SettlementBreakupRow label="Tax" value={`−${previousSettledTaxLabel}`} />
                  <SettlementBreakupRow label="Fee" value={`−${previousSettledFeeLabel}`} />
                  <div className="border-t border-border pt-1.5">
                    <SettlementBreakupRow
                      label="Net amount"
                      value={previousSettledLabel}
                      emphasis
                    />
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <RollingNumber
            value={previousSettledLabel}
            className="block text-2xl font-bold tracking-tight text-foreground tabular-nums"
          />
          <p className="text-xs text-muted-foreground">
            {previousSettledDateLabel}, {previousSettledTimeLabel} ·{" "}
            {previousSettledTransactionCount} transactions
          </p>
          <UtrCopyButton utrNumber={previousSettledUtrNumber} />
        </Card>

        <Card className="flex-1 gap-1.5 border-(--primary-border) bg-primary-light/20 p-5">
          <span className="mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Icon name="arrow-up-right" size={14} aria-hidden />
          </span>
          <p className="text-[13px] font-medium text-primary">Upcoming settlement</p>
          <RollingNumber
            value={upcomingSettlementLabel}
            className="block text-2xl font-bold tracking-tight text-foreground tabular-nums"
          />
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
