"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, IconButton, Textarea } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

const REACTIONS = [
  { emoji: "😡", label: "Very dissatisfied" },
  { emoji: "😕", label: "Dissatisfied" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "🙂", label: "Satisfied" },
  { emoji: "😄", label: "Very satisfied" },
] as const;

// Ratings at or below this index (the first three reactions) are the ones
// worth asking a follow-up question about: a low or neutral score says
// something went wrong without saying what. The top two need no prompt, so
// they go straight to Submit.
const LOWEST_POSITIVE_INDEX = 3;

// Delay before the tray fades in, so it doesn't compete with the drawer's
// own open animation for attention.
const SHOW_DELAY_MS = 500;

const EASE = [0.16, 1, 0.3, 1] as const;

// Collapsed: just wide enough for the header/close button and the five
// emojis. Expanded: adds room for the Submit button once an emoji is picked.
// Both are plain widths (not max-width), so the container itself grows
// rather than an inner element reflowing within a fixed box, giving the
// "single continuous interaction" the width and the Submit reveal share.
const COLLAPSED_WIDTH = "14rem";
const EXPANDED_WIDTH = "20rem";

interface SettlementFeedbackSheetProps {
  /** This transaction's feedback was already submitted or dismissed in an
   * earlier drawer session, so skip the entrance entirely rather than
   * showing it again. */
  alreadyResolved: boolean;
  /** Called once, the moment feedback is submitted or the tray is
   * dismissed, so the parent can remember not to show it again for this
   * transaction. */
  onResolve: () => void;
}

// A floating card, not a full-width bottom sheet: it sits above the drawer's
// scrollable content with margin on every side (see the className below),
// closer to a toast/"unsaved changes" tray than an attached panel.
export function SettlementFeedbackSheet({ alreadyResolved, onResolve }: SettlementFeedbackSheetProps) {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  // Index into REACTIONS rather than the label, since whether to ask for a
  // comment depends on where the rating sits on the scale.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (alreadyResolved) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [alreadyResolved]);

  const shown = visible && !closed && !alreadyResolved;
  const hasSelection = selectedIndex !== null;
  const wantsComment = selectedIndex !== null && selectedIndex < LOWEST_POSITIVE_INDEX;

  // TODO: post the rating and comment once a settlement-feedback endpoint
  // exists. There is none today, so submitting and dismissing both just close
  // the tray for this transaction (see the parent's resolved-id tracking).
  const resolve = () => {
    setClosed(true);
    onResolve();
  };

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12, width: COLLAPSED_WIDTH }}
          animate={{ opacity: 1, y: 0, width: hasSelection ? EXPANDED_WIDTH : COLLAPSED_WIDTH }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{
            opacity: { duration: 0.25, ease: EASE },
            y: { duration: 0.25, ease: EASE },
            width: { duration: reduceMotion ? 0 : 0.3, ease: EASE },
          }}
          // inset-x-0 + mx-auto centers this card within the full-width
          // absolute wrapper, rather than the card itself spanning the
          // drawer. bottom-7 (28px) sits in the middle of the requested
          // 24-32px margin. Width itself is animated (see COLLAPSED_WIDTH/
          // EXPANDED_WIDTH above) rather than fixed, so overflow-hidden keeps
          // the emoji row from spilling out mid-transition.
          className="absolute inset-x-0 bottom-7 mx-auto max-w-[calc(100%-3rem)] overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-foreground">How are you liking our product?</p>
            <IconButton
              aria-label="Dismiss feedback"
              variant="ghost"
              size="sm"
              onClick={resolve}
              className="-mr-1 -mt-1 shrink-0"
            >
              <Icon name="x" className="h-3.5 w-3.5" />
            </IconButton>
          </div>

          {/* Emojis stay left-aligned and never move: only the card's own
              width animates (see the motion.div above) to make room for
              Submit, which then fades/slides in on the right once there's
              space for it. For low and neutral ratings Submit moves below a
              comment field instead (see the block after this row), so the
              inline one is suppressed in that case rather than duplicated. */}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {REACTIONS.map((reaction, i) => {
                const isSelected = selectedIndex === i;
                return (
                  <button
                    key={reaction.label}
                    type="button"
                    aria-label={reaction.label}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedIndex(i)}
                    className="flex items-center justify-center rounded-lg p-1 transition-colors hover:bg-muted/50"
                  >
                    <motion.span
                      animate={{ scale: isSelected ? 1.2 : 1 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className={cn(
                        "text-xl leading-none transition-[filter,opacity] duration-200",
                        !isSelected && "opacity-60 grayscale"
                      )}
                    >
                      {reaction.emoji}
                    </motion.span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence>
              {hasSelection && !wantsComment && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  <Button type="button" variant="primary" size="sm" onClick={resolve}>
                    Submit
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Follow-up prompt for the bottom three ratings only. Animating
              height to/from auto (rather than just fading) means the card's own
              growth is smooth and continuous with the width expansion already
              running, instead of the tray snapping to a taller box. The outer
              overflow-hidden is what keeps this clipped while it collapses. */}
          <AnimatePresence>
            {wantsComment && (
              <motion.div
                initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduceMotion ? { opacity: 0, height: 0 } : { opacity: 0, height: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.28, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="mt-2.5 space-y-2">
                  <Textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="What could we improve?"
                    aria-label="What could we improve?"
                    className="min-h-0 resize-none text-[12.5px]"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={resolve}
                    className="w-full"
                  >
                    Submit
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
