import { Card, MetricText, Separator, Text } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import type { ReferralSummary } from "@/features/dashboard/refer-and-earn/helpers";

/** Label over figure, the same pairing the analytics row uses. */
function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <Text size="xs" color="subtle" truncate>
        {label}
      </Text>
      {/* A step down from the analytics row's `lg` figure: this card summarises,
          the analytics row is the detail surface. */}
      <MetricText size="sm">{value}</MetricText>
    </div>
  );
}

interface ReferralTotalsCardProps {
  summary: ReferralSummary;
}

/**
 * Running totals above the leaderboard: how many referrals the merchant has made
 * and what they have earned from them. Both figures come from the same
 * summarizeReferrals output the analytics row and the leaderboard's own "You" row
 * read, so the three surfaces cannot disagree.
 */
export function ReferralTotalsCard({ summary }: ReferralTotalsCardProps) {
  return (
    <Card className="gap-0 p-5">
      {/* Two totals side by side with a rule between them, matching the analytics
          card's treatment. `self-stretch` sizes the rule to the taller figure
          rather than to the card, so it stops short of the padding. */}
      <div className="flex items-center gap-4">
        <Total label="Total referrals" value={summary.totalInvited.toLocaleString("en-US")} />
        <Separator orientation="vertical" className="self-stretch" />
        <Total
          label="Total earned"
          value={formatCurrency(summary.totalEarned, summary.earnedCurrency, "en-US")}
        />
      </div>
    </Card>
  );
}
