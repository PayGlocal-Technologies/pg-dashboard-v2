"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AppImage } from "@/components/common/AppImage";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

const AUTO_MS = 6500;

interface PromoSlide {
  id: string;
  image: string;
  headline: React.ReactNode;
  body: string;
  ctaLabel: string;
  href: string;
}

const SLIDES: PromoSlide[] = [
  {
    id: "sell-globally",
    image: "/assets/dashboardPG_banner1.png",
    headline: (
      <>
        Add international and domestic cards checkout
        <br />
        without a second onboarding
      </>
    ),
    body: "Accept international payments through cards, Apple Pay and Google Pay — all through one payment gateway.",
    ctaLabel: "Learn more",
    href: "/multi-currency",
  },
  {
    id: "refer-and-earn",
    image: "/assets/referandearnbanner.png",
    headline: (
      <>
        Know a business that needs
        <br />
        global payments?
      </>
    ),
    body: "Refer them to PayGlocal and earn $30 when they complete a transaction.",
    ctaLabel: "Learn more",
    href: "/refer-and-earn",
  },
];

/**
 * Edge-to-edge promo banner sitting above the "Good afternoon" greeting.
 * Auto-rotates between slides (framer-motion horizontal swipe, same AUTO_MS
 * timing PayGlocalAdvantageBanner's carousel uses on the general Home
 * dashboard) — name kept as McaPromoCarousel from when it briefly held only
 * one static slide, since callers don't need to change either way.
 *
 * All slides share one crop (`aspect-4680/950` on a 4680×1132 source, an
 * even ~8% trim off the top and bottom) and one text-overlay layout (left
 * half, vertically centered) so the swipe only moves the slide itself, not
 * the banner's own shape or text position.
 */
/** Slide index + which way it's swiping in from, moved together so the
 *  exiting slide always leaves toward where the new one came from (right →
 *  left going forward, the reverse going back) instead of every transition
 *  defaulting to one direction regardless of which dot was clicked. */
interface SlideState {
  index: number;
  direction: 1 | -1;
}

const SWIPE_VARIANTS = {
  enter: (direction: 1 | -1) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: 1 | -1) => ({ x: direction > 0 ? "-100%" : "100%", opacity: 0 }),
};

export function McaPromoCarousel() {
  const router = useRouter();
  const [{ index, direction }, setSlideState] = useState<SlideState>({ index: 0, direction: 1 });
  const [paused, setPaused] = useState(false);

  const goTo = (nextIndex: number) => {
    setSlideState((prev) => ({
      index: nextIndex,
      direction: nextIndex > prev.index ? 1 : -1,
    }));
  };

  useEffect(() => {
    if (paused || SLIDES.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideState((prev) => ({ index: (prev.index + 1) % SLIDES.length, direction: 1 }));
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  const slide = SLIDES[index]!;

  return (
    <div
      className="relative isolate aspect-4680/950 w-full overflow-hidden rounded-2xl border border-border/70"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={slide.id}
          custom={direction}
          variants={SWIPE_VARIANTS}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <AppImage
            src={slide.image}
            alt=""
            fill
            sizes="100vw"
            priority={index === 0}
            className="object-cover object-center"
          />

          <div className="absolute inset-y-0 left-0 flex w-1/2 flex-col justify-center gap-2 px-6 py-5 sm:gap-2.5 sm:px-10">
            <h2 className="text-xl font-bold leading-snug tracking-tight text-foreground sm:text-2xl">
              {slide.headline}
            </h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
              {slide.body}
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto min-h-0 w-fit p-0 text-base"
              onClick={() => router.push(slide.href)}
            >
              {slide.ctaLabel}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>

      {SLIDES.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-5 bg-foreground/70" : "w-1.5 bg-foreground/25 hover:bg-foreground/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
