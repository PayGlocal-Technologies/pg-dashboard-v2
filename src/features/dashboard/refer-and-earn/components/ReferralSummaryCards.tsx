"use client";

import {
  Button,
  Card,
  MetricText,
  Progress,
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
import { shareOfInvited } from "@/features/dashboard/refer-and-earn/helpers";
import type { ReferralSummary } from "@/features/dashboard/refer-and-earn/helpers";
import type { ProgressProps } from "@payglocal_ui/flux-ui";

/**
 * One row of the referral bar graph: label, bar, count — three cells, not a
 * nested flex row.
 *
 * Rendered as a bare Fragment so the three cells land directly in the graph's
 * own grid tracks. That is what makes it a graph rather than three independent
 * widgets: every label sits in one `auto` column sized to the widest of them, so
 * all three bars start on the same vertical axis, and every count sits in one
 * right-hand column. Nothing here has a width of its own.
 *
 * Flux's Progress is the bar treatment, and the count keeps the MetricText
 * treatment it has always had — the bar shows the proportion, the figure gives
 * the exact value, so neither has to be read off the other.
 */
function BarRow({
  label,
  value,
  percent,
  variant,
}: {
  label: string;
  value: number;
  /** Length of this bar as a share of Total invited, 0–100. */
  percent: number;
  variant: ProgressProps["variant"];
}) {
  return (
    <>
      {/* `whitespace-nowrap` keeps the label column one line deep: if a label
          wrapped, its row would grow taller than the other two and the even
          vertical rhythm across the three rows would break. */}
      <Text size="sm" color="subtle" className="whitespace-nowrap">
        {label}
      </Text>
      {/* The count beside it carries the value, so the bar's accessible name is
          the proportion it actually draws. */}
      <Progress
        value={percent}
        size="md"
        variant={variant}
        aria-label={`${label}: ${percent}% of everyone invited`}
      />
      <MetricText size="sm" className="text-right tabular-nums">
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
        {/* Total earned and the referral graph are two areas of one card — one
            container throughout, never two cards.

            A grid rather than a flex row, because the 40/60 split has to be the
            split of the card and not of whatever the content happens to
            measure: `2fr` and `3fr` are exactly two fifths and three fifths of
            the space the two sections share. The graph column holds the whole
            graph — its labels, its bars, and its counts — so all of it is inside
            the 60%, and nothing sits outside the section it belongs to.

            Stacked below sm the grid falls back to its single implicit column,
            so the three children become three rows in source order: Total
            earned, the rule, then the graph at the full width of the card. */}
        <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_auto_minmax(0,3fr)] sm:items-center sm:gap-7">
          {/* Left, two fifths. `sm:items-center` on the grid is what centres it
              against the taller graph beside it. */}
          <div className="flex flex-col gap-1.5">
            <Text size="sm" color="subtle">
              Total earned
            </Text>
            {/* The strongest figure in the analytics row. */}
            <MetricText size="lg">
              {formatCurrency(summary.totalEarned, currency, "en-US")}
            </MetricText>
          </div>

          {/* The rule between the two sections. Two elements, not one:
              `orientation` sets `aria-orientation` as well as the geometry, so
              the responsive swap cannot be done by class alone. Whichever one is
              not in play is `display:none`, and a `display:none` child is not a
              grid item at all — so exactly one of them ever occupies a track and
              neither leaves a gap behind.

              sm+: `self-stretch` sizes the rule to its row, which the graph
              beside it defines, so it spans that content and stops short of the
              card's own padding. */}
          <Separator className="sm:hidden" />
          <Separator orientation="vertical" className="hidden self-stretch sm:block" />

          {/* Right, three fifths: the graph. Three tracks shared by all three
              rows — labels sized to the widest label, bars taking every pixel
              of slack that leaves, counts flush right — so the bars share one
              axis and one scale and can be read against each other.

              Every length is a share of Total invited, which is what makes the
              comparison meaningful: the top bar is the whole population and so
              always reads full, and the two below it are that same bar split up.
              The shares come from shareOfInvited over this card's own summary,
              so nothing here is a fixed percentage.

              Bar colours follow the status chips in the table below, so "in
              progress" and "completed" mean the same thing in both places. */}
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 sm:gap-x-4">
            <BarRow
              label="Total invited"
              value={summary.totalInvited}
              percent={shareOfInvited(summary.totalInvited, summary.totalInvited)}
              variant="default"
            />
            <BarRow
              label="In progress"
              value={summary.inProgress}
              percent={shareOfInvited(summary.inProgress, summary.totalInvited)}
              variant="warning"
            />
            <BarRow
              label="Completed"
              value={summary.completed}
              percent={shareOfInvited(summary.completed, summary.totalInvited)}
              variant="success"
            />
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
