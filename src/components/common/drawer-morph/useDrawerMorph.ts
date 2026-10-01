"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  type AnimationEvent,
  type TransitionEvent,
} from "react";
import {
  IDLE_MORPH,
  drawerMorphBodyStyle,
  drawerMorphStyle,
  isMorphing,
  measureAnchorDelta,
  measureDrawerMorph,
  setScrollTop,
  usesPageLayout,
  type DrawerMorph,
} from "@/components/common/drawer-morph/drawerMorph";

export type DrawerMorphStep = "resized" | "shown" | "aligned";

/**
 * Runs the drawer ↔ page morph (phases in drawerMorph.ts) for a list view that
 * owns both: the caller says how to mount the page or the list in flow
 * (`showPage`) and how to open or close the drawer; this decides when.
 *
 * Every in-flow swap happens while the drawer fully covers the content area,
 * so the list and page never visibly trade places.
 *
 * `id` keys what is remembered between morphs (see drawerMorph.ts);
 * `pageAnchorOffset` is the first-ever guess at where the page's content
 * starts inside the content area, corrected after the first landing.
 */
export function useDrawerMorph({
  id,
  pageAnchorOffset,
  contentEl,
  showPage,
  setDrawerOpen,
}: {
  id: string;
  pageAnchorOffset: number;
  contentEl: HTMLElement | null;
  showPage: (open: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
}) {
  const [morph, setMorph] = useState<DrawerMorph>(IDLE_MORPH);

  /** Starts Expand. False when it can't animate; the caller swaps instantly. */
  const expand = (): boolean => {
    const geometry = measureDrawerMorph(id, contentEl, "drawer", pageAnchorOffset);
    if (!geometry) return false;
    setMorph({ phase: "growing", geometry });
    return true;
  };

  /** Starts Collapse. False when it can't animate; the caller swaps instantly. */
  const collapse = (): boolean => {
    const geometry = measureDrawerMorph(id, contentEl, "page", pageAnchorOffset);
    if (!geometry) return false;
    setMorph({ phase: "fading-in", geometry });
    setDrawerOpen(true);
    return true;
  };

  const reset = () => setMorph(IDLE_MORPH);

  const onMorphStep = (step: DrawerMorphStep) => {
    if (step === "resized" && morph.phase === "growing") {
      showPage(true);
      setMorph((m) => ({ ...m, phase: "landing" }));
    } else if (step === "aligned" && morph.phase === "aligning") {
      setMorph((m) => ({ ...m, phase: "fading-out" }));
      setDrawerOpen(false);
    } else if (step === "shown" && morph.phase === "fading-in") {
      showPage(false);
      // A frame for the list to commit under the drawer before it shrinks,
      // so its first render doesn't land on the shrink's opening frames.
      requestAnimationFrame(() => setMorph((m) => ({ ...m, phase: "shrinking" })));
    } else if (step === "resized" && morph.phase === "shrinking") {
      setMorph(IDLE_MORPH);
    }
  };

  // Closing while the panel is grown (Esc, the overlay, Close) leaves as a
  // plain fade in place, not a snap back to drawer size and a slide.
  const onDrawerOpenChange = (open: boolean) => {
    if (!open && ["growing", "landing", "aligning", "fading-in"].includes(morph.phase)) {
      setMorph((m) => ({ ...m, phase: "fading-out" }));
    }
    setDrawerOpen(open);
  };

  // Landing: the page has just mounted under the drawer. Match its scroll to
  // the drawer's, then measure how far apart the two copies of the content
  // still are: usually nothing (the drawer predicted the page's row), so the
  // drawer fades straight off; otherwise it glides the difference first. In a
  // rAF so layout has settled; setState only inside it.
  useEffect(() => {
    if (morph.phase !== "landing") return;
    const frame = requestAnimationFrame(() => {
      if (contentEl) setScrollTop(contentEl, morph.geometry?.scrollTop ?? 0);
      const delta = measureAnchorDelta(id, contentEl);
      if (delta !== null && Math.abs(delta) > 1) {
        setMorph((m) =>
          m.geometry
            ? {
                phase: "aligning",
                geometry: { ...m.geometry, bodyPaddingTop: m.geometry.bodyPaddingTop + delta },
              }
            : m
        );
        return;
      }
      setMorph((m) => ({ ...m, phase: "fading-out" }));
      setDrawerOpen(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [id, morph.phase, morph.geometry, contentEl, setDrawerOpen]);

  // The drawer's overlay would dim and blur the sidebar and header for the
  // whole morph. Flux renders it with no className hook, so globals.css drives
  // it from this root attribute: "clear" eases it away (Expand, and Collapse's
  // fade-in), "dim" eases it back as the panel shrinks into an ordinary
  // drawer, so idle starts from exactly what the drawer shows.
  useEffect(() => {
    const root = document.documentElement;
    if (morph.phase === "idle") delete root.dataset.drawerMorph;
    else root.dataset.drawerMorph = morph.phase === "shrinking" ? "dim" : "clear";
  }, [morph.phase]);
  useEffect(() => () => void delete document.documentElement.dataset.drawerMorph, []);

  return { morph, expand, collapse, reset, onMorphStep, onDrawerOpenChange };
}

/**
 * The drawer's half of the morph: spread `panelProps` on its DrawerContent,
 * `bodyProps` on its scrolling body, and render the page's layout while
 * `pageLayout` is true. `morphing` is true for the whole morph, for hiding
 * the drawer's own controls.
 */
export function useDrawerMorphTarget(
  morph: DrawerMorph,
  open: boolean,
  onMorphStep?: (step: DrawerMorphStep) => void
) {
  // The scrolling body, as state rather than a ref: it lives in a portal that
  // mounts after `open` flips, and the observer below must re-attach to it.
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  // The panel's current width, tracked through the morph so the content can
  // switch layouts at its halfway point (see usesPageLayout).
  const [panelWidth, setPanelWidth] = useState(0);
  useEffect(() => {
    if (!bodyEl) return;
    const observer = new ResizeObserver(() => setPanelWidth(bodyEl.offsetWidth));
    observer.observe(bodyEl);
    return () => observer.disconnect();
  }, [bodyEl]);

  // Collapse opens the drawer over the page at the page's scroll offset, so
  // its content sits exactly on the page's before the page goes away.
  useLayoutEffect(() => {
    if (morph.phase === "fading-in" && bodyEl && morph.geometry) {
      setScrollTop(bodyEl, morph.geometry.scrollTop);
    }
  }, [morph.phase, morph.geometry, bodyEl]);

  return {
    morphing: isMorphing(morph),
    pageLayout: usesPageLayout(morph, panelWidth),
    panelProps: {
      "data-morph-panel": true,
      style: drawerMorphStyle(morph),
      // Both events bubble from the content inside (spinners, skeletons), so
      // only the panel's own count.
      onTransitionEnd: (e: TransitionEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && e.propertyName === "width") onMorphStep?.("resized");
      },
      onAnimationEnd: (e: AnimationEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && open) onMorphStep?.("shown");
      },
    },
    bodyProps: {
      ref: setBodyEl,
      "data-morph-body": true,
      style: drawerMorphBodyStyle(morph),
      onTransitionEnd: (e: TransitionEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && e.propertyName === "padding-top") {
          onMorphStep?.("aligned");
        }
      },
    },
  };
}
