import Image from "next/image";
import { Card, MetricText, Text } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import type { ReferralSummary } from "@/features/dashboard/refer-and-earn/helpers";

/**
 * Card illustration, served from `public/assets`. A raster asset, so it cannot
 * be an icon-registry entry (that pattern is for SVG forwardRef components) and
 * goes through `next/image` instead — see CLAUDE.md's Images rule.
 *
 * Rendered at its own intrinsic ratio (no `fill`), so `width`/`height` do the
 * usual next/image job of reserving the right box before it loads — nothing
 * downstream needs to read the ratio off them separately.
 */
const TOTAL_EARNED_IMAGE = {
  src: "/assets/Total earned.png",
  width: 1230,
  height: 1278,
} as const;

interface ReferralTotalsCardProps {
  summary: ReferralSummary;
}

/**
 * Earned total beside the hero: just the figure and the illustration standing
 * in for it — nothing else. The referral journey recap lives in its own
 * sibling now (see ReferralJourneyCard, rendered alongside this one in
 * ReferAndEarnFeature), so this card can hug exactly its own two pieces of
 * content instead of carrying a height rule for both of them together.
 *
 * The figure comes from the same summarizeReferrals output the analytics row
 * reads, so the two surfaces cannot disagree.
 */
export function ReferralTotalsCard({ summary }: ReferralTotalsCardProps) {
  const referrals = summary.completed;

  return (
    // Text upper-left, illustration lower-right, per the reference — and nether
    // is positioned to get there. The text block is the card's first child, so
    // it lands at the top by plain document order; the illustration is the
    // second child, so it falls in the space below the text, and `ml-auto`
    // pushes that block to the right within its own row without needing the
    // image to also be full width. The gap between the two comes from the
    // card's own `gap-8`, wide enough to read as the reference's whitespace
    // without being a pixel figure that would need to change if the text
    // wrapped to a second line.
    <Card className="gap-8 p-5 sm:p-6">
      <div className="flex flex-col items-start gap-1">
        <MetricText size="lg">
          {formatCurrency(summary.totalEarned, summary.earnedCurrency, "en-US")}
        </MetricText>
        <Text size="sm" color="subtle">
          from {referrals.toLocaleString("en-US")} {referrals === 1 ? "referral" : "referrals"}
        </Text>
      </div>

      {/* `w-[58%]` is a fraction of the card's own content width rather than a
          fixed figure, so the illustration scales with the column at every
          breakpoint; `h-auto` off the asset's real width/height is what keeps
          it from ever distorting. `ml-auto` is what sends it to the card's
          right edge — the rest of the row's width is the whitespace the
          reference leaves to its left. */}
      <Image
        src={TOTAL_EARNED_IMAGE.src}
        alt=""
        width={TOTAL_EARNED_IMAGE.width}
        height={TOTAL_EARNED_IMAGE.height}
        sizes="(min-width: 1024px) 13rem, (min-width: 768px) 10rem, 45vw"
        className="ml-auto h-auto w-[58%]"
      />
    </Card>
  );
}
