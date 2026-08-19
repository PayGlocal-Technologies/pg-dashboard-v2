import { Card, MetricText, Text } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import type { ReferralSummary } from "@/features/dashboard/refer-and-earn/helpers";

/**
 * One label-over-value pair. The value is the prominent element; the label sits
 * above it in secondary text. Shared by all three status metrics so their
 * alignment and rhythm are identical by construction.
 */
function SummaryMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <Text size="sm" color="subtle">
        {label}
      </Text>
      <MetricText size="sm">{value.toLocaleString("en-US")}</MetricText>
    </div>
  );
}

interface ReferralSummaryCardsProps {
  summary: ReferralSummary;
}

/**
 * The analytics row above the earnings table: the earned total on the left, the
 * three-stage status breakdown on the right. Every figure comes from
 * summarizeReferrals over the table's own rows, so the row can't drift from it.
 */
export function ReferralSummaryCards({ summary }: ReferralSummaryCardsProps) {
  return (
    // One third / two thirds from lg up; stacked below that. The three status
    // metrics stay in one card at every width — they are one breakdown, not
    // three cards.
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="gap-1.5 p-5 sm:p-6">
        <Text size="sm" color="subtle">
          Total earned
        </Text>
        {/* The page's second-strongest figure after the hero's reward headline,
            and the strongest element inside this card. */}
        <MetricText size="lg">
          {formatCurrency(summary.totalEarned, summary.earnedCurrency, "en-US")}
        </MetricText>
      </Card>

      <Card className="gap-0 p-5 sm:p-6 lg:col-span-2">
        {/* Equal columns so the three metrics carry equal weight and sit on a
            shared baseline; stacked below sm, where three across would squeeze
            the labels onto two lines each. */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
          <SummaryMetric label="Total invited" value={summary.totalInvited} />
          <SummaryMetric label="In progress" value={summary.inProgress} />
          <SummaryMetric label="Completed" value={summary.completed} />
        </div>
      </Card>
    </div>
  );
}
