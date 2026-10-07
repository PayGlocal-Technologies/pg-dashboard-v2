"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import type { ReferralLink } from "@/features/dashboard/partner-home/mock-data";

/**
 * Bring more merchants: one referral link per product, each with Copy link,
 * which confirms in the button ("Copied") and with the app's toast.
 */
export function ReferralLinksCard({
  links,
  onViewLinks,
}: {
  links: ReferralLink[];
  onViewLinks: () => void;
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
      toast.error("Couldn't copy the link", { description: "Open the links page to copy it." });
    }
  }

  return (
    <Card className="gap-0 p-5">
      <h2 className="text-sm font-semibold text-foreground">Bring more merchants</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        One referral link per product.
      </p>

      <ul className="mt-3">
        {links.map((link, i) => {
          const copied = copiedId === link.id;
          return (
            <li key={link.id} className={i > 0 ? "border-t border-border" : undefined}>
              <div className="flex items-center justify-between gap-3 py-2.5">
                <span className="text-[13px] text-foreground">{link.product}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void copy(link)}
                  aria-label={`Copy ${link.product} referral link`}
                  leftIcon={
                    <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" aria-hidden />
                  }
                  className="min-w-[6.5rem] shrink-0"
                >
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={onViewLinks}
        rightIcon={<Icon name="arrow-right" className="h-3 w-3" />}
        className="mt-2 h-auto min-h-0 w-fit p-0 text-xs font-semibold"
      >
        View links and share options
      </Button>
    </Card>
  );
}
