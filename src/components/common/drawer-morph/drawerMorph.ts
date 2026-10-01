import type { CSSProperties } from "react";

/**
 * Expand / Collapse between a details drawer and its full page, run on the
 * drawer itself rather than on a second surface, so there is only ever one
 * panel moving. Used by any flux `Drawer` whose page renders in place inside
 * the dashboard's content area (see useDrawerMorph).
 *
 *   Expand:   growing     the drawer stays full height and its left edge sweeps
 *                         to the content area's; the content reflows live and
 *                         switches to the page's layout halfway, while the
 *                         body's padding eases the content onto the exact box
 *                         the page's content will occupy
 *             landing     the page mounts underneath, scrolled to match
 *             aligning    (only if needed) the drawer glides out any offset
 *                         left between its content and the page's
 *             fading-out  the drawer fades off; content sits on content, so
 *                         only the chrome row visibly changes
 *   Collapse: fading-in   the drawer fades in over the page, aligned to it
 *             shrinking   the list mounts underneath; the drawer shrinks back
 *                         to its own width, reflowing to its own layout halfway
 *
 * The drawer marks four elements for measuring: `data-morph-panel` (set by
 * useDrawerMorphTarget), `data-morph-header` (its top row), `data-morph-body`
 * (the scrolling region) and `data-morph-anchor` (the root of its content). The page marks its content root `data-morph-anchor`.
 */
export type DrawerMorphPhase =
  "idle" | "growing" | "landing" | "aligning" | "fading-out" | "fading-in" | "shrinking";

export interface DrawerMorphGeometry {
  /** Content area's horizontal span, as viewport offsets. */
  right: number;
  width: number;
  /** The drawer's own resting width. */
  drawerWidth: number;
  /** Body padding at rest (the drawer's classes) and grown (the page's box). */
  restPaddingTop: number;
  restPaddingX: number;
  bodyPaddingTop: number;
  bodyPaddingX: number;
  /** Scroll offset carried between the drawer body and the content area. */
  scrollTop: number;
}

export interface DrawerMorph {
  phase: DrawerMorphPhase;
  geometry: DrawerMorphGeometry | null;
}

export const IDLE_MORPH: DrawerMorph = { phase: "idle", geometry: null };

const RESIZE_MS = 420;
const ALIGN_MS = 200;
const FADE_MS = 180;
// Fast start, long settle: reads as the panel being pulled open rather than
// sliding at constant speed.
const RESIZE_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

// The drawer's panel, marked by useDrawerMorphTarget. Never "[role=dialog]":
// other dialogs (the guide tour, dev overlays) can sit earlier in the DOM.
const PANEL = "[data-morph-panel]";
const ANCHOR = "[data-morph-anchor]";

/**
 * What one drawer last measured, kept for the moments its subject isn't on
 * screen: the drawer before Collapse reopens it, the page before Expand mounts
 * it. Keyed per drawer, since each has its own width, header and page.
 */
interface MorphMemory {
  drawerWidth: number;
  headerHeight: number;
  restPaddingTop: number;
  restPaddingX: number;
  borderLeft: number;
  /** The page content's top inside the content area's scroll box. */
  pageAnchorOffset: number;
}

const memories = new Map<string, MorphMemory>();

function memoryFor(id: string, pageAnchorOffset: number): MorphMemory {
  let memory = memories.get(id);
  if (!memory) {
    memory = {
      drawerWidth: 512,
      headerHeight: 57,
      restPaddingTop: 24,
      restPaddingX: 24,
      borderLeft: 1,
      pageAnchorOffset,
    };
    memories.set(id, memory);
  }
  return memory;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Where the panel should land, measured at click time so a collapsed sidebar
 * or an open Echo panel is accounted for. `from` is the view being left.
 * `defaultPageAnchorOffset` is the first-ever guess at where the page's content
 * starts in the content area; after one landing the real value is remembered.
 * Null when there is nothing to animate (reduced motion, or a viewport where
 * the drawer already spans the content area): the caller swaps instantly.
 */
export function measureDrawerMorph(
  id: string,
  contentEl: HTMLElement | null,
  from: "drawer" | "page",
  defaultPageAnchorOffset: number
): DrawerMorphGeometry | null {
  if (!contentEl || prefersReducedMotion()) return null;
  const memory = memoryFor(id, defaultPageAnchorOffset);
  const rect = contentEl.getBoundingClientRect();

  let scrollTop = 0;
  if (from === "drawer") {
    const panel = document.querySelector<HTMLElement>(PANEL);
    const header = panel?.querySelector<HTMLElement>("[data-morph-header]");
    const body = panel?.querySelector<HTMLElement>("[data-morph-body]");
    if (panel) {
      memory.drawerWidth = panel.offsetWidth;
      memory.borderLeft = panel.clientLeft;
    }
    if (header) memory.headerHeight = header.offsetHeight;
    if (body) {
      const style = getComputedStyle(body);
      memory.restPaddingTop = parseFloat(style.paddingTop) || 0;
      memory.restPaddingX = parseFloat(style.paddingLeft) || 0;
      scrollTop = body.scrollTop;
    }
  } else {
    scrollTop = contentEl.scrollTop;
    const anchor = contentEl.querySelector<HTMLElement>(ANCHOR);
    if (anchor) {
      memory.pageAnchorOffset = anchor.getBoundingClientRect().top - rect.top + scrollTop;
    }
  }

  const width = rect.right - rect.left;
  if (width - memory.drawerWidth < 1) return null;

  // The page's inset from the content area's edge: the layout's own p-4/md:p-6.
  const pageInset = contentEl.firstElementChild
    ? parseFloat(getComputedStyle(contentEl.firstElementChild).paddingLeft) || 0
    : 0;

  return {
    right: window.innerWidth - rect.right,
    // Reaches past the content area's edge by the panel's border-l, so its
    // content, not its border, lines up with the page's.
    width: width + memory.borderLeft,
    drawerWidth: memory.drawerWidth,
    restPaddingTop: memory.restPaddingTop,
    restPaddingX: memory.restPaddingX,
    bodyPaddingTop: rect.top + memory.pageAnchorOffset - memory.headerHeight,
    bodyPaddingX: pageInset,
    scrollTop,
  };
}

/**
 * How far the page's content sits below the drawer's, once the page has
 * mounted under it. Also refreshes the remembered page offset, so the next
 * Expand predicts it exactly and lands with nothing to correct.
 */
export function measureAnchorDelta(id: string, contentEl: HTMLElement | null): number | null {
  const pageAnchor = contentEl?.querySelector<HTMLElement>(ANCHOR);
  const drawerAnchor = document.querySelector<HTMLElement>(`${PANEL} ${ANCHOR}`);
  const memory = memories.get(id);
  if (!contentEl || !pageAnchor || !drawerAnchor || !memory) return null;
  const mainTop = contentEl.getBoundingClientRect().top;
  const pageTop = pageAnchor.getBoundingClientRect().top;
  memory.pageAnchorOffset = pageTop - mainTop + contentEl.scrollTop;
  return pageTop - drawerAnchor.getBoundingClientRect().top;
}

function isGrown(phase: DrawerMorphPhase): boolean {
  return phase !== "idle" && phase !== "shrinking";
}

/** True for every phase of a morph, for hiding the drawer's own controls. */
export function isMorphing({ phase, geometry }: DrawerMorph): boolean {
  return phase !== "idle" && geometry !== null;
}

/** Inline style for the drawer panel while a morph is in progress. */
export function drawerMorphStyle({ phase, geometry }: DrawerMorph): CSSProperties | undefined {
  if (phase === "idle" || !geometry) return undefined;
  const grown = isGrown(phase);
  return {
    maxWidth: "none",
    right: grown ? geometry.right : 0,
    width: grown ? geometry.width : geometry.drawerWidth,
    transitionProperty: "right, width",
    transitionDuration: `${RESIZE_MS}ms`,
    transitionTimingFunction: RESIZE_EASE,
    // Open/close become a plain fade: the panel is already where it needs to
    // be, so the default slide in/out from the right edge would be a second,
    // competing motion.
    ...((phase === "fading-in" || phase === "fading-out") && {
      animationDuration: `${FADE_MS}ms`,
      animationTimingFunction: "ease-out",
      "--tw-enter-translate-x": "0px",
      "--tw-exit-translate-x": "0px",
      "--tw-enter-opacity": "0",
      "--tw-exit-opacity": "0",
    }),
  } as CSSProperties;
}

/** Inline style for the drawer's scrolling body while a morph is in progress. */
export function drawerMorphBodyStyle({ phase, geometry }: DrawerMorph): CSSProperties | undefined {
  if (phase === "idle" || !geometry) return undefined;
  const grown = isGrown(phase);
  const padX = grown ? geometry.bodyPaddingX : geometry.restPaddingX;
  const duration = phase === "aligning" ? ALIGN_MS : RESIZE_MS;
  return {
    paddingTop: grown ? geometry.bodyPaddingTop : geometry.restPaddingTop,
    paddingLeft: padX,
    paddingRight: padX,
    transitionProperty: "padding-top, padding-left, padding-right",
    transitionDuration: `${duration}ms`,
    transitionTimingFunction: RESIZE_EASE,
  };
}

/**
 * Whether the drawer's content should use the page's layout. At rest, no.
 * Mid-motion it switches once the panel is halfway between its two widths,
 * which is the one reflow the merchant sees; whenever the panel is at full
 * size it matches the page exactly.
 */
export function usesPageLayout({ phase, geometry }: DrawerMorph, panelWidth: number): boolean {
  if (phase === "idle" || !geometry) return false;
  if (phase === "growing" || phase === "shrinking") {
    return panelWidth >= (geometry.drawerWidth + geometry.width) / 2;
  }
  return true;
}

/** Sets an element's scroll offset; a function so callers don't mutate a
 *  hook-held element inline, which the React Compiler lint rejects. */
export function setScrollTop(el: HTMLElement, value: number): void {
  el.scrollTop = value;
}
