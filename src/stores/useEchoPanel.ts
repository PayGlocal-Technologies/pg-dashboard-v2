import { create } from "zustand";

/** A fixed width rather than the reference's resizable drag handle — kept
 *  out of scope for now; the panel is still perfectly usable at one width,
 *  and a drag-to-resize handle is easy to add later without touching
 *  anything else that reads this store. */
export const ECHO_PANEL_WIDTH = 420;

interface EchoPanelState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

/** Whether Echo's side panel is open. Not persisted: a merchant reopening the
 *  app should land on their dashboard, not mid-conversation with a panel
 *  already sprung open. */
export const useEchoPanel = create<EchoPanelState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
