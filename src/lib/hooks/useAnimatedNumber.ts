"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT_DURATION_MS = 550;

/**
 * Tweens towards a changing number so a figure updating in place reads as a
 * recalculation rather than a swap.
 *
 * Mirrors pg-dashboard's `useRafNumber` (src/hooks/useRafNumber.ts), including
 * its easeOutQuad over 550ms, so the FX calculator's figures move the same way
 * in both apps.
 *
 * Two deliberate differences from production's version:
 *
 * - It never calls setState in the effect body, which the React Compiler lint
 *   plugin rejects (see CLAUDE.md). An undefined target is handled by returning
 *   undefined rather than by clearing state, so no render is scheduled for it.
 * - It honours `prefers-reduced-motion`, snapping straight to the target.
 *
 * Returns undefined while `target` is undefined, so callers can still tell
 * "no value yet" from "value of zero".
 */
export function useAnimatedNumber(
  target: number | undefined,
  duration = DEFAULT_DURATION_MS
): number | undefined {
  const [display, setDisplay] = useState<number | undefined>(target);
  const frameRef = useRef<number | null>(null);
  // Where the next tween starts from: the last value actually rendered, so an
  // update mid-animation continues from what the eye currently sees instead of
  // jumping back to the previous target.
  const fromRef = useRef<number>(target ?? 0);

  useEffect(() => {
    if (target === undefined) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || duration <= 0) {
      fromRef.current = target;
      // In a callback, not the effect body: a microtask defers the update past
      // this render, keeping the effect body itself free of setState.
      void Promise.resolve().then(() => setDisplay(target));
      return;
    }

    const from = fromRef.current;
    if (from === target) return;

    const start = performance.now();

    const step = (now: number): void => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // easeOutQuad: fast off the mark, settling into the final figure, which
      // suits a number that has just been recalculated.
      const eased = 1 - (1 - progress) * (1 - progress);
      const current = from + (target - from) * eased;

      fromRef.current = current;
      setDisplay(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = target;
        frameRef.current = null;
      }
    };

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [target, duration]);

  return target === undefined ? undefined : display;
}
