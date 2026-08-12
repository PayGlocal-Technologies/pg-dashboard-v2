"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";

/** Promotional banner, gradient background with a few decorative circles and
 * a gift icon, in the spirit of the Refer & Earn illustration used elsewhere
 * in the app. Always shown (no status gating) wherever it's rendered. */
export function ReferAndEarnBanner() {
  const router = useRouter();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-indigo-50 via-blue-50 to-blue-100 px-5 py-4 dark:from-indigo-950/40 dark:via-blue-950/30 dark:to-blue-900/20">
      <span
        aria-hidden="true"
        className="absolute right-24 top-3 h-3 w-3 rounded-full border-2 border-indigo-300 dark:border-indigo-500/60"
      />
      <span
        aria-hidden="true"
        className="absolute bottom-4 right-36 h-3.5 w-3.5 rounded-full bg-amber-300/80 dark:bg-amber-400/60"
      />
      <span
        aria-hidden="true"
        className="absolute right-6 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-primary/10"
      >
        <Icon name="gift" size={24} className="text-primary" aria-hidden />
      </span>

      <div className="relative flex flex-wrap items-center justify-between gap-3 pr-20">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Liking the product? Refer &amp; Earn</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Invite other businesses to PayGlocal and earn rewards when they complete their first settlement.
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          rightIcon={<Icon name="arrow-right" size={12} />}
          onClick={() => router.push("/refer-and-earn")}
          className="shrink-0"
        >
          Refer Now
        </Button>
      </div>
    </div>
  );
}
