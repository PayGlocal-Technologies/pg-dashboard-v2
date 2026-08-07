"use client";

import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "framer-motion";
import { Button, IconButton, VisuallyHidden } from "@/components/ui";
import { Icon } from "@/components/icon";
import { CopyableText } from "@/components/common/CopyableText";
import { cn } from "@/lib/utils";
import { useContentAreaElement } from "@/components/layout/ContentAreaContext";
import { TransactionDetailsContent, isSettledTransaction } from "@/features/dashboard/transactions/components/TransactionDetailsPage";
import { SettlementFeedbackSheet } from "@/features/dashboard/transactions/components/SettlementFeedbackSheet";
import type { McaTransaction } from "@/features/dashboard/transactions/types";

// Shared with TransactionDetailsContent's own per-section transition, so the
// panel's own expand/collapse and each section's reflow inside it move at
// the same rate and read as one continuous motion.
const TRANSITION = { duration: 0.3, ease: "easeInOut" } as const;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

// Tracks `el`'s live viewport-relative bounding rect while `active`, via
// ResizeObserver (catches both window resize and the content area's own
// width changing, e.g. the sidebar collapsing) plus a window resize
// listener as a fallback. Only ever consulted for the panel's "page" bounds
// below, the "drawer" bounds are plain Tailwind classes, since they don't
// depend on anything measured at runtime.
function useFixedRect(el: HTMLElement | null, active: boolean): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!active || !el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [el, active]);

  return rect;
}

interface TransactionDetailsPanelProps {
  row: McaTransaction | null;
  /** null: closed entirely. "drawer": right-side sheet. "page": expanded to
   *  fill the content area. Toggling between "drawer" and "page" never
   *  unmounts this component or TransactionDetailsContent inside it, only
   *  their className/style change, which is what lets Framer Motion
   *  FLIP-animate the panel itself and, inside TransactionDetailsContent,
   *  each section, instead of one tree disappearing and a different one
   *  appearing in its place. */
  mode: "drawer" | "page" | null;
  /** Dismisses entirely (drawer's close button / overlay click / Escape). */
  onClose: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  onUploaded?: (row: McaTransaction) => void;
  onOpenTransaction: (row: McaTransaction) => void;
  isPartnerUser: boolean;
  backLabel?: string;
}

/**
 * Replaces the old pairing of TransactionDetailsDrawer + a conditional
 * TransactionDetailsPage swap (still used as-is by the Multi Currency
 * Accounts entry point, see VirtualAccountActionRequired.tsx) with a single
 * persistent overlay that morphs between the two presentations instead of
 * unmounting one and mounting the other. Built directly on
 * @radix-ui/react-dialog (the same primitive flux-ui's own Drawer wraps)
 * rather than that wrapper, because the wrapper's CSS-driven slide
 * transition and fixed side-sheet sizing can't express a size/position that
 * morphs to arbitrary, runtime-measured bounds. Framer Motion's `layout`
 * prop needs to own that animation instead.
 *
 * Bounds: "drawer" is plain Tailwind classes (inset-y-0 right-0 ...), same
 * as before. "page" is a JS-measured rect matching the content area's own
 * bounding box (see useFixedRect) so the panel visually lines up with where
 * inline page content would sit, without actually being inline: it stays
 * `position: fixed` in both modes, so the transform Framer Motion applies to
 * bridge the two is a plain, cheap resize/reposition, not a reparenting.
 * Because the content area's own scroll position is never touched by this
 * (the panel just covers it, fixed, with its own internal scroll), there's
 * nothing to capture/restore across the transition, a simplification over
 * the old TransactionDetailsPage swap, which had to manually save and
 * restore McaTransactionTable's scrollTop since it briefly unmounted the
 * table's own scroll container.
 */
export function TransactionDetailsPanel({
  row,
  mode,
  onClose,
  onExpand,
  onCollapse,
  onUploaded,
  onOpenTransaction,
  isPartnerUser,
  backLabel = "Back to Transactions",
}: TransactionDetailsPanelProps) {
  const isOpen = mode !== null;
  const isDrawer = mode === "drawer";
  const isPageMode = mode === "page";

  const contentEl = useContentAreaElement();
  // Tracked from the moment anything is open (not just once mode is "page")
  // so a rect is already available the instant Expand is clicked, rather
  // than the panel having to wait a frame for its first measurement.
  const pageRect = useFixedRect(contentEl, isOpen);

  const [resolvedFeedbackIds, setResolvedFeedbackIds] = useState<Set<string>>(() => new Set());
  const showFeedback = isDrawer && !!row && isSettledTransaction(row);

  return (
    <DialogPrimitive.Root open={isOpen} modal={isDrawer} onOpenChange={(next) => { if (!next) onClose(); }}>
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Portal forceMount>
            {/* Backdrop: meaningful only in drawer mode. Kept mounted and
                opacity-animated (rather than conditionally rendered)
                whenever the panel is open at all, so it fades out
                progressively as the panel grows into the page instead of
                popping away the instant `mode` flips. pointer-events follow
                the same rule so page-mode clicks never land on it. */}
            <motion.div
              className="fixed inset-0 z-40 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: isDrawer ? 1 : 0 }}
              exit={{ opacity: 0 }}
              transition={TRANSITION}
              style={{ pointerEvents: isDrawer ? "auto" : "none" }}
              onClick={() => { if (isDrawer) onClose(); }}
            />
            <DialogPrimitive.Content
              forceMount
              onEscapeKeyDown={(e) => { if (!isDrawer) e.preventDefault(); }}
              onInteractOutside={(e) => { if (!isDrawer) e.preventDefault(); }}
              asChild
            >
              <motion.div
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, borderRadius: isDrawer ? 16 : 0 }}
                exit={{ opacity: 0 }}
                transition={TRANSITION}
                className={cn(
                  "fixed z-50 flex flex-col overflow-hidden shadow-xl transition-colors duration-300 ease-in-out",
                  isDrawer
                    ? "inset-y-0 right-0 w-full border-l border-border bg-card sm:w-[32rem] sm:max-w-[92vw]"
                    : "border-0 bg-background shadow-none"
                )}
                style={isPageMode && pageRect ? { top: pageRect.top, left: pageRect.left, width: pageRect.width, height: pageRect.height } : undefined}
              >
                <DialogPrimitive.Title asChild>
                  <VisuallyHidden>Transaction details</VisuallyHidden>
                </DialogPrimitive.Title>

                {/* Left group crossfades between Close+Expand (drawer) and
                    Back+Collapse (page): different controls, but the same
                    role (leave this view / toggle presentation), so they
                    swap in place rather than the row reflowing abruptly.
                    Transaction ID (drawer only) is pushed to the far right
                    via ml-auto and fades independently, since it has no
                    page-mode equivalent to crossfade with. */}
                <div
                  className={cn(
                    "flex shrink-0 items-center gap-2 transition-[padding,border-color] duration-300 ease-in-out",
                    isDrawer ? "border-b border-border px-6 py-3" : "border-b border-transparent px-4 py-3 md:px-6"
                  )}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    {isDrawer ? (
                      <motion.div
                        key="drawer-controls"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={TRANSITION}
                        className="flex items-center gap-1"
                      >
                        <IconButton aria-label="Close" variant="ghost" size="sm" onClick={onClose}>
                          <Icon name="x" className="h-4 w-4" />
                        </IconButton>
                        <IconButton aria-label="Expand to full page" variant="ghost" size="sm" onClick={onExpand}>
                          <Icon name="expand" className="h-4 w-4" />
                        </IconButton>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="page-controls"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={TRANSITION}
                        className="flex items-center gap-1"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
                          onClick={onClose}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {backLabel}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          leftIcon={<Icon name="shrink" className="h-4 w-4" />}
                          onClick={onCollapse}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          Collapse
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {row && (
                    <AnimatePresence initial={false}>
                      {isDrawer && (
                        <motion.div
                          key="txn-id"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={TRANSITION}
                          className="ml-auto"
                        >
                          <CopyableText value={row.gid} valueClassName="text-muted-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>

                <div
                  className={cn(
                    "min-h-0 flex-1 overflow-y-auto transition-[padding] duration-300 ease-in-out",
                    isDrawer ? "p-6" : "p-4 md:p-6"
                  )}
                >
                  {row && (
                    <TransactionDetailsContent
                      row={row}
                      onUploaded={onUploaded}
                      onOpenTransaction={onOpenTransaction}
                      isPartnerUser={isPartnerUser}
                      layout={isPageMode ? "page" : "drawer"}
                    />
                  )}
                </div>

                {showFeedback && row && (
                  <SettlementFeedbackSheet
                    key={row.gid}
                    alreadyResolved={resolvedFeedbackIds.has(row.gid)}
                    onResolve={() => setResolvedFeedbackIds((prev) => new Set(prev).add(row.gid))}
                  />
                )}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
