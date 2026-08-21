"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";

/** Compact "Refer & Earn" promo card sized for the sidebar's nav column
 * (~200px), a vertical stack (icon, heading, one-line pitch, full-width CTA)
 * rather than the wider horizontal ReferAndEarnBanner used on content pages,
 * same gradient/gift-icon visual language. */
export function SidebarReferBanner() {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-indigo-50 via-blue-50 to-blue-100 p-3 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-blue-900/20">
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
