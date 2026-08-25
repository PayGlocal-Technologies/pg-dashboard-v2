"use client";

import { AppImage as Image } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";
import { flagSrc } from "@/features/dashboard/multi-currency/utils";

interface CountryFlagProps {
  iso2: string;
  /** Accessible name. Pass "" when the flag sits beside text that already
   *  names the country/currency, so it isn't announced twice. */
  alt?: string;
  className?: string;
}

/**
 * Small rectangular flag used inline beside text: table cells, chips,
 * filter options, as opposed to CountryFlagAvatar's circular badge for
 * standalone account art. Same CDN source, size, and border everywhere it's
 * used, so every flag in the product reads as one visual system rather than
 * drifting per call site.
 */
export function CountryFlag({ iso2, alt = "", className }: CountryFlagProps) {
  return (
    <Image
      src={flagSrc(iso2)}
      alt={alt}
      width={20}
      height={14}
      unoptimized
      className={cn("h-3.5 w-5 shrink-0 rounded-sm border border-border object-cover", className)}
    />
  );
}
