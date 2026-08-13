"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, IconButton, Textarea } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { usePost } from "@/lib/api/hooks";
import {
  feedbackApi,
  feedbackEligibilityApi,
  feedbackShownApi,
} from "@/features/feedback/services";
import type {
  FeedbackEligibilityResponse,
  FeedbackPayload,
  FeedbackTypePayload,
} from "@/features/feedback/types";

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

// Delay before the tray fades in, so it doesn't compete with whatever page
// the merchant just landed on for attention.
const SHOW_DELAY_MS = 1500;

const EASE = [0.16, 1, 0.3, 1] as const;

// Collapsed: just wide enough for the header/close button and the five
// emojis. Expanded: adds room for the Submit button once an emoji is picked.
// Both are plain widths (not max-width), so the container itself grows
// rather than an inner element reflowing within a fixed box, giving the
// "single continuous interaction" the width and the Submit reveal share.
const COLLAPSED_WIDTH = "14rem";
const EXPANDED_WIDTH = "22rem";

/**
 * The product feedback sheet: a floating tray in the corner of the app,
 * asking how the merchant is finding PayGlocal as a whole.
 *
 * Deliberately global rather than attached to any one screen. It used to
 * appear inside the transaction details drawer, which implied it was asking
 * about that transaction — but the survey's only type is "GENERAL" and its
 * questions are about the product, so a specific transaction was the wrong
 * frame for it. pg-dashboard renders its equivalent app-wide for the same
 * reason.
 *
 * Whether it appears at all is the server's call (see the eligibility check
 * below), so mounting it in the dashboard layout doesn't mean showing it on
 * every visit.
 */
export function FeedbackSheet() {
  const [visible, setVisible] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [closed, setClosed] = useState(false);
  // Index into REACTIONS rather than the label, since whether to ask for a
  // comment depends on where the rating sits on the scale.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const reduceMotion = useReducedMotion();

  const { mutate: checkEligibility } = usePost<
    FeedbackEligibilityResponse,
    FeedbackTypePayload
  >(feedbackEligibilityApi, { invalidateQueries: false });

  const { mutate: submitFeedback } = usePost<unknown, FeedbackPayload>(feedbackApi, {
    invalidateQueries: false,
  });

  const { mutate: markShown } = usePost<unknown, FeedbackTypePayload>(feedbackShownApi, {
    invalidateQueries: false,
  });

  // The server decides whether this merchant is due a survey. Nothing renders
  // until it says yes, and a failed check leaves the tray hidden rather than
  // showing it speculatively. setIsEligible runs inside the mutation callback,
  // never in the effect body, so it doesn't trip the cascading-render rule.
  useEffect(() => {
    checkEligibility(
      { type: "GENERAL" },
      {
        onSuccess: (res) => {
          if (res?.data?.eligibility?.eligible) setIsEligible(true);
        },
        onError: () => undefined,
      }
    );
  }, [checkEligibility]);

  useEffect(() => {
    if (!isEligible) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isEligible]);

  const shown = visible && !closed;
  const hasSelection = selectedIndex !== null;
  const wantsComment = selectedIndex !== null && selectedIndex < LOWEST_POSITIVE_INDEX;
  // A low score with no explanation tells the product team something is wrong
  // without saying what, so the follow-up is required wherever it is asked —
  // matching pg-dashboard, which makes its own fields required below 3 stars.
  const canSubmit = hasSelection && (!wantsComment || comment.trim().length > 0);

  // The emoji row is ordered worst-to-best, so its index maps straight onto
  // the API's 1-based rating scale.
  const ratingFor = (index: number | null): number | undefined =>
    index === null ? undefined : index + 1;

  // Dismissing closes the tray without posting the feedback; submitting posts
  // first. Either way the prompt is marked shown, so the server stops
  // reporting this merchant as eligible. A failed post is never retried in the
  // merchant's face — this is optional feedback, not something worth blocking
  // on.
  const resolve = (rating?: number) => {
    if (rating != null) {
      submitFeedback(
        { type: "GENERAL", rating, freeText: comment.trim(), expectations: "" },
        { onError: () => undefined }
      );
    }
    markShown({ type: "GENERAL" }, { onError: () => undefined });
    setClosed(true);
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
          // Pinned to the viewport's bottom-right rather than centred in a
          // container: this belongs to the app, not to whatever is on screen,
          // and the corner keeps it clear of page content and of any drawer
          // that may be open. z-50 puts it above the app chrome but below
          // dialogs, which should take precedence while they are open.
          // Width itself is animated (see COLLAPSED_WIDTH/EXPANDED_WIDTH
          // above) rather than fixed, so overflow-hidden keeps the emoji row
          // from spilling out mid-transition.
          className="fixed bottom-6 right-6 z-50 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-xl"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-[13px] font-semibold text-foreground">How are you liking our product?</p>
            <IconButton
              aria-label="Dismiss feedback"
              variant="ghost"
              size="sm"
              onClick={() => resolve()}
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
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => resolve(ratingFor(selectedIndex))}
                    disabled={!canSubmit}
                  >
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
                    required
                    // min-w-0 stops the field claiming an intrinsic width
                    // wider than the tray, and ring-inset keeps its focus
                    // outline inside its own box. Either one overflowing gets
                    // sliced by the tray's overflow-hidden (which the width
                    // animation needs), which is what cut the left and right
                    // edges off the focus ring.
                    className="min-h-0 w-full min-w-0 resize-none text-[12.5px] focus-visible:ring-inset"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => resolve(ratingFor(selectedIndex))}
                    disabled={!canSubmit}
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
