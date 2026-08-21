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
 * Earned total above the leaderboard, set into the upper left of the referral
 * artwork. The figures come from the same summarizeReferrals output the analytics
 * row and the leaderboard's own "You" row read, so the three surfaces cannot
 * disagree.
 */
export function ReferralTotalsCard({ summary }: ReferralTotalsCardProps) {
  const referrals = summary.completed;

  return (
    // `aspectRatio` from the asset's own dimensions: the card's height follows its
    // width, so the artwork keeps its proportions at every breakpoint instead of
    // being cropped harder as the column narrows — and there is no pixel height
    // to maintain. `isolate` scopes the negative z-index below to this card, and
    // `overflow-hidden` clips the artwork to the card's existing radius. No
    // padding of its own: the content block below carries it.
    <Card
      className="relative isolate items-start justify-start overflow-hidden p-0"
      style={{ aspectRatio: `${BACKGROUND.width} / ${BACKGROUND.height}` }}
    >
      {/* Decorative, so `alt=""`. `fill` + `object-cover` covers the card at any
          size; the negative z-index paints it over the card's own surface but
          under the text. */}
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
