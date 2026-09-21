"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppImage } from "@/components/common/AppImage";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { REFERRAL_HERO_BANNER } from "@/features/dashboard/refer-and-earn/constants";

const AUTO_MS = 6000;

type PromoSlide = {
  id: string;
  heading: string;
  description: string;
  ctaLabel: string;
  href: string;
  image: { src: string; width: number; height: number };
  bgClassName: string;
  /** Positions/scales the image within its panel — most slides sit fully
   * inset and contained; cardsbanner.png reads better scaled up and bled
   * off the bottom/right edge (cropped by the carousel's own overflow-hidden,
   * per the reference). */
  imagePanelClassName: string;
  imageClassName: string;
};

/**
 * Slide 2 reuses the exact asset the live Refer & Earn hero uses
 * (REFERRAL_HERO_BANNER) — reusing that constant rather than a second
 * hardcoded path keeps this slide's image in sync with that page's own,
 * should it ever change.
 */
const SLIDES: PromoSlide[] = [
  {
    id: "expand-globally",
    heading: "Expand your business globally",
    description:
      "Accept international payments via cards, Apple Pay & Google Pay — all in one place.",
    ctaLabel: "Learn more",
    href: "/multi-currency",
    image: { src: "/assets/cardsbanner.png", width: 1254, height: 1254 },
    bgClassName:
      "bg-gradient-to-r from-primary-light/70 via-primary-light/25 to-transparent dark:from-primary/[0.18] dark:via-primary/[0.07] dark:to-transparent",
    imagePanelClassName: "-inset-y-10 -right-6",
    imageClassName: "-translate-x-10 object-contain object-right-bottom sm:-translate-x-16",
  },
  {
    id: "refer-and-earn",
    heading: "Refer and Earn",
    description:
      "Share PayGlocal with your friends and get rewarded with $30 when they complete a transaction.",
    ctaLabel: "Learn more",
    href: "/refer-and-earn",
    image: {
      src: REFERRAL_HERO_BANNER.src,
      width: REFERRAL_HERO_BANNER.width,
      height: REFERRAL_HERO_BANNER.height,
    },
    bgClassName: "bg-card",
    imagePanelClassName: "inset-y-0 right-0",
    imageClassName: "object-contain object-right p-1 sm:p-2",
  },
];

/**
 * Edge-to-edge promo carousel, sitting above the "Good afternoon" greeting.
 * Both slides share one fixed-height track (h-[park] below) rather than each
 * sizing to its own content, which is what keeps the slide transition from
 * jumping — a flex row's children would otherwise stretch to whichever
 * slide's copy happens to be tallest.
 */
export function McaPromoCarousel() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const indexRef = useRef(0);

  const goTo = useCallback((i: number) => {
    const next = ((i % SLIDES.length) + SLIDES.length) % SLIDES.length;
    indexRef.current = next;
    setIndex(next);
  }, []);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      goTo(indexRef.current + 1);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, goTo]);

  return (
    <div
      className="relative isolate h-40 overflow-hidden rounded-2xl border border-border/70 sm:h-47.5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setPaused(false);
      }}
    >
      <div
        className="flex h-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {SLIDES.map((slide) => (
          <div key={slide.id} className={cn("relative h-full w-full shrink-0", slide.bgClassName)}>
            <div className="relative z-10 flex h-full w-1/2 flex-col justify-center gap-2 px-6 py-5 sm:gap-2.5 sm:px-10">
              <h2 className="text-base font-bold leading-snug tracking-tight text-foreground sm:text-xl">
                {slide.heading}
              </h2>
              <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground sm:text-[13px]">
                {slide.description}
              </p>
              <div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  rightIcon={<Icon name="chevron-right" className="h-3.5 w-3.5" aria-hidden />}
                  onClick={() => router.push(slide.href)}
                >
                  {slide.ctaLabel}
                </Button>
              </div>
            </div>
            <div className={cn("pointer-events-none absolute w-1/2", slide.imagePanelClassName)}>
              <AppImage
                src={slide.image.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 700px, 340px"
                className={slide.imageClassName}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
        {SLIDES.map((slide, i) => (
          <Button
            key={slide.id}
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Go to slide ${i + 1} of ${SLIDES.length}`}
            aria-current={i === index}
            onClick={() => goTo(i)}
            className={cn(
              "h-1.5 min-h-0 w-1.5 rounded-full p-0 transition-all hover:bg-foreground/35",
              i === index ? "w-5 bg-primary hover:bg-primary" : "bg-foreground/20"
            )}
          />
        ))}
      </div>
    </div>
  );
}
