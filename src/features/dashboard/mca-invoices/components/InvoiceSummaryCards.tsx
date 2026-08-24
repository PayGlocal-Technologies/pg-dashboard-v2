"use client";

import { useState } from "react";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Shimmer,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useGet } from "@/lib/api/hooks";
import { invoiceSummaryApi } from "@/features/dashboard/mca-invoices/services";
import type { McaInvoiceSummaryResponse } from "@/features/dashboard/mca-invoices/types";

/**
 * Epoch SECONDS at the end of the local day containing `now`.
 *
 * The window is deliberately bucketed to day boundaries rather than to the
 * exact moment. It feeds both the request URL and the react-query key, so a
 * second-resolution "now" produced a different key on every single mount: the
 * cache could never hit, and the cards fell back to skeletons every time the
 * page was opened. Bucketing makes the key identical for the whole day, so a
 * revisit paints from cache and revalidates in the background.
 *
 * Day granularity is also what the ranges actually mean — "last 7 days", not
 * "the 604800 seconds ending at 14:23:07".
 */
function endOfDaySeconds(now: Date): number {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return Math.floor(end.getTime() / 1000);
}

/** Epoch seconds at local midnight `daysBack` days before `now`. */
function startOfDaySeconds(now: Date, daysBack: number): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysBack);
  return Math.floor(start.getTime() / 1000);
}

/** Ranges from pg-dashboard's summary picker. Values are day counts. */
const RANGE_OPTIONS = [
  { value: "ALL_TIME", label: "All time" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

interface SummaryCard {
  key: string;
  label: string;
  value: number | undefined;
  tooltip: string;
  accent: string;
  statuses: string[];
}

/**
 * Invoice counts, from get-invoice-summary.
 *
 * Two behaviours are pg-dashboard's, not inventions:
 *  - a card is a shortcut, not just a readout: clicking one pins the table to
 *    that status set;
 *  - the range picker moves the table's date filter as well as the summary's
 *    own window, so the counts and the rows below always describe the same
 *    period.
 */
export function InvoiceSummaryCards({
  merchantId,
  onStatusFilter,
  onRangeDaysChange,
}: {
  merchantId: string;
  onStatusFilter: (statuses: string[]) => void;
  onRangeDaysChange: (days: number | undefined) => void;
}) {
  const [range, setRange] = useState<string>("ALL_TIME");
  // Resolved in a lazy initializer and in the change handler, never during
  // render, and bucketed to the day so the value is stable across mounts.
  const [window, setWindow] = useState<{ start: number; end: number }>(() => ({
    start: 0,
    end: endOfDaySeconds(new Date()),
  }));

  const url = invoiceSummaryApi(merchantId, window.start, window.end);
  // isPending, not isLoading: isPending is false the moment there is data to
  // show, cached or fresh, so a revisit renders the previous counts instead of
  // skeletons while the background revalidation runs.
  const { data, isPending } = useGet<McaInvoiceSummaryResponse>(
    ["invoice-summary", merchantId, window.start, window.end],
    url,
    undefined,
    { enabled: !!url }
  );

  // Note the doubly-nested data: BaseResponse.data.data.
  const summary = data?.data?.data;

  const cards: SummaryCard[] = [
    {
      key: "active",
      label: "Active invoices",
      value: summary?.totalActive,
      tooltip: "The total number of successfully generated invoices.",
      accent: "text-info",
      statuses: ["ACTIVE"],
    },
    {
      key: "paid",
      label: "Paid invoices",
      value: summary?.totalPaid,
      tooltip: "The total number of invoices for which payments have been linked.",
      accent: "text-success",
      statuses: ["PAID", "PAID_OUTSIDE"],
    },
    {
      key: "outstanding",
      label: "Outstanding invoices",
      value: summary?.totalOutstanding,
      tooltip: "The total number of unpaid invoices past due date.",
      accent: "text-destructive",
      statuses: ["OUTSTANDING"],
    },
  ];

  const handleRangeChange = (next: string) => {
    setRange(next);

    const now = new Date();
    const end = endOfDaySeconds(now);

    if (next === "ALL_TIME") {
      setWindow({ start: 0, end });
      onRangeDaysChange(undefined);
      return;
    }

    const days = Number(next);
    setWindow({ start: startOfDaySeconds(now, days), end });
    onRangeDaysChange(days);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Summary
        </h2>
        <Select value={range} onValueChange={handleRangeChange}>
          <SelectTrigger className="h-8 w-[9.5rem]" aria-label="Summary date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Button
            key={card.key}
            type="button"
            variant="outline"
            onClick={() => onStatusFilter(card.statuses)}
            className="h-auto flex-col items-start gap-1 rounded-xl border-border bg-card p-4 text-left shadow-sm"
          >
            <span className="flex w-full items-center gap-1.5">
              <span className="text-[12.5px] font-medium text-muted-foreground">{card.label}</span>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center text-muted-foreground">
                      <Icon name="info" className="h-3 w-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">{card.tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>

            {isPending ? (
              <Shimmer className="h-7 w-14" />
            ) : (
              <span className={cn("text-[24px] font-bold tabular-nums", card.accent)}>
                {card.value ?? 0}
              </span>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}
