"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";

function hasDismissed(key: string): boolean {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    // Storage blocked (private mode, site data off): treat as dismissed rather
    // than show it on every single visit, same as WelcomeExperienceModal.
    return true;
  }
}

function markDismissed(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // Nothing to do; see hasDismissed.
  }
}

/**
 * A closable intro banner for the top of a feature page (Invoice
 * Management, Client Management): full-width artwork with the heading and
 * one line of copy over its blank left side, and an × that hides it. Same
 * build as the dashboard's promo banner.
 *
 * Without `storageKey` the × only hides it until the page is next loaded.
 * With one, closing it is remembered in this browser, so it keeps showing
 * until the merchant closes it once and never after. Bump the key when the
 * banner's message changes, so it shows again.
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
  storageKey,
}: {
  image: string;
  aspectClassName: string;
  /** A string, or a node when the heading needs a set line break. */
  title: ReactNode;
  description: string;
  storageKey?: string;
}) {
  // With a storageKey it starts hidden, since the server render can't read
  // localStorage, and appears after mount only if it hasn't been dismissed.
  // Starting visible would flash it for a merchant who already closed it.
  const [visible, setVisible] = useState(!storageKey);

  useEffect(() => {
    if (!storageKey) return;
    // Deferred, not a synchronous setState in the effect body (CLAUDE.md).
    const timer = window.setTimeout(() => setVisible(!hasDismissed(storageKey)), 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  const close = (): void => {
    if (storageKey) markDismissed(storageKey);
    setVisible(false);
  };

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
        onClick={close}
        className="absolute right-3 top-3 h-7 w-7 min-h-0 min-w-0 rounded-full bg-card/80 text-muted-foreground backdrop-blur-sm hover:bg-card hover:text-foreground"
      >
        <Icon name="x" size={14} />
      </IconButton>
    </div>
  );
}
