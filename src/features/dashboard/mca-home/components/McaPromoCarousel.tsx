"use client";

import { useRouter } from "next/navigation";
import { AppImage } from "@/components/common/AppImage";
import { Button } from "@/components/ui";

/**
 * Edge-to-edge promo banner sitting above the "Good afternoon" greeting.
 * Replaces the previous two-slide auto-rotating carousel with a single
 * static banner (public/assets/dashboardPG_banner1.png), per explicit ask —
 * name kept as McaPromoCarousel so callers don't need to change, even
 * though it no longer rotates between slides.
 */
export function McaPromoCarousel() {
  const router = useRouter();

  return (
    <div className="relative isolate aspect-4680/950 w-full overflow-hidden rounded-2xl border border-border/70">
      {/* Back to the full-aspect-ratio box (4680×1132), just slightly
          shorter: `aspect-4680/950` keeps the same proportional crop at
          every viewport width, trimming ~8% off the top and ~8% off the
          bottom equally (object-center) rather than a fixed px height,
          which cropped a different fraction depending on the rendered
          width. The illustration itself (cards + coins) only spans the
          image's middle ~77% vertically, so an even 8%-per-side trim stays
          well clear of it on both ends. */}
      <AppImage
        src="/assets/dashboardPG_banner1.png"
        alt=""
        fill
        sizes="100vw"
        priority
        className="object-cover object-center"
      />

      <div className="absolute inset-y-0 left-0 flex w-1/2 flex-col justify-center gap-2 px-6 py-5 sm:gap-2.5 sm:px-10">
        <h2 className="text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
          Sell globally.
          <br />
          Get paid seamlessly.
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Accept international payments through cards, Apple Pay and Google Pay — all through one
          payment gateway.
        </p>
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto min-h-0 w-fit p-0 text-base"
          onClick={() => router.push("/multi-currency")}
        >
          Learn more
        </Button>
      </div>
    </div>
  );
}
