"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { HowItWorksDialog } from "@/features/dashboard/static-link/components/HowItWorksDialog";
import { StaticLinkArtwork } from "@/features/dashboard/static-link/components/StaticLinkArtwork";
import {
  STATIC_LINK_COPIED_MESSAGE,
  STATIC_LINK_SUBTITLE,
  STATIC_LINK_TITLE,
} from "@/features/dashboard/static-link/constants";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-[19px] font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}

/**
 * The link itself: what it is, the link with Copy Link, and how it is doing.
 *
 * TODO(api): the three stats read 0 until a static link stats endpoint
 * exists.
 */
export function StaticLinkHero({ url, host }: { url: string; host: string }) {
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const copy = () =>
    void navigator.clipboard
      .writeText(`https://${url}`)
      .then(() => toast.success(STATIC_LINK_COPIED_MESSAGE))
      .catch(() => toast.error("Couldn't copy to clipboard"));

  return (
    <Card className="flex-col gap-5 p-5 sm:flex-row">
      <StaticLinkArtwork url={url} />

      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[14.5px] font-semibold text-foreground">{STATIC_LINK_TITLE}</h1>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{STATIC_LINK_SUBTITLE}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHowItWorksOpen(true)}
            leftIcon={<Icon name="help-circle" className="h-3.5 w-3.5" />}
            className="text-[12.5px]"
          >
            How it works
          </Button>
        </div>

        <div className="mt-2.5 flex h-[52px] max-w-[448px] items-center justify-between gap-3 rounded-lg bg-muted/70 pr-2 pl-3">
          <span className="truncate text-[14px] font-medium text-foreground">{url}</span>
          <Button
            variant="primary"
            size="sm"
            onClick={copy}
            leftIcon={<Icon name="copy" className="h-3.5 w-3.5" />}
            className="h-[34px] min-h-[34px] shrink-0 px-3.5 text-[13px]"
          >
            Copy Link
          </Button>
        </div>

        <div className="mt-5 grid max-w-[662px] grid-cols-1 divide-y divide-border rounded-lg border border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat label="Total payments" value="0" />
          <Stat label="Successful payments" value="0" />
          <Stat label="Total revenue" value="₹0.00" />
        </div>
      </div>

      <HowItWorksDialog
        open={isHowItWorksOpen}
        onOpenChange={setIsHowItWorksOpen}
        url={url}
        host={host}
      />
    </Card>
  );
}
