"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { ReferralLink } from "@/features/dashboard/partner-home/mock-data";

/** Each product's icon; anything new falls back to a plain link. */
const PRODUCT_ICON: Record<string, IconName> = {
  pg: "credit-card",
  mca: "globe",
  amazon: "shopping-cart",
};

/** The link without its scheme, shortened in the middle so the part that
 *  differs between products (the end) always shows. */
function displayUrl(url: string): string {
  const bare = url.replace(/^https?:\/\//, "");
  return bare.length > 44 ? `${bare.slice(0, 22)}…${bare.slice(-20)}` : bare;
}

/**
 * Every referral link in one place, from the Referral links shortcut: the
 * product, the link itself (so the partner can see what they're sharing),
 * and Copy. The full share options are on the referral page.
 */
export function ReferralLinksDialog({
  open,
  onOpenChange,
  links,
  onViewAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: ReferralLink[];
  onViewAll: () => void;
}) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  async function copy(link: ReferralLink) {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedId(link.id);
      toast.success("Referral link copied", { description: link.product });
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Couldn't copy the link", { description: "Select it and copy it manually." });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <div className="flex items-start gap-3 px-6 pt-6 pr-14">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="link" size={18} aria-hidden />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg leading-tight">Your referral links</DialogTitle>
            <DialogDescription className="mt-0.5 text-[13px]">
              One link per product. Merchants who sign up through them are added to your portfolio.
            </DialogDescription>
          </div>
        </div>

        <ul className="space-y-2.5 px-6 py-5">
          {links.map((link) => {
            const copied = copiedId === link.id;
            return (
              <li
                key={link.id}
                className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
                  <Icon name={PRODUCT_ICON[link.id] ?? "link"} size={16} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground">{link.product}</p>
                  <p
                    title={link.url}
                    className="mt-0.5 truncate font-mono text-xs text-muted-foreground"
                  >
                    {displayUrl(link.url)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copy(link)}
                  aria-label={`Copy ${link.product} referral link`}
                  leftIcon={
                    <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" aria-hidden />
                  }
                  className={cn(
                    "h-8 min-w-[6.5rem] shrink-0 shadow-none",
                    copied && "border-emerald-300 text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <Button
            type="button"
            variant="link"
            size="sm"
            rightIcon={<Icon name="arrow-right" className="h-3 w-3" />}
            onClick={onViewAll}
            className="h-auto min-h-0 p-0 text-xs font-semibold"
          >
            All share options
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
