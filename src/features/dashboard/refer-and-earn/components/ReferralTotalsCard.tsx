import Image from "next/image";
import { Card, MetricText, Text } from "@/components/ui";
import { currencySymbol } from "@/lib/utils/format";
import type { ReferralSummary } from "@/features/dashboard/refer-and-earn/helpers";

/**
 * Card background, served from `public/assets`. A raster asset, so it cannot be
 * an icon-registry entry (that pattern is for SVG forwardRef components) and goes
 * through `next/image` instead — see CLAUDE.md's Images rule.
 *
 * `width`/`height` are the file's real pixel dimensions. They are not used to
 * size the render (that is `fill`), but the ratio drives the card's own
 * `aspect-[…]` below, so the artwork is never stretched or awkwardly cropped.
 */
const BACKGROUND = {
  src: "/assets/TotalEarnedBG.png",
  width: 1718,
  height: 916,
} as const;

/**
 * Headline earned figure, without minor units — `$120`, not `$120.00`. This card
 * is the glance value; the exact amount to the cent is already on the analytics
 * row's own "Total earned" card, so cents here would only crowd the display
 * figure. Falls back to showing them if the total ever carries a fraction, so
 * nothing is silently rounded away.
 */
function formatHeadlineAmount(amount: number, currency: string): string {
  const hasFraction = !Number.isInteger(amount);
  return `${currencySymbol(currency)}${amount.toLocaleString("en-US", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

interface ReferralTotalsCardProps {
  summary: ReferralSummary;
}

/**
 * Earned total above the leaderboard, over the referral artwork. The figures come
 * from the same summarizeReferrals output the analytics row and the leaderboard's
 * own "You" row read, so the three surfaces cannot disagree.
 */
export function ReferralTotalsCard({ summary }: ReferralTotalsCardProps) {
  const referrals = summary.completed;

  return (
    // `aspect-[…]` from the asset's own dimensions: the card's height follows its
    // width, so the artwork keeps its proportions at every breakpoint instead of
    // being cropped harder as the column narrows — and there is no pixel height
    // to maintain. `isolate` scopes the negative z-index below to this card, and
    // `overflow-hidden` clips the artwork to the card's existing radius. No
    // padding: the content is centred rather than inset.
    <Card
      className="relative isolate items-center justify-center gap-1 overflow-hidden p-0 text-center"
      style={{ aspectRatio: `${BACKGROUND.width} / ${BACKGROUND.height}` }}
    >
      {/* Decorative, so `alt=""`. `fill` + `object-cover` covers the card at any
          size; the negative z-index paints it over the card's own surface but
          under the figures. */}
      <Image
        src={BACKGROUND.src}
        alt=""
        fill
        sizes="(min-width: 1024px) 21rem, (min-width: 768px) 17rem, 100vw"
        className="-z-10 object-cover"
      />

      {/* The artwork is a fixed light gradient in both themes — it carries no
          alpha and does not invert — so these two are pinned to dark values
          rather than `text-foreground`/`text-muted-foreground`, which would turn
          near-white in dark mode and vanish against it. */}
      <MetricText size="xl" className="text-slate-900">
        {formatHeadlineAmount(summary.totalEarned, summary.earnedCurrency)}
      </MetricText>
      <Text size="sm" className="text-slate-600">
        {referrals.toLocaleString("en-US")} {referrals === 1 ? "referral" : "referrals"}
      </Text>
    </Card>
  );
}
