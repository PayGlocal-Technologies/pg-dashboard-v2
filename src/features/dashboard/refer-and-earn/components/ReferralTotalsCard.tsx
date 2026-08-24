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
 * size the render (that is `fill`), but the ratio is what the card's stacked
 * `aspect-[1672/941]` is taken from, so on mobile the artwork keeps its own
 * proportions instead of being cropped to whatever the text happens to need.
 */
const BACKGROUND = {
  src: "/assets/BG1.png",
  width: 1672,
  height: 941,
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
 * Earned total beside the hero, set into the referral artwork. The figures come
 * from the same summarizeReferrals output the analytics row reads, so the two
 * surfaces cannot disagree.
 */
export function ReferralTotalsCard({ summary }: ReferralTotalsCardProps) {
  const referrals = summary.completed;

  return (
    // Two height rules, one per layout, and neither is a pixel value.
    //
    // From md up the card is a stretched grid item beside the hero, so `h-full`
    // is the hero's own rendered height — `aspect-auto` is what clears the
    // stacked ratio out of the way and lets that stretch take effect. The
    // content is centred rather than parked at the top, so a tall card reads as
    // composed instead of top-heavy.
    //
    // Stacked below md there is nothing beside it to match, so it falls back to
    // the asset's own ratio and keeps the proportions it has always had.
    //
    // `isolate` scopes the negative z-index below to this card, and
    // `overflow-hidden` clips the artwork to the card's existing radius. No
    // padding of its own: the content block below carries it.
    <Card className="relative isolate aspect-[1672/941] items-start justify-start overflow-hidden p-0 md:aspect-auto md:h-full md:justify-center">
      {/* Decorative, so `alt=""`. `fill` + `object-cover` covers the card at any
          size and at its own aspect ratio — the artwork is cropped to fit, never
          stretched to it, which is what keeps it undistorted now that the card's
          height is the hero's rather than the asset's. The negative z-index
          paints it over the card's own surface but under the text. */}
      <Image
        src={BACKGROUND.src}
        alt=""
        fill
        sizes="(min-width: 1024px) 21rem, (min-width: 768px) 17rem, 100vw"
        className="-z-10 object-cover"
      />

      {/* Upper-left, and capped at two thirds of the width so the text never runs
          into the mailbox the artwork puts on the lower right. */}
      <div className="flex max-w-[66%] flex-col gap-0.5 p-5">
        {/* The artwork is a fixed light gradient in both themes — it carries no
            alpha and does not invert — so every colour here is pinned to a dark
            value rather than `text-foreground`/`text-muted-foreground`, which
            would turn near-white in dark mode and vanish against it. */}
        <Text size="sm" className="text-slate-500">
          Total earnings
        </Text>

        {/* Amount and count share a baseline rather than stacking, per the
            reference. `flex-wrap` is a safety valve only — at the column's real
            width the pair sits on one line. */}
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          <MetricText size="lg" className="text-slate-900">
            {formatHeadlineAmount(summary.totalEarned, summary.earnedCurrency)}
          </MetricText>
          <Text size="sm" className="text-slate-500">
            {referrals.toLocaleString("en-US")} {referrals === 1 ? "referral" : "referrals"}
          </Text>
        </div>
      </div>
    </Card>
  );
}
