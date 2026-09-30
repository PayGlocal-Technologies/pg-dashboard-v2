"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { AppImage } from "@/components/common/AppImage";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

const AUTO_MS = 6500;

interface PromoSlide {
  id: string;
  image: string;
  /** Dark-theme artwork, same size and layout as `image`. Falls back to
   *  `image` when a slide has none. */
  imageDark?: string;
  headline: React.ReactNode;
  body: string;
  ctaLabel: string;
  href: string;
}

const SLIDES: PromoSlide[] = [
  {
    id: "sell-globally",
    image: "/assets/dashboardPG_banner1.png",
    imageDark: "/assets/dashboardPG_banner_dark mode.png",
    // No forced break: the half-width text column wraps this into two lines
    // by itself; a break after "checkout" made it three.
    headline: "Add international and domestic cards checkout without a second onboarding",
    body: "Accept international payments through cards, Apple Pay and Google Pay, all through one payment gateway.",
    ctaLabel: "Learn more",
    href: "/multi-currency",
  },
  {
    id: "refer-and-earn",
    image: "/assets/r&e_homepage.png",
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
 * All slides share one frame (`aspect-4680/1132`, the "sell globally"
 * artwork's own shape, so it shows whole; the 4680×1296 refer-and-earn
 * artwork loses an even ~6% off its top and bottom, clear of its coins) and
 * one text-overlay layout (left half, vertically centered) so the swipe only
 * moves the slide itself, not the banner's own shape or text position.
 */
export function McaPromoCarousel() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || SLIDES.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <div
      className="relative isolate aspect-4680/1132 w-full overflow-hidden rounded-2xl border border-border/70"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* One track holding every slide side by side, moved a whole slide at a
          time. The outgoing slide and the incoming one travel together, so
          the next banner pushes the current one out with nothing between them.
          (Mounting one slide at a time under AnimatePresence mode="wait" let
          the first finish leaving before the second began entering, which
          left a blank banner mid-swipe; the incoming image also had to start
          loading at that moment.) Every slide stays mounted, so both images
          are already decoded by the first swipe. */}
      <motion.div
        className="flex h-full w-full"
        initial={false}
        animate={{ x: `-${index * 100}%` }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      >
        {SLIDES.map((slide, i) => (
          <div
            key={slide.id}
            className="relative h-full w-full shrink-0"
            // Off-screen slides stay out of the tab order and the a11y tree.
            aria-hidden={i !== index}
            inert={i !== index}
          >
            {/* The theme class on <html> picks light or dark artwork, so
                there's no flash or hydration mismatch while it loads. */}
            <AppImage
              src={slide.image}
              alt=""
              fill
              sizes="100vw"
              priority={i === 0}
              className={cn("object-cover object-center", slide.imageDark && "dark:hidden")}
            />
            {slide.imageDark && (
              <AppImage
                src={slide.imageDark}
                alt=""
                fill
                sizes="100vw"
                priority={i === 0}
                className="hidden object-cover object-center dark:block"
              />
            )}

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
                // Small caps-style label with a trailing arrow: a quiet link,
                // so the headline stays the loudest thing on the slide.
                rightIcon={<Icon name="arrow-right" size={13} aria-hidden />}
                className="mt-1 h-auto min-h-0 w-fit gap-1.5 p-0 text-[11px] font-semibold uppercase tracking-[0.08em]"
                onClick={() => router.push(slide.href)}
              >
                {slide.ctaLabel}
              </Button>
            </div>
          </div>
        ))}
      </motion.div>

      {SLIDES.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
          {SLIDES.map((s, i) => (
            <Button
              key={s.id}
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 min-h-0 rounded-full p-0 transition-all",
                i === index
                  ? "w-5 bg-foreground/70 hover:bg-foreground/70"
                  : "w-1.5 bg-foreground/25 hover:bg-foreground/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
