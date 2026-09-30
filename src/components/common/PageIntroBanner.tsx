"use client";

import { useState } from "react";
import { IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";

/**
 * A closable intro banner for the top of a feature page (Invoice
 * Management, Client Management): full-width artwork with the heading and
 * one line of copy over its blank left side, and an × that hides it until
 * the page is next loaded. Same build as the dashboard's promo banner.
 *
 * `aspectClassName` sets the banner's shape as a literal Tailwind class (e.g.
 * "aspect-4680/892"). Match the artwork to show it whole, or go shorter to
 * trim it: the image is centred, so a shorter banner trims evenly from the
 * top and bottom.
 */
export function PageIntroBanner({
  image,
  aspectClassName,
  title,
  description,
}: {
  image: string;
  aspectClassName: string;
  title: string;
  description: string;
}) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div
      className={cn(
        "relative isolate w-full overflow-hidden rounded-2xl border border-border/70 animate-in fade-in duration-300",
        aspectClassName
      )}
    >
      <AppImage
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />

      <div className="absolute inset-y-0 left-0 flex w-[42%] flex-col justify-center gap-2 px-6 py-5 sm:gap-2.5 sm:px-10">
        <h2 className="text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      </div>

      <IconButton
        aria-label="Close banner"
        variant="ghost"
        size="sm"
        onClick={() => setVisible(false)}
        className="absolute right-3 top-3 h-7 w-7 min-h-0 min-w-0 rounded-full bg-card/80 text-muted-foreground backdrop-blur-sm hover:bg-card hover:text-foreground"
      >
        <Icon name="x" size={14} />
      </IconButton>
    </div>
  );
}
