"use client";

import { useCallback, useEffect } from "react";
import { usePost } from "@/lib/api/hooks";
import {
  ECHO_ERROR_MESSAGE,
  ECHO_OPENING_REQUEST,
  ECHO_RESTART_REQUEST,
} from "@/features/dashboard/echo/constants";
import { isRenderableChunk } from "@/features/dashboard/echo/helper";
import { echoAppApi } from "@/features/dashboard/echo/services";
import type { EchoAppResponse, EchoRequest } from "@/features/dashboard/echo/types";
import { useEcho } from "@/stores/useEcho";

/**
 * Drives one turn of the Echo conversation.
 *
 * Everything the app knows about where it is in the flow comes back from the
 * server, so this hook is deliberately thin: it posts what the user did, drops
 * the returned chunks into the transcript, and never routes or branches on
 * ids. The transcript itself lives in useEcho, above the component, so a
 * remount does not start the conversation over.
 */
export function useEchoSession() {
  const entries = useEcho((s) => s.entries);
  const status = useEcho((s) => s.status);
  const sessionStarted = useEcho((s) => s.sessionStarted);

  // invalidateQueries: false — an Echo turn changes nothing this app has
  // cached, and the default in usePost is to invalidate every query in the
  // client, which would refetch the whole dashboard on every button tap.
  const { mutate } = usePost<EchoAppResponse, EchoRequest>(echoAppApi, {
    invalidateQueries: false,
  });

  const dispatch = useCallback(
    (request: EchoRequest, options?: { label?: string; opening?: boolean }) => {
      const store = useEcho.getState();
      if (store.status !== "idle") return;

      if (options?.label) store.appendUser(options.label);
      store.setStatus(options?.opening ? "starting" : "sending");

      mutate(request, {
        onSuccess: (response) => {
          const chunks = (response?.data?.messages ?? []).filter(isRenderableChunk);
          // An empty array is a failure per §7 of the guide, not an empty
          // reply: there is no screen to show and no way to move on, so it
          // gets the same retry affordance as a network error.
          if (chunks.length === 0) {
            useEcho.getState().appendFailure(ECHO_ERROR_MESSAGE, request);
          } else {
            useEcho.getState().appendAssistant(chunks);
          }
          useEcho.getState().setStatus("idle");
        },
        onError: () => {
          useEcho.getState().appendFailure(ECHO_ERROR_MESSAGE, request);
          useEcho.getState().setStatus("idle");
        },
      });
    },
    [mutate]
  );

  /** Opens the session. No-ops if it has already been opened. */
  const start = useCallback(() => {
    if (!useEcho.getState().claimSessionStart()) return;
    dispatch(ECHO_OPENING_REQUEST, { opening: true });
  }, [dispatch]);

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      dispatch({ userInput: trimmed, inputType: "text" }, { label: trimmed });
    },
    [dispatch]
  );

  /** `id` goes on the wire, `title` goes in the transcript. */
  const sendButton = useCallback(
    (id: string, title: string) => {
      dispatch({ userInput: id, inputType: "button_reply" }, { label: title || id });
    },
    [dispatch]
  );

  const sendListRow = useCallback(
    (id: string, title: string) => {
      dispatch({ userInput: id, inputType: "list_reply" }, { label: title || id });
    },
    [dispatch]
  );

  /**
   * Resends a request that failed. The user bubble for it is already in the
   * transcript, so nothing new is appended for the user's side; the failure
   * bubble is dropped so a second failure does not stack up.
   */
  const retry = useCallback(
    (entryId: string, request: EchoRequest) => {
      useEcho.getState().removeEntry(entryId);
      dispatch(request, { opening: !useEcho.getState().entries.length });
    },
    [dispatch]
  );

  /**
   * Starts over. `BTN_RESTART_CHAT`, not the opening `BTN_MAIN_MENU`: the
   * guide is explicit that going back to the main menu keeps the same server
   * session and everything it has accumulated, so only this id gives a real
   * clean slate. It answers with the full welcome screen, which is why the
   * transcript is emptied first rather than appended to.
   */
  const restart = useCallback(() => {
    const store = useEcho.getState();
    if (store.status !== "idle") return;
    store.clear();
    // Claimed here so the auto-start effect cannot race a second opening turn
    // against this one on the now-cleared session.
    useEcho.getState().claimSessionStart();
    dispatch(ECHO_RESTART_REQUEST, { opening: true });
  }, [dispatch]);

  return {
    entries,
    status,
    sessionStarted,
    busy: status !== "idle",
    start,
    sendText,
    sendButton,
    sendListRow,
    retry,
    restart,
  };
}

/**
 * Sends the opening handshake the first time the Echo page is shown.
 *
 * Deferred through a zero-delay timer rather than called straight from the
 * effect body, per the no-synchronous-setState-in-effects rule in CLAUDE.md —
 * `start` writes to both the store and react-query. `claimSessionStart` inside
 * `start` is what keeps it to one call across a remount or a Strict Mode
 * double-invoke.
 */
export function useEchoAutoStart(active: boolean, start: () => void) {
  useEffect(() => {
    if (!active) return;
    if (useEcho.getState().sessionStarted) return;
    const timer = window.setTimeout(() => start(), 0);
    return () => window.clearTimeout(timer);
  }, [active, start]);
}
