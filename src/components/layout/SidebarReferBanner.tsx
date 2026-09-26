"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { withBasePath } from "@/constants/basePath";

/** Compact "Refer & Earn" promo card sized for the sidebar's nav column
 * (~200px), a vertical stack (icon, heading, one-line pitch, full-width CTA)
 * rather than the wider horizontal ReferAndEarnBanner used on content pages,
 * same gift-icon visual language. */
export function SidebarReferBanner() {
  const router = useRouter();

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-cover bg-center p-3"
      // Quoted url(): the filename has a space ("bg image.png"), and an
      // unquoted CSS url() is terminated by the first whitespace, which
      // silently drops the whole background-image declaration.
      //
      // The white wash is a second, layered background (not `opacity` on
      // this div) — opacity would fade the heading/copy/button sitting on
      // top of it too, not just the image underneath.
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.35), rgba(255,255,255,0.35)), url("${withBasePath("/assets/bg image.png")}")`,
      }}
    >
      <Icon name="gift" size={18} className="relative text-primary" aria-hidden />
      <h3 className="relative mt-2 text-[13px] font-semibold text-foreground">Refer &amp; Earn</h3>
      <p className="relative mt-0.5 text-[11px] leading-snug text-muted-foreground">
        Invite a business, earn rewards on their first settlement.
      </p>
      <Button
        type="button"
        variant="primary"
        size="sm"
        rightIcon={<Icon name="arrow-right" size={11} />}
        onClick={() => router.push("/refer-and-earn")}
        className="relative mt-2.5 w-full"
      >
        Refer Now
      </Button>
    </div>
  );
}
