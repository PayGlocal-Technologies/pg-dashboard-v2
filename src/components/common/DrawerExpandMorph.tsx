"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { animate, motion, useMotionTemplate, useMotionValue } from "framer-motion";

export interface MorphRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface DrawerMorph {
  kind: "expand" | "collapse";
  /** Where the panel starts and ends: the drawer's rect and the page area's. */
  from: MorphRect;
  to: MorphRect;
  /** Where the full page lays out on screen (its top-left and width), so the
   *  copy carried by the panel sits exactly where the real page is or will
   *  be. */
  page: { top: number; left: number; width: number };
}

/** An even ease-in-out: a steady horizontal glide, no jump at the start. */
const EASE = [0.4, 0, 0.2, 1] as const;
const MOVE = 0.48;
/** The small vertical step between the drawer (full height) and the page
 *  area (below the header), kept short and off the main sweep so the motion
 *  reads as horizontal rather than diagonal. */
const VERTICAL = 0.16;
/** The drawer overlay's own fade (flux-ui's animate-in/out default). */
const OVERLAY_FADE = 0.15;
/** How long the layer holds after landing, over the now-identical real view,
 *  so the drawer's own overlay has fully faded in before it goes. */
const SETTLE_MS = 180;

/** A right-side drawer of `widthPx` (capped at 92% of the viewport, as the
 *  drawers' own sm:max-w-[92vw]), flush right and full height. */
export function drawerRect(widthPx: number): MorphRect {
  const width = Math.min(widthPx, window.innerWidth * 0.92);
  return { top: 0, left: window.innerWidth - width, width, height: window.innerHeight };
}

export function elementRect(el: HTMLElement | null): MorphRect {
  if (!el) return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

/** A rect as clip-path insets on a full-viewport layer. */
function insets(r: MorphRect) {
  return {
    top: r.top,
    right: Math.max(0, window.innerWidth - (r.left + r.width)),
    bottom: Math.max(0, window.innerHeight - (r.top + r.height)),
    left: r.left,
  };
}

type Stage = "prep" | "move" | "settle";

/**
 * The drawer ⇄ full-page hand-off. A full-viewport layer, clipped to exactly
 * the drawer's rect, opens out to the page area (expand) or closes back down
 * to it (collapse). It carries both views at their real on-screen positions:
 * the drawer's content where the drawer sits, and the page where the page
 * lays out. Neither moves; the opening clip reveals one as the other fades,
 * so it reads as the drawer itself opening into the page, with no blank
 * surface at any point.
 *
 * The real drawer opens or closes instantly underneath (the caller sets it to
 * skip its slide) and the real page swaps in or out under the layer, which
 * looks identical at that moment; the layer then fades off.
 *
 * Callbacks: `onCovered` (collapse: the layer now shows the page, so the real
 * one can go), `onArrive` (swap in what's underneath: the page, or the real
 * drawer), `onDone` (remove the layer). Portalled to <body>, since page
 * wrappers animate with transforms that would otherwise anchor `fixed` to
 * them.
 */
export function DrawerExpandMorph({
  morph,
  drawerWidthPx,
  drawerContent,
  pageContent,
  onCovered,
  onArrive,
  onDone,
}: {
  morph: DrawerMorph;
  drawerWidthPx: number;
  drawerContent: ReactNode;
  pageContent: ReactNode;
  onCovered?: () => void;
  onArrive: () => void;
  onDone: () => void;
}) {
  const expanding = morph.kind === "expand";
  const [stage, setStage] = useState<Stage>(expanding ? "move" : "prep");
  const drawer = expanding ? morph.from : morph.to;
  const drawerWidth = Math.min(drawerWidthPx, drawer.width);

  // Collapse: the layer's first frame already shows the page exactly as it
  // is, so the real page leaves on the next frame and the list renders back
  // in underneath. That render is heavy (table, header, charts), so the sweep
  // waits for it to finish rather than stuttering through it.
  useEffect(() => {
    if (expanding) return;
    let id = requestAnimationFrame(() => {
      onCovered?.();
      id = requestAnimationFrame(() => {
        id = requestAnimationFrame(() => setStage("move"));
      });
    });
    return () => cancelAnimationFrame(id);
    // Runs once per morph; the callbacks are stable for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Each edge on its own timing: the left and right sweep across for the whole
  // move, while the top and bottom make their small step quickly, at the
  // start of an expand (leaving the drawer's full height) or the end of a
  // collapse (reaching it). Animated together as one clip they would drift
  // diagonally.
  const [start] = useState(() => insets(morph.from));
  const top = useMotionValue(start.top);
  const right = useMotionValue(start.right);
  const bottom = useMotionValue(start.bottom);
  const left = useMotionValue(start.left);
  const clipPath = useMotionTemplate`inset(${top}px ${right}px ${bottom}px ${left}px)`;

  useEffect(() => {
    if (stage !== "move") return;
    const end = insets(morph.to);
    const sweep = { duration: MOVE, ease: EASE };
    const step = expanding
      ? { duration: VERTICAL, ease: "easeOut" as const }
      : { duration: VERTICAL, delay: MOVE - VERTICAL, ease: "easeIn" as const };
    const controls = [
      animate(left, end.left, sweep),
      animate(right, end.right, sweep),
      animate(top, end.top, step),
      animate(bottom, end.bottom, step),
    ];
    let cancelled = false;
    void Promise.all(controls.map((c) => c.then(() => undefined))).then(() => {
      if (cancelled) return;
      onArrive();
      setStage("settle");
    });
    return () => {
      cancelled = true;
      controls.forEach((c) => c.stop());
    };
    // Runs once, when the move starts; the callbacks are stable for the
    // morph's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage === "move"]);

  // Landed: the real view is underneath and looks the same, so once the
  // drawer overlay has settled the layer simply goes, in one frame. Fading
  // it instead would show the dim behind it through the drawer.
  useEffect(() => {
    if (stage !== "settle") return;
    const id = window.setTimeout(onDone, SETTLE_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  return createPortal(
    <>
      {/* The dim behind the drawer, crossfaded against the drawer's own
          overlay at either end so the two never stack into a dark flash.
          No backdrop blur (unlike that overlay): a full-screen blur under a
          moving clip costs frames, and the dim alone reads the same. */}
      <motion.div
        aria-hidden
        className="fixed inset-0 z-[60] bg-black/50"
        initial={{ opacity: 0 }}
        // Expand: in as the drawer's overlay fades out, then off as the page
        // covers the screen. Collapse: in as the list is uncovered, then out
        // exactly as the drawer's overlay fades in beneath it.
        animate={{
          opacity: expanding ? [0, 1, 1, 0] : stage === "move" ? 1 : 0,
        }}
        transition={
          expanding
            ? { duration: MOVE, times: [0, OVERLAY_FADE / MOVE, 0.45, 1], ease: "easeOut" }
            : stage === "settle"
              ? { duration: OVERLAY_FADE * 0.85, ease: "easeIn" }
              : { duration: MOVE * 0.6, ease: "easeOut" }
        }
      />
      <motion.div
        aria-hidden
        inert
        className="fixed inset-0 z-[61] overflow-hidden bg-background will-change-[clip-path]"
        style={{ clipPath }}
      >
        {/* The page, where it lays out, fading in as the clip opens (or out
            as it closes). */}
        <motion.div
          className="absolute"
          style={{ top: morph.page.top, left: morph.page.left, width: morph.page.width }}
          initial={{ opacity: expanding ? 0 : 1 }}
          animate={{ opacity: expanding || stage === "prep" ? 1 : 0 }}
          // Overlapped with the drawer's fade, so there is never a moment
          // showing neither.
          transition={
            expanding
              ? { duration: MOVE * 0.5, ease: "easeOut" }
              : { duration: MOVE * 0.55, ease: "easeIn" }
          }
        >
          {pageContent}
        </motion.div>
        {/* The drawer's content, where the drawer sits. */}
        <motion.div
          className="absolute flex flex-col border-l border-border bg-card"
          style={{ top: drawer.top, left: drawer.left, width: drawerWidth, height: drawer.height }}
          initial={{ opacity: expanding ? 1 : 0 }}
          animate={{ opacity: expanding ? 0 : stage === "prep" ? 0 : 1 }}
          transition={
            expanding
              ? { duration: MOVE * 0.45, ease: "easeIn" }
              : { duration: MOVE * 0.45, delay: MOVE * 0.2, ease: "easeOut" }
          }
        >
          {drawerContent}
        </motion.div>
      </motion.div>
    </>,
    document.body
  );
}
