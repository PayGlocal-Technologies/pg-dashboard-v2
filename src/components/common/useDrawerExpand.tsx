"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
import {
  DrawerExpandMorph,
  drawerRect,
  elementRect,
  type DrawerMorph,
} from "@/components/common/DrawerExpandMorph";

// Sets scrollTop via a standalone function since the element comes from
// useContentAreaElement, and React Compiler's lint forbids mutating a
// hook-returned value directly.
function setScrollTop(el: HTMLElement, value: number): void {
  el.scrollTop = value;
}

interface UseDrawerExpandOptions<T> {
  /** The drawer's width, so the hand-off starts and ends exactly on it. */
  drawerWidthPx: number;
  /** Where the full page's top lands: the slot itself ("slot"), or the slot's
   *  parent ("parent") when the page also hides a header that sits above the
   *  slot, so the page takes that space too. */
  measureFrom?: "slot" | "parent";
  /** Told when the full page opens and closes, e.g. to hide a page header. */
  onPageOpenChange?: (open: boolean) => void;
  /** A record to open the drawer on at mount, e.g. one handed back in the
   *  URL by a detail route's Collapse. Read once. */
  initialRecord?: T | null;
}

/**
 * The drawer → full page → drawer flow every details drawer shares: a row
 * opens the drawer, Expand widens it into a page that replaces the list in
 * place, and Collapse / Back return, with the list's scroll position kept.
 * The record is held as the object itself, not an id to look up again, so a
 * refetch or a filter change can't blank it.
 *
 * Render the list and the page inside `slotRef` (one or the other, by
 * `pageOpen`), pass `drawerOpen` / `onDrawerOpenChange` / `instantDrawer` /
 * `expand` to the drawer, and render `morphLayer(...)` once alongside it.
 */
export function useDrawerExpand<T>({
  drawerWidthPx,
  measureFrom = "slot",
  onPageOpenChange,
  initialRecord = null,
}: UseDrawerExpandOptions<T>) {
  const contentEl = useContentAreaElement();
  const reduceMotion = useReducedMotion();
  const slotRef = useRef<HTMLDivElement>(null);
  const [record, setRecord] = useState<T | null>(initialRecord);
  const [drawerOpen, setDrawerOpen] = useState(initialRecord !== null);
  const [pageOpen, setPageOpen] = useState(false);
  // The drawer <-> page hand-off in flight, if any.
  const [morph, setMorph] = useState<DrawerMorph | null>(null);
  // The drawer skips its own slide while the hand-off covers it, and keeps
  // skipping it until the merchant next closes it themselves.
  const [instantDrawer, setInstantDrawer] = useState(false);
  // Where the list was scrolled when it left the screen, for Back/Collapse.
  const [scrollPosition, setScrollPosition] = useState(0);

  const open = (row: T) => {
    setRecord(row);
    setInstantDrawer(false);
    setDrawerOpen(true);
  };

  const onDrawerOpenChange = (next: boolean) => {
    if (!next) setInstantDrawer(false);
    setDrawerOpen(next);
  };

  const showPage = () => {
    setPageOpen(true);
    onPageOpenChange?.(true);
    if (contentEl) setScrollTop(contentEl, 0);
  };

  const hidePage = () => {
    setPageOpen(false);
    onPageOpenChange?.(false);
  };

  const expand = () => {
    if (contentEl) setScrollPosition(contentEl.scrollTop);
    if (reduceMotion) {
      setDrawerOpen(false);
      showPage();
      return;
    }
    // Where the page will lay out once the content area is scrolled to the
    // top: the slot's left and width, and the top of the slot (or its
    // parent, see measureFrom).
    const slot = elementRect(slotRef.current);
    const anchorTop =
      measureFrom === "parent"
        ? (slotRef.current?.parentElement?.getBoundingClientRect().top ?? slot.top)
        : slot.top;
    setInstantDrawer(true);
    setMorph({
      kind: "expand",
      from: drawerRect(drawerWidthPx),
      to: elementRect(contentEl),
      page: {
        top: anchorTop + (contentEl ? contentEl.scrollTop : window.scrollY),
        left: slot.left,
        width: slot.width,
      },
    });
    setDrawerOpen(false);
  };

  const collapse = () => {
    if (reduceMotion) {
      hidePage();
      setDrawerOpen(true);
      return;
    }
    const slot = elementRect(slotRef.current);
    setInstantDrawer(true);
    setMorph({
      kind: "collapse",
      from: elementRect(contentEl),
      to: drawerRect(drawerWidthPx),
      page: { top: slot.top, left: slot.left, width: slot.width },
    });
  };

  const back = () => {
    hidePage();
    setRecord(null);
  };

  // Puts the list back where it was once it has re-rendered in the page's
  // place: an effect, so it runs after the rows are back in the DOM.
  useEffect(() => {
    if (!pageOpen && contentEl) setScrollTop(contentEl, scrollPosition);
  }, [pageOpen, contentEl, scrollPosition]);

  /** The hand-off layer, while one is running. `render` returns the drawer's
   *  and the page's real insides for `record`, with inert handlers: the layer
   *  shows exactly what each view does, but takes no input. */
  const morphLayer = (render: (row: T) => { drawer: ReactNode; page: ReactNode }) => {
    if (!morph || !record) return null;
    const { drawer, page } = render(record);
    return (
      <DrawerExpandMorph
        key={morph.kind}
        morph={morph}
        drawerWidthPx={drawerWidthPx}
        drawerContent={drawer}
        pageContent={page}
        onCovered={hidePage}
        onArrive={morph.kind === "expand" ? showPage : () => setDrawerOpen(true)}
        onDone={() => setMorph(null)}
      />
    );
  };

  return {
    record,
    setRecord,
    drawerOpen,
    pageOpen,
    instantDrawer,
    slotRef,
    open,
    onDrawerOpenChange,
    expand,
    collapse,
    back,
    morphLayer,
  };
}
