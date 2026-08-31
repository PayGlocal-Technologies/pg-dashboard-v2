"use client";

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
import {
  CUSTOM_RANGE_VALUE,
  SUMMARY_RANGE_OPTIONS,
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
 * Two behaviours are pg-dashboard's, not inventions:
 *  - a card is a shortcut, not just a readout: clicking one pins the table to
 *    that status set;
 *  - the range picker moves the table's date filter as well as the summary's
 *    own window, so the counts and the rows below always describe the same
 *    period.
 *
 * Both the picker's value and the window it reads are owned by the page, not
 * here: they are the same state the table's Date chip edits, which is what
 * keeps the two controls from ever disagreeing. The window arrives as epoch
 * seconds bucketed by the page, so it is stable across mounts and the query
 * key below can actually hit the cache.
 */
export function InvoiceSummaryCards({
  merchantId,
  rangeValue,
  onRangeChange,
  windowSeconds,
  onStatusFilter,
}: {
  merchantId: string;
  /** One of SUMMARY_RANGE_OPTIONS, or CUSTOM_RANGE_VALUE when the Date chip
   *  holds a range the picker cannot express. */
  rangeValue: string;
  onRangeChange: (next: string) => void;
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

  const isCustomRange = rangeValue === CUSTOM_RANGE_VALUE;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Summary
        </h2>
        <Select value={rangeValue} onValueChange={onRangeChange}>
          <SelectTrigger className="h-8 w-[9.5rem]" aria-label="Summary date range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUMMARY_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
            {/* Only mounted while it is the current value, so the Select has
                something to render for a Date chip range this picker has no
                option for. Not a choice the user can make here: the chip is
                where a custom range is set. */}
            {isCustomRange && (
              <SelectItem value={CUSTOM_RANGE_VALUE} disabled>
                Custom range
              </SelectItem>
            )}
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
