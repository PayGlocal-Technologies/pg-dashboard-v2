"use client";

import { useState } from "react";
import { AppImage as Image } from "@/components/common/AppImage";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { flagSrc } from "@/features/dashboard/multi-currency/utils";

interface CountryFlagAvatarProps {
  iso2: string;
  /** Accessible name — the country this flag represents. */
  countryName: string;
  className?: string;
}

/**
 * Circular flag badge that fills the round placeholder on each account card.
 * Flags are 4:3 SVGs on the CDN, so `object-cover` crops them to the circle.
 * Regions without a country flag on the CDN (e.g. the EU entry) fall back to a
 * globe glyph rather than rendering a broken image.
 */
export function CountryFlagAvatar({ iso2, countryName, className }: CountryFlagAvatarProps) {
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted",
        className
      )}
    >
      {failed ? (
        <Icon name="globe" className="h-4 w-4 text-muted-foreground" aria-label={countryName} />
      ) : (
        <Image
          src={flagSrc(iso2)}
          alt={countryName}
          width={36}
          height={36}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
          unoptimized
        />
      )}
    </div>
  );
}
