"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    image: "/assets/Analytics.png",
    eyebrow: "Analytics",
    title: "A clearer view of your business",
    description:
      "Track settlements, revenue trends, and currency breakdowns with live analytics, all at a glance.",
  },
  {
    image: "/assets/Echo.png",
    eyebrow: "Echo",
    title: "Meet Echo, your AI assistant",
    description:
      "Get instant help with payments, transactions, settlements, and more — right from the sidebar.",
  },
  {
    image: "/assets/Redesigned.png",
    eyebrow: "Redesigned experience",
    title: "A faster, simpler way to manage payments",
    description:
      "Explore the redesigned home, quicker invoice and transaction workflows, one-tap actions, and the new eBRC experience.",
  },
];

/** Bump when SLIDES changes: a new key is a new announcement, so it shows
 *  once more to everyone who dismissed the previous one. */
const SEEN_KEY = "payglocal_mca_welcome_seen_v2";

function hasSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    // Storage blocked (private mode, site data off): treat as seen rather
    // than risk showing it on every single visit.
    return true;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Nothing to do; see hasSeen.
  }
}

const FADE = { duration: 0.25, ease: [0.33, 0.88, 0.22, 1] as const };

/**
 * Post-login "what's new" intro, shown once per browser per version of
 * SLIDES (see SEEN_KEY). Any way of closing it (Start tour, "later", Esc, the
 * overlay) counts as seen: an announcement that returns on every visit reads
 * as a nag, not news. A three-step carousel that only advances on "Next" — never
 * on a timer — ending in "Start tour", which hands off to the same
 * MCA_DASHBOARD_GUIDE_STEPS walkthrough the floating guide button runs. The
 * parent owns that GuideTour instance.
 */
export function WelcomeExperienceModal({
  onStartTour,
  onSettled,
}: {
  onStartTour: () => void;
  /** Called once the modal has decided whether to show (true = it is opening),
   *  so the dashboard can hold back its other first-visit prompt meanwhile. */
  onSettled?: (shown: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Deferred so setState isn't synchronous in the effect body, and so the
    // dashboard gets a beat to paint first.
    const timer = window.setTimeout(() => {
      const shown = !hasSeen();
      if (shown) setOpen(true);
      onSettled?.(shown);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [onSettled]);

  const isLast = step === SLIDES.length - 1;
  const slide = SLIDES[step]!;

  function handleOpenChange(next: boolean) {
    if (!next) markSeen();
    setOpen(next);
  }

  function handleStartTour() {
    handleOpenChange(false);
    onStartTour();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[min(100%-1.5rem,58rem)] overflow-hidden p-0">
        {/* Fixed height on sm+ so the dialog never resizes between slides,
            whatever each slide's copy length. */}
        <div className="flex flex-col sm:h-104 sm:flex-row">
          <div className="relative h-48 shrink-0 overflow-hidden bg-muted/60 sm:h-auto sm:w-[45%]">
            <AnimatePresence initial={false}>
              <motion.div
                key={slide.image}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={FADE}
              >
                <AppImage
                  src={slide.image}
                  alt=""
                  fill
                  priority={step === 0}
                  sizes="(min-width: 640px) 26rem, 100vw"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex min-w-0 flex-1 flex-col p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={FADE}
                className="mt-4"
              >
                <p className="text-[12px] font-semibold uppercase tracking-wider text-primary">
                  {slide.eyebrow}
                </p>
                <DialogTitle className="mt-2 text-xl font-semibold leading-snug text-foreground">
                  {slide.title}
                </DialogTitle>
                <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-auto pt-8">
              {/* Step indicator — also lets the user jump back to a slide. */}
              <div className="mb-6 flex items-center gap-1.5">
                {SLIDES.map((s, i) => (
                  <Button
                    key={s.eyebrow}
                    type="button"
                    variant="ghost"
                    aria-label={`Go to step ${i + 1}`}
                    aria-current={i === step}
                    onClick={() => setStep(i)}
                    className={cn(
                      "h-1.5 min-h-0 rounded-full p-0 transition-all hover:bg-primary/40",
                      i === step
                        ? "w-6 bg-primary hover:bg-primary"
                        : "w-1.5 bg-muted-foreground/25"
                    )}
                  />
                ))}
                <span className="ml-auto text-[12px] tabular-nums text-muted-foreground">
                  {step + 1} of {SLIDES.length}
                </span>
              </div>

              <div className="space-y-2">
                <Button
                  type="button"
                  variant="primary"
                  className="w-full"
                  onClick={isLast ? handleStartTour : () => setStep((s) => s + 1)}
                >
                  {isLast ? "Start tour" : "Next"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => handleOpenChange(false)}
                >
                  I&apos;ll do this later
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
