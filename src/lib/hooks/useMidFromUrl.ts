"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";

/** The query key the hard-navigating routes carry the selected MID in. */
export const MID_QUERY_KEY = "mid";

/**
 * Appends the MID a surface is scoped to onto a hard-navigation target, so the
 * in-memory selection survives the full page load. A no-op when nothing is
 * selected, which is the single-MID case where the resolvers answer on their
 * own anyway.
 */
export function withMidParam(url: string, mid: string): string {
  if (!mid) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${MID_QUERY_KEY}=${encodeURIComponent(mid)}`;
}

/**
 * Re-applies a MID handed over in `?mid=`.
 *
 * The selection is in-memory only (see useAccountSetup for why), so the two
 * routes that deliberately hard-navigate — "Edit template", on the invoice list
 * and in the editor itself — would otherwise land a multi-MID merchant back on
 * the "which account?" picker instead of their template. They append the MID
 * they were scoped to and this puts it back.
 *
 * The URL is merchant-editable, so the value is only ever applied after it has
 * been matched against the account's own PACB MIDs. An id that is not in that
 * list is ignored outright rather than selected: re-introducing the persisted
 * selection's bug through a query param would be no better than leaving it in
 * localStorage.
 *
 * Only ever applied when nothing is selected. That is what keeps a stale `?mid=`
 * left in the address bar from fighting the header's merchant selector after
 * the merchant switches accounts by hand.
 */
export function useMidFromUrl(): {
  /**
   * True while the handover is still in progress, so the caller can hold a
   * loader instead of flashing a MID picker it is about to answer itself.
   * Covers both waiting for the MID lists to arrive and the single render
   * between them arriving and the effect below committing the selection.
   */
  isResolvingMid: boolean;
} {
  const searchParams = useSearchParams();
  const urlMid = searchParams.get(MID_QUERY_KEY) ?? "";

  const paCbMids = useApp((s) => s.paCbMids);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);

  // Empty until the merchant-products call lands, which is the only thing that
  // can say whether `urlMid` belongs to this account.
  const productsReady = paCbMids.length > 0;
  const urlMidIsOwn = productsReady && paCbMids.includes(urlMid);

  useEffect(() => {
    if (!urlMidIsOwn || selectedMid) return;
    // Colour tints the header's merchant chip, matching usePacbMidScope's own
    // selectMid so a handover looks identical to picking the MID by hand.
    setSelectedMidDetails({ mid: urlMid, color: "#E5B5FF" });
  }, [urlMidIsOwn, selectedMid, urlMid, setSelectedMidDetails]);

  return {
    isResolvingMid: !!urlMid && (!productsReady || (urlMidIsOwn && !selectedMid)),
  };
}
