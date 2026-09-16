"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Runs `open` once when the URL carries `?action=<action>`.
 *
 * This is the header search's handoff for a page's *own* action rather than the
 * page itself: picking "Add client" out of the dropdown lands on
 * /client-management?action=add-client, and the page opens the same modal its
 * button would. The search palette therefore never reimplements an action — it
 * only asks the page to run the one it already has.
 *
 * `enabled` defers the trigger until the page can honour it, and matters more
 * than it looks. Most of these actions are MID-scoped: their on-page button is
 * a MidScopedAction that asks "which account is this for?" when the merchant
 * holds several PACB MIDs and has picked none. A URL cannot ask that, and the
 * MID list loads asynchronously — so firing on mount would either open the
 * action against a MID nobody chose, or fire in the brief window before
 * `needsMidChoice` has resolved. Pass the page's readiness here and the trigger
 * simply doesn't fire while a choice is pending; the merchant lands on the page
 * with the button in front of them, which is the correct fallback.
 */
export function useUrlAction(action: string, open: () => void, enabled = true): void {
  const searchParams = useSearchParams();
  const wanted = searchParams.get("action") === action;

  // Once only: without this the action would reopen every time the effect's
  // dependencies changed, so closing the modal would immediately reinstate it.
  const firedRef = useRef(false);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!wanted || !enabled || firedRef.current) return;

    // Deferred through a zero-delay timer rather than called straight from the
    // effect body, per the no-synchronous-setState-in-effects rule in CLAUDE.md.
    const timer = window.setTimeout(() => {
      // The flag is set HERE, not in the effect body, and the placement is
      // load-bearing. reactStrictMode mounts every effect twice — run,
      // cleanup, run — and the cleanup below cancels the pending timer. A flag
      // set in the body would therefore be true by the second run, which would
      // bail out, leaving the cancelled timer as the only one ever scheduled
      // and the action silently never opening in development.
      firedRef.current = true;
      openRef.current();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [wanted, enabled]);

  // A gate that refuses is otherwise indistinguishable from a broken handoff:
  // the URL asks for an action and the page just sits there. In development,
  // say which of the two it was. No user data here, only the gate's verdict.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !wanted || enabled) return;
    const timer = window.setTimeout(() => {
      console.warn(
        `[useUrlAction] ?action=${action} was requested but this page is not ready ` +
          `to run it (enabled=false). For a MID-scoped action this means the MID list ` +
          `has not loaded, or a MID choice is pending and only the on-page button can ask.`
      );
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [action, wanted, enabled]);
}
