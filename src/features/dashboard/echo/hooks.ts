"use client";

import { useCallback, useEffect } from "react";
import { usePost } from "@/lib/api/hooks";
import useNewPermissions from "@/hooks/useNewPermissions";
import {
  ECHO_ERROR_MESSAGE,
  ECHO_OPENING_REQUEST,
  ECHO_RESTART_REQUEST,
  isEchoEndChat,
} from "@/features/dashboard/echo/constants";
import { isRenderableChunk } from "@/features/dashboard/echo/helper";
import { echoAppApi } from "@/features/dashboard/echo/services";
import type { EchoAppResponse, EchoRequest } from "@/features/dashboard/echo/types";
import { useEcho } from "@/stores/useEcho";

/**
 * Whether this account has Echo at all.
 *
 * `getEchoActiveSession` is the permission pg-dashboard uses to decide who
 * gets Echo; without it there is no server session to talk to, so every Echo
 * surface hides rather than opening something that cannot work.
 *
 * A hook rather than the same `checkPermissions([...])` call copied into each
 * surface, because the answer has to be shared: the sidebar's "Assistant"
 * heading and the row underneath it are different components, and when only
 * the row knew the answer the heading rendered over an empty gap for accounts
 * without Echo.
 */
export function useHasEcho(): boolean {
  const checkPermissions = useNewPermissions();
  return checkPermissions(["getEchoActiveSession"]);
}

/**
 * Drives one turn of the Echo conversation./**
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
  const ended = useEcho((s) => s.ended);

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

  /**
   * Ends the conversation.
   *
   * The request still goes out — the server owns the session and has to be
   * told to close it, or the next opening handshake resumes this one part-way
   * through its own goodbye. What changes is that the reply is discarded
   * instead of appended: the server answers an end-chat button with another
   * screen (a goodbye, sometimes a rating prompt, with its own buttons), and
   * rendering that is what made "End Chat" look like just another step rather
   * than the end of the conversation.
   *
   * Fire-and-forget, deliberately: nothing is retried and no failure is
   * surfaced. The merchant asked to be done, and the local conversation is
   * over either way — an abandoned session times out server-side, which is a
   * better outcome than an error bubble under a chat that has visibly ended.
   */
  const endChat = useCallback(
    (id: string, title: string) => {
      const store = useEcho.getState();
      if (store.status !== "idle") return;

      store.appendUser(title || id);
      store.endChat();
      mutate({ userInput: id, inputType: "button_reply" });
    },
    [mutate]
  );

  /** `id` goes on the wire, `title` goes in the transcript. */
  const sendButton = useCallback(
    (id: string, title: string) => {
      // An end-chat button is the one reply that does not advance the
      // conversation — see endChat, and isEchoEndChat for how it is
      // recognised (and why the title is part of that for one id).
      if (isEchoEndChat(id, title)) {
        endChat(id, title);
        return;
      }
      dispatch({ userInput: id, inputType: "button_reply" }, { label: title || id });
    },
    [dispatch, endChat]
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
    ended,
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
    const store = useEcho.getState();
    // `ended` is checked as well as `sessionStarted`: ending the chat resets
    // sessionStarted so that "New conversation" can open a real one, which
    // would otherwise leave this effect free to reopen the session the
    // merchant just closed.
    if (store.sessionStarted || store.ended) return;
    const timer = window.setTimeout(() => start(), 0);
    return () => window.clearTimeout(timer);
  }, [active, start]);
}
