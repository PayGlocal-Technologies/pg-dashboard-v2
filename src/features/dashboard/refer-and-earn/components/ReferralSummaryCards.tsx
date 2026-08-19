import { Card, MetricText, Text } from "@/components/ui";
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
    // below that. Grid rows stretch, so both cards share a height and each
    // centres its own content vertically.
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="h-full justify-center gap-0 p-5 sm:p-6 lg:col-span-3">
        {/* Total earned and the status breakdown are two areas of one card, set
            apart by spacing alone — no divider between them. Side by side from
            sm up, stacked below. */}
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

          {/* Labels take the slack, figures sit flush right in their own track. */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-x-8 gap-y-2.5 sm:min-w-[12rem]">
            <StatusMetric label="Total invited" value={summary.totalInvited} />
            <StatusMetric label="In progress" value={summary.inProgress} />
            <StatusMetric label="Completed" value={summary.completed} />
          </div>
        </div>
      </Card>

      <Card className="h-full justify-center gap-1.5 p-5 sm:p-6 lg:col-span-2">
        <Text size="sm" color="subtle">
          Total waived
        </Text>
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
      </Card>
    </div>
  );
}
