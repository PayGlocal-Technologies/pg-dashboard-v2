import { create } from "zustand";
import type {
  EchoChunk,
  EchoEntry,
  EchoRequest,
  EchoStatus,
} from "@/features/dashboard/echo/types";

/**
 * One Echo conversation.
 *
 * The server holds the real session state (keyed off the auth cookie), so the
 * transcript has to live above the component that shows it: leaving /echo for
 * another dashboard route and coming back must not restart a conversation the
 * server is still halfway through, which is exactly what a component-local
 * useState would do.
 *
 * Deliberately NOT persisted. A transcript restored from storage after a
 * refresh would be paired with a server session that may well be gone,
 * leaving live-looking buttons that no longer mean anything.
 */

let entryCounter = 0;
/** Ids are only ever minted inside actions, never during render. */
function nextEntryId(prefix: string): string {
  entryCounter += 1;
  return `${prefix}-${entryCounter}`;
}

interface EchoState {
  entries: EchoEntry[];
  status: EchoStatus;
  /** Set the moment the opening handshake is dispatched, so a remount cannot
   *  send a second one. */
  sessionStarted: boolean;
  /**
   * The merchant ended the conversation.
   *
   * Separate from an empty transcript, and that is the point: the transcript
   * stays readable but nothing in it is actionable, the composer is closed,
   * and the auto-start effect must not quietly open a fresh session behind
   * the merchant's back. Only `clear()` (i.e. "New conversation") lifts it.
   */
  ended: boolean;

  appendUser: (label: string) => void;
  appendAssistant: (chunks: EchoChunk[]) => void;
  appendFailure: (message: string, request: EchoRequest) => void;
  removeEntry: (id: string) => void;
  setStatus: (status: EchoStatus) => void;
  /** Claims the handshake. Returns false when it has already been claimed. */
  claimSessionStart: () => boolean;
  /** Closes the conversation, keeping the transcript on screen. */
  endChat: () => void;
  clear: () => void;
}

export const useEcho = create<EchoState>()((set, get) => ({
  entries: [],
  status: "idle",
  sessionStarted: false,
  ended: false,

  appendUser: (label) =>
    set((state) => ({
      entries: [...state.entries, { id: nextEntryId("u"), role: "user", label }],
    })),

  appendAssistant: (chunks) =>
    set((state) => ({
      entries: [...state.entries, { id: nextEntryId("a"), role: "assistant", chunks }],
    })),

  appendFailure: (message, request) =>
    set((state) => ({
      entries: [
        ...state.entries,
        { id: nextEntryId("e"), role: "assistant", failure: { message, request } },
      ],
    })),

  removeEntry: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),

  setStatus: (status) => set({ status }),

  claimSessionStart: () => {
    if (get().sessionStarted) return false;
    set({ sessionStarted: true });
    return true;
  },

  // The server session is finished, so sessionStarted goes back to false:
  // "New conversation" has to be free to open a real one.
  endChat: () => set({ status: "idle", sessionStarted: false, ended: true }),

  clear: () => set({ entries: [], status: "idle", sessionStarted: false, ended: false }),
}));
