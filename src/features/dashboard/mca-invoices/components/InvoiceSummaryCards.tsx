"use client";

import {
  Button,
  Shimmer,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useGet } from "@/lib/api/hooks";
import { TimeRangeTabs } from "@/components/common/TimeRangeTabs";
import { invoiceSummaryApi } from "@/features/dashboard/mca-invoices/services";
import {
  SUMMARY_RANGE_OPTIONS,
  type SummaryRange,
} from "@/features/dashboard/mca-invoices/constants";
import type { McaInvoiceSummaryResponse } from "@/features/dashboard/mca-invoices/types";

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
 * A card is a shortcut, not just a readout: clicking one pins the table to that
 * status set, which is pg-dashboard's behaviour and not an invention.
 *
 * The period, though, is this block's alone. It used to be two views of the
 * table's Date filter, so picking a range here refiltered the list and setting
 * the chip below moved these counts. Both directions are gone: the range now
 * scopes the three figures beside it and nothing else, which is the only reading
 * a merchant can take from a control that sits inside the summary.
 *
 * The window still arrives from the page as epoch seconds, bucketed there so it
 * is stable across renders and the query key below can hit the cache.
 */
export function InvoiceSummaryCards({
  merchantId,
  range,
  onRangeChange,
  windowSeconds,
  onStatusFilter,
}: {
  merchantId: string;
  range: SummaryRange;
  onRangeChange: (next: SummaryRange) => void;
  windowSeconds: { start: number; end: number };
  onStatusFilter: (statuses: string[]) => void;
}) {
  const url = invoiceSummaryApi(merchantId, windowSeconds.start, windowSeconds.end);
  // isPending, not isLoading: isPending is false the moment there is data to
  // show, cached or fresh, so a revisit renders the previous counts instead of
  // skeletons while the background revalidation runs.
  const { data, isPending } = useGet<McaInvoiceSummaryResponse>(
    ["invoice-summary", merchantId, windowSeconds.start, windowSeconds.end],
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

  return (
    <div className="flex flex-col gap-3">
      {/* Subheading, then the time tabs directly beneath it (left-aligned)
          rather than across the row from it, so the window reads as scoping the
          Summary below. */}
      <div className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Summary
        </h2>
        {/* The same control Transactions puts under its own title, rather than
            the dropdown that used to sit here: a DQA pass called out having one
            page segment time with tabs and another with a select. */}
        <TimeRangeTabs
          options={SUMMARY_RANGE_OPTIONS}
          value={range}
          onValueChange={onRangeChange}
          label="Summary period"
        />
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
