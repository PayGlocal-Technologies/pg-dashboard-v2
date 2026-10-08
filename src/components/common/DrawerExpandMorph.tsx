"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { animate, motion, useMotionTemplate, useMotionValue, useTransform } from "framer-motion";

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

/** Fast out, soft landing: the panel commits to the move straight away and
 *  settles gently into the page area, rather than gliding at an even pace. */
const EASE = [0.32, 0.72, 0, 1] as const;
const MOVE = 0.9;
/** The drawer overlay's own fade (flux-ui's animate-in/out default). */
const OVERLAY_FADE = 0.15;
/** How long the layer holds after landing, over the now-identical real view,
 *  while the band over the app header fades back to the real header. */
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

/** The left and right clip-path insets of a rect on a full-viewport layer.
 *  Top and bottom are always 0: the panel is the full viewport height for the
 *  whole move, so the drawer is never cut off at the top. */
function sideInsets(r: MorphRect) {
  return { left: r.left, right: Math.max(0, window.innerWidth - (r.left + r.width)) };
}

/** Offset of `el` inside `box`, measured on the same frame so whatever
 *  transform `box` currently carries cancels out. */
function offsetIn(el: HTMLElement, box: HTMLElement) {
  const e = el.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  return { left: e.left - b.left, top: e.top - b.top, width: e.width };
}

type Stage = "prep" | "move" | "settle";

/**
 * The drawer ⇄ full-page hand-off. The drawer itself widens into the page:
 * its left edge slides across to the page area's, full height the whole way,
 * and the drawer's content flows into the page's layout as it goes. Collapse
 * is the same motion in reverse.
 *
 * The flow. Each drawer body and page view marks matching spots with data
 * attributes, and the layer measures both at mount:
 * - `data-morph-anchor`: the content's top-left and width, in both views.
 *   The drawer's content is carried from its spot to the page's.
 * - `data-morph-column` (page, optional): the width the drawer's content
 *   widens to. Defaults to the page anchor's width.
 * - `data-morph-body` (both, optional): the part below the content's header,
 *   carried on its own to the page's (e.g. the page's main column), since the
 *   two views space and place it differently. It is shifted and sized through
 *   --morph-body-x / --morph-gap / --morph-body-w, which it must read, e.g.
 *   `style={{ translate: "var(--morph-body-x, 0px) var(--morph-gap, 0px)",
 *   width: "var(--morph-body-w, auto)" }}`. Unset outside the hand-off.
 * By the time the page lands on top, the two already line up, so it only
 * brings in what the drawer doesn't have. The drawer's top bar (close,
 * expand) has no place in the page: it fades over the first half.
 *
 * Built as one full-viewport layer clipped to the panel's rect, so the page
 * underneath never re-lays out per frame however heavy it is.
 *
 * The real drawer opens or closes instantly underneath (the caller sets it to
 * skip its slide, and its overlay to skip its fade, see .drawer-instant in
 * globals.css) and the real page swaps in or out under the layer, which looks
 * identical at that moment; the layer then goes.
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

  const [start] = useState(() => sideInsets(morph.from));
  const right = useMotionValue(start.right);
  const left = useMotionValue(start.left);
  const clipPath = useMotionTemplate`inset(0px ${right}px 0px ${left}px)`;

  // The page area's left edge (reached at the end of an expand, left at the
  // start of a collapse) and top, where the app header ends: the band a
  // full-height panel covers and then hands back to the real header.
  const areaLeft = expanding ? morph.to.left : morph.from.left;
  const areaTop = expanding ? morph.to.top : morph.from.top;
  const pageShift = useTransform(left, (l) => l - areaLeft);

  // Progress, 0 (drawer) to 1 (page), off the panel's left edge, so a
  // collapse plays the same flow backwards.
  const progress = useTransform(left, (l) =>
    areaLeft === drawer.left
      ? 1
      : Math.min(1, Math.max(0, (l - drawer.left) / (areaLeft - drawer.left)))
  );

  // The flow's distances, measured at mount (see the doc above). Motion
  // values rather than state: they are set before the first paint and only
  // ever read by the transforms below.
  const drawerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const flowX = useMotionValue(0);
  const flowY = useMotionValue(0);
  const flowW = useMotionValue(0);
  const bodyX = useMotionValue(0);
  const bodyY = useMotionValue(0);
  const bodyFrom = useMotionValue(0);
  const bodyTo = useMotionValue(0);

  const contentX = useTransform([progress, flowX], ([p, d]: number[]) => p * d);
  const contentY = useTransform([progress, flowY], ([p, d]: number[]) => p * d);
  const contentW = useTransform([progress, flowW], ([p, d]: number[]) => drawerWidth + p * d);
  const bodyShiftX = useTransform([progress, bodyX], ([p, d]: number[]) => `${p * d}px`);
  const bodyShiftY = useTransform([progress, bodyY], ([p, d]: number[]) => `${p * d}px`);
  const bodyWidth = useTransform([progress, bodyFrom, bodyTo], ([p, a, b]: number[]) =>
    b ? `${a + p * (b - a)}px` : "auto"
  );
  const headOpacity = useTransform(progress, (p) => Math.max(0, 1 - p * 2));

  useLayoutEffect(() => {
    const box = drawerRef.current;
    const pageBox = pageRef.current;
    if (!box || !pageBox) return;
    const from = box.querySelector<HTMLElement>("[data-morph-anchor]");
    const to = pageBox.querySelector<HTMLElement>("[data-morph-anchor]");
    if (!from || !to) {
      // Unmarked views: carry the drawer's content to the page's left edge.
      flowX.set(morph.page.left - drawer.left);
      return;
    }
    const f = offsetIn(from, box);
    const t = offsetIn(to, pageBox);
    const column = pageBox.querySelector<HTMLElement>("[data-morph-column]") ?? to;
    const dx = morph.page.left + t.left - (drawer.left + f.left);
    const dy = morph.page.top + t.top - (drawer.top + f.top);
    flowX.set(dx);
    flowY.set(dy);
    flowW.set(column.getBoundingClientRect().width - f.width);

    const fromBody = box.querySelector<HTMLElement>("[data-morph-body]");
    const toBody = pageBox.querySelector<HTMLElement>("[data-morph-body]");
    if (!fromBody || !toBody) return;
    const fb = offsetIn(fromBody, box);
    const tb = offsetIn(toBody, pageBox);
    // Where the body lands relative to the content around it, less what
    // the content's own move already covers.
    bodyX.set(morph.page.left + tb.left - (drawer.left + fb.left) - dx);
    bodyY.set(morph.page.top + tb.top - (drawer.top + fb.top) - dy);
    bodyFrom.set(fb.width);
    bodyTo.set(tb.width);
    // Measured once, at mount, before the first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (stage !== "move") return;
    const end = sideInsets(morph.to);
    const sweep = { duration: MOVE, ease: EASE };
    const controls = [animate(left, end.left, sweep), animate(right, end.right, sweep)];
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

  // Landed: the real view is underneath and looks the same, so once the band
  // over the header has handed back to the real one the layer simply goes,
  // in one frame.
  useEffect(() => {
    if (stage !== "settle") return;
    const id = window.setTimeout(onDone, SETTLE_MS);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  // The band over the app header and the drawer's content in it: solid while
  // the panel moves, faded on landing so the real header shows through (and
  // faded in first on a collapse, before the sweep starts).
  const bandFade = {
    initial: { opacity: expanding ? 1 : 0 },
    animate: { opacity: expanding ? (stage === "settle" ? 0 : 1) : stage === "prep" ? 0 : 1 },
    transition: expanding
      ? { duration: SETTLE_MS / 1000, ease: "easeOut" as const }
      : { duration: OVERLAY_FADE, ease: "easeOut" as const },
  };

  return createPortal(
    <>
      {/* The dim and blur behind the drawer, matching the drawer's own
          overlay so the background never sharpens mid-move. Expand: in as
          the drawer's overlay fades out, then off as the page covers the
          screen. Collapse: at full strength as soon as the sweep starts, and
          gone in the same render the real drawer opens, whose overlay arrives
          at full strength (.drawer-instant): a crossfade would leave both
          half-transparent for a moment, and the sharp page would show
          through. */}
      {!(!expanding && stage === "settle") && (
        <motion.div
          aria-hidden
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: expanding ? [0, 1, 1, 0] : stage === "move" ? 1 : 0 }}
          transition={
            expanding
              ? { duration: MOVE, times: [0, OVERLAY_FADE / MOVE, 0.45, 1], ease: "easeOut" }
              : { duration: OVERLAY_FADE, ease: "easeOut" }
          }
        />
      )}
      <motion.div
        aria-hidden
        inert
        className="fixed inset-0 z-[61] overflow-hidden will-change-[clip-path]"
        style={{ clipPath }}
      >
        {/* The page area's surface, below the header. */}
        <div className="absolute inset-x-0 bottom-0 bg-background" style={{ top: areaTop }} />
        <motion.div
          className="absolute inset-x-0 top-0 bg-background"
          style={{ height: areaTop }}
          {...bandFade}
        />
        {/* The drawer's content, never faded: it flows into the page's
            layout, only its top bar going. */}
        <motion.div
          ref={drawerRef}
          className="absolute flex flex-col bg-card will-change-transform [&>:first-child]:opacity-[var(--morph-head)]"
          style={{
            top: drawer.top,
            left: drawer.left,
            width: contentW,
            height: drawer.height,
            x: contentX,
            y: contentY,
            ["--morph-head" as string]: headOpacity,
            ["--morph-body-x" as string]: bodyShiftX,
            ["--morph-gap" as string]: bodyShiftY,
            ["--morph-body-w" as string]: bodyWidth,
          }}
          {...bandFade}
        >
          {drawerContent}
        </motion.div>
        {/* The page, on top on its own surface: it settles over the drawer's
            content in the last stretch of an expand, and lifts off it at the
            start of a collapse. */}
        <motion.div
          ref={pageRef}
          className="absolute bg-background will-change-transform"
          style={{
            top: morph.page.top,
            left: morph.page.left,
            width: morph.page.width,
            minHeight: Math.max(0, window.innerHeight - morph.page.top),
            x: pageShift,
          }}
          initial={{ opacity: expanding ? 0 : 1 }}
          animate={{ opacity: expanding || stage === "prep" ? 1 : 0 }}
          transition={
            expanding
              ? { duration: MOVE * 0.35, delay: MOVE * 0.65, ease: "easeOut" }
              : { duration: MOVE * 0.35, ease: "easeIn" }
          }
        >
          {pageContent}
        </motion.div>
      </motion.div>
      {/* The panel's moving edge: the drawer's border and shadow, carried
          across so the panel reads as one surface sliding, not a mask. */}
      <motion.div
        aria-hidden
        className="pointer-events-none fixed inset-y-0 z-[62] w-px bg-border shadow-[-12px_0_32px_rgba(15,23,42,0.12)]"
        style={{ left: 0, x: left }}
      />
    </>,
    document.body
  );
}
