import { create } from "zustand";

interface EbrcDgftState {
  connected: boolean;
  setConnected: (connected: boolean) => void;
}

/**
 * Whether the merchant's DGFT account is connected, for the eBRC Generation
 * flow. Lifted out of local component state into a store because the
 * merchant now moves between two separate pages — the eBRC Status landing
 * page (`/ebrc-generation`) and the full-screen Generate eBRC wizard
 * (`/ebrc-generation/generate`) — and the connection needs to survive that
 * navigation instead of being asked again every time the wizard opens.
 *
 * Not persisted: there's no real DGFT session behind this yet (see
 * DgftConnectGate), so surviving a full reload would be pretending to
 * remember an integration that doesn't exist.
 */
export const useEbrcDgft = create<EbrcDgftState>((set) => ({
  connected: false,
  setConnected: (connected) => set({ connected }),
}));
