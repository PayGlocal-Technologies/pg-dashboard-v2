"use client";

import { AppImage as Image } from "@/components/common/AppImage";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CopyableText } from "@/components/common/CopyableText";
import type { Platform } from "@/features/dashboard/platforms/types";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/** Same tokens the Platforms page itself uses for a module title and its
 *  supporting copy, so this page reads as part of that feature rather than a
 *  screen with a typography scale of its own. */
const MODULE_TITLE = "text-base font-semibold text-foreground";
const MODULE_SUBTITLE = "text-[13px] text-muted-foreground";

/**
 * The connect walkthrough as its own full page, reached from the Platforms
 * header's "Steps to connect" button.
 *
 * It used to run inline under the account details, which made the page's own
 * subject — the receiving account a merchant came to read and copy — the
 * shortest thing on it: every numbered step and its full-width screenshot sat
 * below and pushed everything else past the fold. The instructions are
 * followed once per platform while the account details are read every time, so
 * the rarely-needed half is the half that moved.
 *
 * Rendered in place by PlatformsContent rather than behind a route of its own,
 * the same arrangement the Transactions table uses for TransactionDetailsPage.
 * That is what keeps the selected platform AND the header's chosen currency
 * intact across the transition: the Quick Access panel below quotes that
 * currency's own identifiers, so a separate route would have to thread both
 * through the URL and re-resolve the account to show the same thing.
 */
export function ConnectStepsPage({
  platform,
  account,
  onBack,
}: {
  platform: Platform;
  /** Drives the Quick Access panel's values, so the identifiers shown in the
   *  steps follow the currency chosen on the Platforms header. Null while
   *  accounts are still resolving, in which case that panel isn't drawn. */
  account: VirtualAccount | null;
  onBack: () => void;
}) {
  return (
    <div>
      {/* Same Back affordance as the transaction details page: ghost button,
          chevron, flush to the page's left edge so it reads as navigation out
          rather than an action within. */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
        onClick={onBack}
        className="pl-0 text-primary hover:text-primary-hover"
      >
        Back to Platforms
      </Button>

      <header className="mt-4 flex items-center gap-3">
        <Image
          src={platform.logoSrc}
          alt=""
          width={90}
          height={60}
          className="h-8 w-12 shrink-0 object-contain"
        />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Connect your account to {platform.name}
          </h1>
          <p className={cn(MODULE_SUBTITLE, "mt-0.5")}>
            Follow these steps in {platform.name} to start receiving payouts.
          </p>
        </div>
      </header>

      {/* The video first, the written steps under it: a merchant who wants to
          watch rather than read shouldn't have to scroll past the whole
          walkthrough to find it. Capped rather than full-bleed so it doesn't
          out-weigh the steps it introduces. */}
      <section className="mt-8 max-w-3xl">
        <h2 className={MODULE_TITLE}>Watch how it works</h2>
        <p className={cn(MODULE_SUBTITLE, "mt-1")}>
          A walkthrough of the whole connection, start to finish.
        </p>
        <TutorialVideo url={platform.tutorialVideoUrl} platformName={platform.name} />
      </section>

      <section className="mt-10">
        <h2 className={MODULE_TITLE}>Step by step</h2>

        {/* Step number → instruction → screenshot, in that order, every step
            the same shape so the sequence scans as one column.

            space-y-8 between steps against the 4px and 12px inside one: a
            step's own parts sit far closer to each other than any step does to
            the next, which is what gives the sequence its rhythm rather than
            reading as evenly spaced blocks. */}
        <ol className="mt-4 max-w-3xl space-y-8">
          {platform.steps.map((step, index) => (
            <li key={step.instruction}>
              {/* The number is a marker, not a title: smallest size, muted,
                  medium weight so it still reads as a label. The instruction
                  above it in both size and colour is what makes the
                  instruction the step's own strongest element. */}
              <p className="text-[12px] font-medium text-muted-foreground">Step {index + 1}</p>
              <p className="mt-1 text-[15px] font-medium text-foreground">{step.instruction}</p>

              {/* Caveat, not instruction: muted and a size down so it reads as
                  an aside rather than another thing to do. */}
              {step.note && (
                <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                  <span className="font-medium">Note:</span> {step.note}
                </p>
              )}

              {/* Quick Access — the identifiers this step asks the merchant to
                  type into the platform, sat between the instruction that names
                  them and the screenshot showing where they go, so they're on
                  screen at the moment they're needed.

                  Which step carries it is data (`quickAccess` on the step), not
                  a step index, so moving it is a constants change. */}
              {step.quickAccess && account && (
                <Card
                  size="sm"
                  className="mt-3 flex-row flex-wrap items-center justify-between gap-x-8 gap-y-4 p-6"
                >
                  <p className="text-[15px] font-semibold text-foreground">Quick access</p>

                  <dl className="flex flex-wrap items-start gap-x-6 gap-y-4">
                    {account.details.map((field) => (
                      <div key={field.label} className="min-w-0 space-y-1.5">
                        <dt className="text-[12px] text-muted-foreground">{field.label}:</dt>
                        <dd>
                          <CopyableText
                            value={field.value}
                            className="rounded-lg border border-border px-3 py-1.5"
                            valueClassName="font-medium"
                          />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </Card>
              )}

              {step.screenshotSrc && (
                <div className="mt-3 aspect-[515/265] w-full overflow-hidden rounded-[10px]">
                  <Image
                    src={step.screenshotSrc}
                    alt={step.screenshotAlt ?? ""}
                    width={515}
                    height={265}
                    className="h-full w-full"
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/**
 * The platform's video walkthrough, or the placeholder standing in for one.
 *
 * 16:9 either way, so the slot a real video will occupy is already the right
 * shape — supplying `tutorialVideoUrl` swaps the contents without moving
 * anything around it. The placeholder states what it is rather than pretending
 * to be a player: nothing here is clickable, because there is nothing yet to
 * play.
 */
function TutorialVideo({ url, platformName }: { url?: string; platformName: string }) {
  if (url) {
    return (
      <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl border border-border">
        <video src={url} controls className="h-full w-full" />
      </div>
    );
  }

  return (
    <div
      className="mt-4 flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-center"
      role="img"
      aria-label={`Video walkthrough for connecting ${platformName} — coming soon`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted-foreground">
        <Icon name="play" className="h-5 w-5" />
      </span>
      <p className="text-[14px] font-medium text-foreground">Video walkthrough</p>
      <p className="max-w-xs text-[13px] text-muted-foreground">
        A guided video for {platformName} is on its way. The steps below cover the same ground in
        the meantime.
      </p>
    </div>
  );
}
