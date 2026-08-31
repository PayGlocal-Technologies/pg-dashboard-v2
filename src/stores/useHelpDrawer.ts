import { create } from "zustand";

/**
 * Whether any screen's Help drawer panel is currently open. HelpDrawer sets
 * this directly from its own toggle/requestClose handlers (not from an
 * effect watching its local `open` state — that would be a synchronous
 * setState-in-effect on a value that already changes inside an event
 * handler). Consumers like VideoMiniPlayerTrigger read it to stay clear of
 * the drawer's full-height right-edge panel instead of sitting underneath it.
 */
interface HelpDrawerState {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

export const useHelpDrawerStore = create<HelpDrawerState>((set) => ({
  isOpen: false,
  setOpen: (isOpen) => set({ isOpen }),
}));
