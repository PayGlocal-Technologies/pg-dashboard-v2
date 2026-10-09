"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Card, Shimmer, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CollectedFieldsPopover } from "@/features/dashboard/static-link/components/CollectedFieldsPopover";
import { StaticLinkArtwork } from "@/features/dashboard/static-link/components/StaticLinkArtwork";
import {
  STATIC_LINK_SUBTITLE,
  STATIC_LINK_TITLE,
} from "@/features/dashboard/static-link/constants";
import {
  canCustomizeStaticLinkHandle,
  isAwaitingPlatform,
  isSwitchedOn,
  toCollectedFields,
  toDisplayLink,
} from "@/features/dashboard/static-link/helpers";
import type {
  StaticLinkDisplayFieldsRequest,
  StaticLinkProductData,
} from "@/features/dashboard/static-link/types";

function LinkStatusBadge({ link }: { link: StaticLinkProductData | null }) {
  if (!link) return null;
  if (isSwitchedOn(link)) return <StatusBadge variant="success" label="Live" size="sm" />;
  // Amber for both: neither is taking payments right now, and a switched-off
  // link is something the merchant may want to act on.
  if (isAwaitingPlatform(link)) {
    return <StatusBadge variant="warning" label="Not active yet" size="sm" />;
  }
  return <StatusBadge variant="warning" label="Disabled" size="sm" />;
}

/**
 * The merchant's unique, permanent payment link and the controls they own over
 * it (pg-dashboard's StaticLinkCard): the details to collect, the one-time
 * name, and Copy Link.
 *
 * The URL is always the server's `shareableLink`; when there is none the card
 * says so rather than showing a plausible guess, since a wrong payment link is
 * worse than none.
 *
 * No headline numbers (payments, revenue): there is no summary endpoint, and a
 * hardcoded zero reads as a real figure that contradicts the transactions
 * listed below. pg-dashboard hides them for the same reason.
 */
export function StaticLinkHero({
  link,
  isLoading,
  isSaving,
  onHowItWorks,
  onEditHandle,
  onSaveDisplayFields,
}: {
  link: StaticLinkProductData | null;
  isLoading: boolean;
  isSaving: boolean;
  onHowItWorks: () => void;
  /** Opens the one-time handle editor. Only offered while unlocked. */
  onEditHandle: () => void;
  onSaveDisplayFields: (body: StaticLinkDisplayFieldsRequest) => void;
}) {
  const collectedFields = useMemo(() => toCollectedFields(link), [link]);
  const shareableLink = link?.shareableLink ?? "";
  const displayLink = toDisplayLink(shareableLink);

  // The button itself confirms the copy: green with "Copied" for 2 seconds,
  // then back. A second click restarts the 2 seconds.
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    []
  );

  const copy = () =>
    void navigator.clipboard
      .writeText(shareableLink)
      .then(() => {
        setCopied(true);
        if (copiedTimer.current) clearTimeout(copiedTimer.current);
        copiedTimer.current = setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Couldn't copy to clipboard"));

  return (
    <Card className="flex-col gap-5 p-5 sm:flex-row">
      <StaticLinkArtwork />

      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[14.5px] font-semibold text-foreground">{STATIC_LINK_TITLE}</h1>
              <LinkStatusBadge link={link} />
            </div>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">{STATIC_LINK_SUBTITLE}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Shown even before the link exists, disabled: the config is part
                of what this screen offers. */}
            <CollectedFieldsPopover
              fields={collectedFields}
              isSaving={isSaving}
              disabled={!link}
              onSave={onSaveDisplayFields}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={onHowItWorks}
              leftIcon={<Icon name="help-circle" className="h-3.5 w-3.5" />}
              className="text-[12.5px]"
            >
              How it works
            </Button>
          </div>
        </div>

        <div className="mt-2.5 flex h-[52px] max-w-[520px] items-center justify-between gap-2 rounded-lg bg-muted/70 pr-2 pl-3">
          {isLoading && !link ? (
            <Shimmer className="h-4 w-56" />
          ) : (
            <span
              title={displayLink || undefined}
              className={
                displayLink
                  ? "truncate text-[14px] font-medium text-foreground"
                  : "truncate text-[14px] text-muted-foreground"
              }
            >
              {displayLink || "No link set up yet"}
            </span>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {/* The one window for naming the link: it closes for good the
                first time the link goes live. */}
            {canCustomizeStaticLinkHandle(link) && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditHandle}
                leftIcon={<Icon name="pencil" className="h-3.5 w-3.5" />}
                className="h-[34px] min-h-[34px] px-3 text-[13px]"
              >
                Edit name
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={copy}
              disabled={!shareableLink}
              aria-label={
                copied ? "Link copied" : displayLink ? `Copy ${displayLink}` : "Copy link"
              }
              leftIcon={<Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />}
              className={cn(
                "h-[34px] min-h-[34px] px-3.5 text-[13px]",
                copied && "bg-success! text-white! hover:bg-success!"
              )}
            >
              {copied ? "Copied" : "Copy Link"}
            </Button>
          </div>
        </div>

        {/* DRAFT and PAUSED are the one upstream state the merchant read can
            see; the platform's own gate is not returned, so a switched-off
            link cannot be told apart from a platform one. */}
        {isAwaitingPlatform(link) && (
          <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            <Icon name="info" className="h-3.5 w-3.5 shrink-0" aria-hidden />
            PayGlocal has not activated your link yet. Customers cannot pay through it until then.
          </p>
        )}
      </div>
    </Card>
  );
}
