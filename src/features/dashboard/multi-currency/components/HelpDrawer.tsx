"use client";

import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  VisuallyHidden,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { HELP_SUPPORT_EMAIL, HELP_SUPPORT_PHONE } from "@/components/layout/HeaderHelpMenu";

/** Verbatim per the International Accounts help spec — do not reword. */
const GUIDE_ITEMS = [
  {
    question: "What is this USD account, exactly?",
    answer:
      "A dedicated local account for U.S. inbound payments, mapped to your business. Funds land here first, then move into your chosen settlement currency on your regular cycle.",
  },
  {
    question: "ACH or Fedwire — which should my client use?",
    answer:
      "ACH is lower-cost and takes 1–2 business days; Fedwire settles same-day for larger amounts. Share both fields — the sender's bank picks the rail based on the amount and urgency.",
  },
  {
    question: "Is it safe to share these details externally?",
    answer:
      "Yes. The Share link exposes only the fields a client needs to send a payment, and it expires automatically. Avoid pasting the full account or routing numbers into chat or email.",
  },
];

/**
 * A tutorial video slot. `videoUrl` is undefined for every entry today — no
 * unlisted YouTube videos exist yet — so each tile renders as a muted,
 * non-interactive placeholder. Once real URLs land, a tile only needs an
 * `onClick`/embed branch keyed on `videoUrl` being set; the tile list and its
 * layout don't change.
 */
interface TutorialVideo {
  title: string;
  videoUrl?: string;
}

const TUTORIAL_VIDEOS: TutorialVideo[] = [
  { title: "Receiving your first USD payment" },
  { title: "Sharing account details with a client" },
];

function TutorialTile({ video }: { video: TutorialVideo }) {
  const ready = Boolean(video.videoUrl);

  return (
    <div
      className={
        "flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 px-3 py-6 text-center " +
        (ready ? "cursor-pointer hover:bg-muted/50" : "cursor-default")
      }
    >
      <span
        className={
          "flex h-10 w-10 items-center justify-center rounded-full " +
          (ready ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground opacity-50")
        }
      >
        <Icon name="play-circle" className="h-5 w-5" />
      </span>
      <p className="text-[12px] font-medium text-foreground">{video.title}</p>
      {!ready && <p className="text-[11px] text-muted-foreground">Coming soon</p>}
    </div>
  );
}

/**
 * Help for the International Accounts screen — a floating, detached panel
 * docked to the right edge, not a flush edge-to-edge drawer. flux-ui's own
 * Drawer bakes in an edge-flush `inset-y-0 right-0 h-full` shape and a fixed
 * 150ms animation with no way to reach past `DrawerContent`'s overlay (see
 * that component's own source), neither of which this design calls for, so
 * this is built directly on the same Radix primitive Drawer/Dialog use, with
 * framer-motion driving the slide+fade so its 250-300ms timing is exact
 * rather than borrowed from an unrelated global keyframe.
 *
 * Owns its own trigger (the Help icon) so the button and the panel it opens
 * can never drift apart, the same pattern HeaderHelpMenu uses for the header's
 * own Help control.
 */
export function HelpDrawer() {
  const [open, setOpen] = useState(false);
  // Both open and close are one continuous animated transition; a second tap
  // mid-transition is ignored rather than starting a competing one.
  const [isAnimating, setIsAnimating] = useState(false);

  const requestOpen = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setOpen(true);
  };

  const requestClose = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setOpen(false);
  };

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => (next ? requestOpen() : requestClose())}
    >
      <DialogPrimitive.Trigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon name="help-circle" className="h-4 w-4" />}
        >
          Help
        </Button>
      </DialogPrimitive.Trigger>

      {/* forceMount + AnimatePresence: Radix would otherwise unmount the
          overlay/content the instant `open` goes false, before framer-motion's
          exit animation ever gets to run. */}
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[100] bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className="fixed inset-y-4 right-4 z-[101] flex w-[min(400px,calc(100vw-2rem))] flex-col
                           overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl outline-none"
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                onAnimationComplete={() => setIsAnimating(false)}
              >
                {/* Header — fixed, does not scroll. */}
                <div className="shrink-0 border-b border-border px-5 py-4">
                  <div className="flex items-center justify-between">
                    <DialogPrimitive.Title className="text-base font-semibold text-foreground">
                      Help
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description asChild>
                      <VisuallyHidden>
                        Guide and tutorials for your International USD account
                      </VisuallyHidden>
                    </DialogPrimitive.Description>
                    <DialogPrimitive.Close
                      aria-label="Close"
                      className="-mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                    >
                      <Icon name="x" className="h-4 w-4" />
                    </DialogPrimitive.Close>
                  </div>
                </div>

                {/* Scrollable body. */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Guide
                  </p>
                  <Accordion type="single" collapsible className="mt-2">
                    {GUIDE_ITEMS.map((item) => (
                      <AccordionItem key={item.question} value={item.question}>
                        <AccordionTrigger className="text-left text-sm">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-[13px] text-muted-foreground">
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>

                  <p className="mt-6 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Tutorials
                  </p>
                  <div className="mt-2 flex gap-3">
                    {TUTORIAL_VIDEOS.map((video) => (
                      <TutorialTile key={video.title} video={video} />
                    ))}
                  </div>
                </div>

                {/* Footer — fixed to the bottom of the drawer, never the
                    bottom of the (possibly shorter) body content above it. */}
                <div className="flex shrink-0 items-start justify-between gap-4 border-t border-border px-5 py-4">
                  <p className="text-sm font-medium text-foreground">Feedback</p>
                  <div className="space-y-1.5 text-right">
                    <CopyableText
                      value={HELP_SUPPORT_PHONE}
                      className="justify-end"
                      valueClassName="text-[13px]"
                    />
                    <CopyableText
                      value={HELP_SUPPORT_EMAIL}
                      className="justify-end"
                      valueClassName="text-[13px]"
                    />
                  </div>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
