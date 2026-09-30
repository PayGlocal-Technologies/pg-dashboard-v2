"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { brandBackdropStyle } from "@/lib/utils/brandBackdrop";

/** Compact "Refer & Earn" promo card sized for the sidebar's nav column
 * (~200px), a vertical stack (heading, one-line pitch, full-width white CTA)
 * rather than the wider horizontal ReferAndEarnBanner used on content pages.
 * The gift icon appears only on the collapsed row.
 *
 * The X collapses it to a single nav-row-sized "Refer & Earn" link in the same
 * pinned slot above the profile section, so it stops taking space without
 * disappearing. Collapsed for the rest of the session (the sidebar stays
 * mounted across page changes); a reload shows the full card again. */
export function SidebarReferBanner() {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const goToReferral = () => router.push("/refer-and-earn");

  if (collapsed) {
    return (
      // Same brand wash, border and radius as the full card, just one row
      // tall; the whole row opens the Refer & Earn page. Zoomed into the
      // image's middle (220%): its artwork has faint grid lines near the
      // edges that a strip this thin would otherwise show.
      <Button
        type="button"
        variant="ghost"
        onClick={goToReferral}
        style={brandBackdropStyle(35)}
        className="brand-backdrop h-auto min-h-0 w-full justify-start gap-2.5 overflow-hidden rounded-xl border border-border bg-size-[220%_auto] bg-center px-3 py-2.5 text-[13px] font-semibold text-foreground hover:text-foreground [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-2.5"
      >
        <Icon name="gift" size={16} className="relative shrink-0 text-primary" aria-hidden />
        <span className="relative flex-1 truncate text-left">Refer &amp; Earn</span>
        <Icon name="arrow-right" size={13} className="relative shrink-0 text-primary" aria-hidden />
      </Button>
    );
  }

  return (
    <div
      className="brand-backdrop relative overflow-hidden rounded-xl border border-border bg-cover bg-center p-3"
      // The wash is a layered background (not `opacity` on this div), which
      // would fade the heading/copy/button on top of it too.
      style={brandBackdropStyle(35)}
    >
      <IconButton
        aria-label="Collapse Refer & Earn"
        variant="ghost"
        size="sm"
        onClick={() => setCollapsed(true)}
        className="absolute right-1.5 top-1.5 z-10 h-6 w-6 min-h-0 min-w-0 text-muted-foreground hover:text-foreground"
      >
        <Icon name="x" size={13} />
      </IconButton>
      {/* pr-6 keeps the heading's text clear of the × in the corner; the ×'s
          z-10 keeps it clickable, since this `relative` heading comes later in
          the DOM and would otherwise sit on top of it. */}
      <h3 className="relative pr-6 text-[13px] font-semibold text-foreground">Refer &amp; Earn</h3>
      <p className="relative mt-0.5 text-[11px] leading-snug text-muted-foreground">
        Invite a business, earn rewards on their first settlement.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        rightIcon={<Icon name="arrow-right" size={11} />}
        onClick={goToReferral}
        // White on the brand wash (card-coloured in dark mode), with the brand
        // colour moved to the label.
        className="relative mt-2.5 w-full border-transparent bg-white text-primary shadow-sm hover:bg-white/85 hover:text-primary dark:bg-card dark:hover:bg-card/85"
      >
        Refer Now
      </Button>
    </div>
  );
}
