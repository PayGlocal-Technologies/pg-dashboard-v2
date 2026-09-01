"use client";

/**
 * Spotlight — the shared visual shell for the guide system.
 *
 * Given the `data-guide` id of a target element, it dims the screen with a
 * single box-shadow cutout around that element and floats `children` (a card)
 * next to it, positioned by the flux Popover (Radix) via an invisible anchor
 * pinned to the target's rect, so collision-flipping is free.
 *
 * It owns nothing about tour flow — no steps, no storage. GuideTour and the
 * launcher's first-visit highlight both render their own card inside it.
 */
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui";

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface SpotlightProps {
  /** `data-guide` value of the element to highlight. */
  target: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  /** Called (once) if the target never renders after the retry window. */
  onMissing?: () => void;
  /** Adds a looping halo around the cutout to draw the eye (used by the
   *  first-visit launcher highlight so it isn't missed). */
  pulse?: boolean;
  /** Card content shown beside the spotlight. */
  children: ReactNode;
}

/** Padding (px) of the spotlight cutout around the highlighted element. */
const SPOTLIGHT_PAD = 8;

/** How long to wait for a not-yet-rendered target before giving up.
 *  ~6s (40 × 150ms) covers a screen still fetching its data on first paint. */
const MAX_TARGET_ATTEMPTS = 40;
const TARGET_RETRY_MS = 150;

export function Spotlight({ target, side, align, onMissing, pulse, children }: SpotlightProps) {
  const [rect, setRect] = useState<Rect | null>(null);

  // Measure the target, keep it in view, and track scroll/resize. Re-runs when
  // `target` changes (i.e. the tour advances to a new step).
  useEffect(() => {
    let raf = 0;
    let settle: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let measure: (() => void) | undefined;
    let attempts = 0;

    // A target id can appear more than once (mobile + desktop variants toggled
    // by `display:none`, or one per table row). Pick the first that is actually
    // rendered so the spotlight never lands on a zero-size ghost. Test by
    // measured size, NOT offsetParent — offsetParent is null for `position:
    // fixed` elements (e.g. the launcher button), which are perfectly visible;
    // a `display:none` ghost still measures 0×0 and is excluded either way.
    const isVisible = (c: HTMLElement) => {
      const r = c.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return false;
      return typeof c.checkVisibility === "function" ? c.checkVisibility() : true;
    };
    const findVisible = () =>
      Array.from(document.querySelectorAll<HTMLElement>(`[data-guide="${target}"]`)).find(
        isVisible
      ) ?? null;

    const attach = () => {
      const el = findVisible();

      // Target not on the DOM yet — the screen may still be fetching its data.
      // Poll a bounded number of times before giving up.
      if (!el) {
        attempts += 1;
        if (attempts > MAX_TARGET_ATTEMPTS) {
          if (onMissing) raf = requestAnimationFrame(onMissing);
          return;
        }
        retry = setTimeout(attach, TARGET_RETRY_MS);
        return;
      }

      measure = () => {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      };

      // Scroll BEFORE the first measure so the spotlight renders at the target's
      // final position — never at a pre-scroll spot it then chases. Skip the
      // scroll entirely when the target is already in view (most guide targets
      // are), and when a scroll is needed do it instantly (`auto`), not smooth:
      // a smooth scroll animates the page under the already-shown cutout, which
      // is exactly the "moves around before it finds it" the tour had.
      const r0 = el.getBoundingClientRect();
      const inView =
        r0.top >= 0 &&
        r0.left >= 0 &&
        r0.bottom <= window.innerHeight &&
        r0.right <= window.innerWidth;
      if (!inView) {
        el.scrollIntoView({ block: "center", inline: "nearest", behavior: "auto" });
      }
      raf = requestAnimationFrame(measure);
      settle = setTimeout(measure, 200); // one late remeasure in case layout settles
      window.addEventListener("resize", measure);
      window.addEventListener("scroll", measure, true);
    };

    attach();

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      clearTimeout(retry);
      if (measure) {
        window.removeEventListener("resize", measure);
        window.removeEventListener("scroll", measure, true);
      }
    };
    // onMissing intentionally omitted — a fresh closure each render would re-run
    // this effect every render; callers pass a stable-enough handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  // Hold everything back until measured — no card flashes before the spotlight
  // can point at anything.
  if (!rect || typeof document === "undefined") return null;

  const spot: Rect = {
    top: rect.top - SPOTLIGHT_PAD,
    left: rect.left - SPOTLIGHT_PAD,
    width: rect.width + SPOTLIGHT_PAD * 2,
    height: rect.height + SPOTLIGHT_PAD * 2,
  };

  return createPortal(
    <motion.div
      className="pointer-events-none fixed inset-0 z-[120]"
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Dim + spotlight cutout via a single oversized box-shadow. The dim's own
          colour cross-fades (via boxShadow in `animate`) while the cutout glides
          between targets, so advancing a step reads as one smooth move rather
          than a jump. */}
      <motion.div
        initial={false}
        animate={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
        transition={{ type: "tween", duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className="absolute rounded-xl ring-2 ring-primary/70"
        style={{ boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)" }}
      />

      {/* Attention halo — a soft ring that breathes around the cutout. */}
      {pulse && (
        <motion.div
          initial={false}
          animate={{
            top: spot.top - 6,
            left: spot.left - 6,
            width: spot.width + 12,
            height: spot.height + 12,
            opacity: [0.55, 0, 0.55],
            scale: [1, 1.08, 1],
          }}
          transition={{
            top: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
            left: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
            width: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
            height: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute rounded-2xl ring-4 ring-primary/60"
        />
      )}

      {/* Card, positioned by Radix relative to an invisible anchor at the rect. */}
      <Popover open>
        <PopoverAnchor asChild>
          <div
            className="pointer-events-none fixed"
            style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }}
            aria-hidden
          />
        </PopoverAnchor>
        <PopoverContent
          side={side ?? "bottom"}
          align={align ?? "center"}
          sideOffset={14}
          collisionPadding={16}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className="pointer-events-auto z-[121] w-[320px] rounded-2xl border border-border bg-background p-4 shadow-2xl"
        >
          {/* Ease the card in rather than letting it pop — matters most for the
              transaction drawer, where the tour appears over a just-settled
              panel. Runs once on mount; per-step copy has its own transition. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </PopoverContent>
      </Popover>
    </motion.div>,
    document.body
  );
}
