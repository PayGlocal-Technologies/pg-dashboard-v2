import Image from "next/image";
import { Card, MetricText, Text } from "@/components/ui";
import { formatCurrency } from "@/lib/utils/format";
import type { ReferralSummary } from "@/features/dashboard/refer-and-earn/helpers";

/**
 * Card background, served from `public/assets`. A raster asset, so it cannot
 * be an icon-registry entry (that pattern is for SVG forwardRef components)
 * and goes through `next/image` instead — see CLAUDE.md's Images rule.
 *
 * The file's own ratio (1463:1075, ≈1.36:1) is taller than the card's fixed
 * 16:9 frame, so `object-cover` has to crop it vertically to fill the frame —
 * there is no ratio that avoids that once the card's own ratio is fixed. The
 * crop is anchored to the bottom (see the `object-bottom` below) rather than
 * centred, because the top of this asset is empty gradient with nothing in it,
 * while the jar sits low in the frame with a soft shadow beneath it — bottom
 * anchoring is what loses only the empty part and keeps the jar whole.
 */
const TOTAL_EARNED_BACKGROUND = {
  src: "/assets/Total Earned2.png",
  width: 1463,
  height: 1075,
} as const;

interface ReferralTotalsCardProps {
  summary: ReferralSummary;
}

/**
 * Earned total beside the hero: a compact 16:9 banner rather than a tall
 * content card, with the figure set into the asset's own light upper-left
 * corner. The figure comes from the same summarizeReferrals output the
 * analytics row reads, so the two surfaces cannot disagree.
 */
export function ReferralTotalsCard({ summary }: ReferralTotalsCardProps) {
  const referrals = summary.completed;

  return (
    // `aspect-video` is Tailwind's literal 16/9 — the card's height is derived
    // from its own rendered width and nothing else, so it scales with the
    // column at every breakpoint without ever needing a pixel or `min-h-*`
    // value. `overflow-hidden` clips the background to the card's own
    // radius; `isolate` scopes the image's negative z-index to this card.
    <Card className="relative isolate aspect-video overflow-hidden p-0">
      {/* Decorative, so `alt=""`. `object-cover` fills the fixed 16:9 frame
          from the asset's own different ratio without distorting it —
          scaled uniformly, then cropped, never stretched. */}
      <Image
        src={TOTAL_EARNED_BACKGROUND.src}
        alt=""
        fill
        sizes="(min-width: 1024px) 21rem, (min-width: 768px) 17rem, 100vw"
        className="-z-10 object-cover object-bottom"
      />

      {/* Upper-left, on the asset's own light corner. Capped at 60% of the
          width so the text can never run into the jar sitting in the lower
          right, at every card width. Colours are pinned to fixed dark values
          rather than `text-foreground`/`text-muted-foreground` — the asset is
          a fixed light-to-blue gradient in both themes, and the semantic
          tokens would turn near-white in dark mode and vanish against it. */}
      <div className="absolute left-0 top-0 flex max-w-[60%] flex-col gap-0.5 p-4 sm:p-6">
        <Text size="sm" className="text-slate-500">
          Total earnings
        </Text>
        <MetricText size="lg" className="text-slate-900">
          {formatCurrency(summary.totalEarned, summary.earnedCurrency, "en-US")}
        </MetricText>
        <Text size="sm" className="text-slate-500">
          from {referrals.toLocaleString("en-US")} {referrals === 1 ? "referral" : "referrals"}
        </Text>
      </div>
    </Card>
  );
}
