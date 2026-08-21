"use client";

import {
  Button,
  Card,
  MetricText,
  Separator,
  Text,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { WaivedDonut } from "@/features/dashboard/refer-and-earn/components/WaivedDonut";
import { formatCurrency } from "@/lib/utils/format";
import type { ReferralSummary } from "@/features/dashboard/refer-and-earn/helpers";

/**
 * One status row: label at the left, figure at the right. Rendered as two grid
 * cells rather than its own flex row so every row shares the parent's column
 * tracks — that is what keeps the three figures on one right-hand edge no matter
 * how wide the labels get.
 */
function StatusMetric({ label, value }: { label: string; value: number }) {
  return (
    <>
      <Text size="sm" color="subtle">
        {label}
      </Text>
      <MetricText size="sm" className="text-right">
        {value.toLocaleString("en-US")}
      </MetricText>
    </>
  );
}

interface ReferralSummaryCardsProps {
  summary: ReferralSummary;
}

/**
 * The analytics row above the earnings table: one summary card carrying the
 * earned total and the three-stage status breakdown, and one waived card beside
 * it. Every figure comes from summarizeReferrals over the table's own rows, so
 * the row can't drift from the table.
 */
export function ReferralSummaryCards({ summary }: ReferralSummaryCardsProps) {
  const currency = summary.earnedCurrency;

  return (
    // 3/5 + 2/5 from lg up — the summary card is the wider of the two; stacked
    // below that. `items-stretch` (the grid default, stated here so it survives
    // future edits) plus `h-full` on both cards is what keeps the pair exactly
    // the same height whatever either one contains, with no fixed height
    // anywhere: each then centres its own content so neither looks stretched.
    // Below lg they stack and each takes its natural height.
    <div className="grid items-stretch gap-4 lg:grid-cols-5">
      <Card className="h-full justify-center gap-0 p-5 sm:p-6 lg:col-span-3">
        {/* Total earned and the status breakdown are two areas of one card — one
            container throughout, never two cards. Side by side from sm up with a
            rule between them, stacked below. */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
          <div className="flex flex-col gap-1.5">
            <Text size="sm" color="subtle">
              Total earned
            </Text>
            {/* The strongest figure in the analytics row. */}
            <MetricText size="lg">
              {formatCurrency(summary.totalEarned, currency, "en-US")}
            </MetricText>
          </div>

          {/* The divider is grouped with the metrics rather than sitting as a
              third justify-between sibling, which would have parked it in the
              middle of the slack instead of just left of the figures it
              separates. Two elements, not one: `orientation` sets
              `aria-orientation` as well as the geometry, so the responsive swap
              cannot be done by class alone.

              Below sm the sections stack and the rule turns horizontal, sitting
              between them on the same gap-6 rhythm as the stack itself. */}
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
            <Separator className="sm:hidden" />

            {/* sm+: `self-stretch` sizes the rule to the flex line — the metrics
                block, the tallest thing on it — so it spans that content and
                stops well short of the card's top and bottom edges, and the
                wrapper's own `items-center` keeps it centred in the card. */}
            <Separator orientation="vertical" className="hidden self-stretch sm:block" />

            {/* Labels take the slack, figures sit flush right in their own track. */}
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-8 gap-y-2.5 sm:min-w-[12rem]">
              <StatusMetric label="Total invited" value={summary.totalInvited} />
              <StatusMetric label="In progress" value={summary.inProgress} />
              <StatusMetric label="Completed" value={summary.completed} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="h-full justify-center gap-0 p-5 sm:p-6 lg:col-span-2">
        {/* Amount on the left, donut in the slack on the right. `flex-wrap` lets
            the donut drop below the amount on a narrow card rather than
            squeezing it, and the donut is sized to the existing slack so the
            card gains no height for it. */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            {/* Label plus its info tip — the waived figure needs a word of context
            that would be too long to spell out inline. Same tooltip treatment as
            CopyableValue's, so every info affordance on the dashboard behaves
            the same way: hover or focus, never permanently open. */}
            <div className="flex items-center gap-1">
              <Text size="sm" color="subtle">
                Total waived
              </Text>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-4 w-4 min-h-0 min-w-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
                      aria-label="About total waived"
                    >
                      <Icon name="info" size={11} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    The earned amount will be waived off from your MDR.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* Waived against eligible: the waived figure carries the card, the
            eligible total trails it in muted text at the same size. Wrapped in
            a flex so the pair drops to a second line intact on a narrow card
            instead of breaking mid-figure. */}
            <MetricText size="lg" className="flex flex-wrap items-baseline gap-x-1.5">
              <span>{formatCurrency(summary.totalWaived, currency, "en-US")}</span>
              <span className="font-normal text-muted-foreground">
                / {formatCurrency(summary.waivedEligible, currency, "en-US")}
              </span>
            </MetricText>
          </div>

          {/* Derived from the same summary as the amount beside it, so the share
              can never disagree with the two figures it is drawn from. */}
          <WaivedDonut
            waived={summary.totalWaived}
            eligible={summary.waivedEligible}
            currency={currency}
          />
        </div>
      </Card>
    </div>
  );
}
