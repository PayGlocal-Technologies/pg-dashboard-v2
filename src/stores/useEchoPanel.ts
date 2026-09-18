import { create } from "zustand";

/** A fixed width rather than a resizable drag handle — kept out of scope for
 *  now; the panel is perfectly usable at one width, and a drag-to-resize
 *  handle can be added later without touching anything that reads this
 *  store. */
export const ECHO_PANEL_WIDTH = 420;

interface EchoPanelState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

/**
 * Whether Echo's side panel is open.
 *
 * Only the open/closed flag lives here. The conversation itself stays in
 * useEcho, which the panel and the /echo page both read, so expanding one
 * into the other continues the same server session rather than starting a
 * second one.
 *
 * Not persisted: a merchant reopening the app should land on their dashboard,
 * not mid-conversation with a panel already sprung open — and the server
 * session behind that transcript may well be gone by then.
 */
export const useEchoPanel = create<EchoPanelState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
