"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { PartnerDealDrawerBody } from "@/features/dashboard/partner-deals/components/detail/PartnerDealDrawer";
import type { Deal } from "@/features/dashboard/partner-deals/types";

export interface MorphRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface DealMorph {
  kind: "expand" | "collapse";
  from: MorphRect;
  to: MorphRect;
}

/** A long, soft deceleration (ease-out-quint): quick to start, gentle to
 *  land, so the panel reads as one continuous move rather than a slide. */
const EASE = [0.22, 1, 0.36, 1] as const;
const MOVE = 0.52;
/** Collapse: how long the panel takes to fade in over the page before moving. */
const COVER = 0.14;
/** Expand: when the page starts showing through, as a share of MOVE. The
 *  reveal overlaps the end of the move instead of waiting for it. */
const REVEAL_AT = 0.55;
const REVEAL = 0.32;

/** The drawer's own width and place: flush right, full height, 32rem capped
 *  at 92% of the viewport (PartnerDealDrawer's sm:w-[32rem] sm:max-w-[92vw]). */
export function drawerRect(): MorphRect {
  const width = Math.min(512, window.innerWidth * 0.92);
  return { top: 0, left: window.innerWidth - width, width, height: window.innerHeight };
}

export function elementRect(el: HTMLElement | null): MorphRect {
  if (!el) return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

type Stage = "cover" | "move" | "reveal";

/**
 * The drawer-to-page hand-off as one surface. A card-coloured panel grows
 * leftward from exactly where the drawer is into the content area (expand),
 * or shrinks from the content area back into the drawer's place (collapse),
 * over a backdrop that matches the drawer's overlay and fades with it.
 *
 * The panel carries the drawer's real content (PartnerDealDrawerBody),
 * pinned to its right edge at the drawer's width, so nothing goes blank:
 *  - Expand: it starts identical to the drawer the user was looking at, the
 *    content eases out as the panel widens, and the page starts showing
 *    through before the panel lands (REVEAL_AT), so the two overlap.
 *  - Collapse: the panel first fades in over the page (cover), then the page
 *    goes and the panel shrinks while the drawer content fades in, landing
 *    exactly where the real drawer opens, so the final swap is invisible.
 *
 * `onCovered` (collapse) swaps the page out once it is hidden; `onArrive`
 * swaps in what is underneath at the end (the page, or the real drawer);
 * `onDone` removes the layer. Portalled to <body>, since the page wrapper
 * animates with a transform that would otherwise anchor `fixed` to it.
 */
export function DealMorphLayer({
  morph,
  deal,
  onCovered,
  onArrive,
  onDone,
}: {
  morph: DealMorph;
  deal: Deal;
  onCovered?: () => void;
  onArrive: () => void;
  onDone: () => void;
}) {
  const expanding = morph.kind === "expand";
  const [stage, setStage] = useState<Stage>(expanding ? "move" : "cover");
  const contentWidth = drawerRect().width;

  // Expand: start the reveal part-way through the move.
  useEffect(() => {
    if (!expanding) return;
    const id = window.setTimeout(
      () => {
        onArrive();
        setStage("reveal");
      },
      MOVE * REVEAL_AT * 1000
    );
    return () => window.clearTimeout(id);
    // Runs once per morph; the callbacks are stable for its lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const geometry = stage === "cover" ? morph.from : morph.to;
  const panelOpacity = stage === "reveal" ? 0 : 1;
  // Drawer content inside the panel: there at the start of an expand and
  // gone by the middle; arriving through the second half of a collapse.
  const contentOpacity = expanding ? 0 : stage === "cover" ? 0 : 1;

  return createPortal(
    <>
      <motion.div
        aria-hidden
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        initial={{ opacity: expanding ? 1 : 0 }}
        animate={{ opacity: expanding ? 0 : 1 }}
        transition={{ duration: expanding ? MOVE : COVER + MOVE, ease: EASE }}
      />
      <motion.div
        aria-hidden
        inert
        className="fixed z-[61] overflow-hidden border-l border-border bg-card shadow-xl"
        initial={{ ...morph.from, opacity: expanding ? 1 : 0 }}
        animate={{ ...geometry, opacity: panelOpacity }}
        transition={{
          top: { duration: MOVE, ease: EASE },
          left: { duration: MOVE, ease: EASE },
          width: { duration: MOVE, ease: EASE },
          height: { duration: MOVE, ease: EASE },
          opacity:
            stage === "cover"
              ? { duration: COVER, ease: "easeOut" }
              : stage === "reveal"
                ? { duration: expanding ? REVEAL : 0.1, ease: "easeOut" }
                : { duration: 0 },
        }}
        onAnimationComplete={() => {
          if (stage === "cover") {
            onCovered?.();
            setStage("move");
          } else if (stage === "move") {
            if (!expanding) {
              onArrive();
              setStage("reveal");
            }
          } else {
            onDone();
          }
        }}
      >
        <motion.div
          className="absolute top-0 right-0 flex h-full flex-col"
          style={{ width: contentWidth }}
          initial={{ opacity: expanding ? 1 : 0 }}
          animate={{ opacity: contentOpacity }}
          transition={
            expanding
              ? { duration: MOVE * 0.45, ease: "easeOut" }
              : { duration: MOVE * 0.5, delay: stage === "move" ? MOVE * 0.4 : 0, ease: "easeOut" }
          }
        >
          <PartnerDealDrawerBody deal={deal} onExpand={() => {}} />
        </motion.div>
      </motion.div>
    </>,
    document.body
  );
}
