"use client";

import { Card, CardContent } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidChoiceList } from "@/components/common/MidScopedAction";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";

type MidType = "PACB" | "PA";

const MID_TYPE_COPY: Record<MidType, { label: string; other: string }> = {
  PACB: { label: "Global Fund Transfer Merchant ID", other: "Card Payments" },
  PA: { label: "Card Payments Merchant ID", other: "Global Fund Transfer" },
};

/** Same tint the other "pick for the merchant" paths use (usePacbMidScope,
 *  useMidFromUrl), so the sidebar's chip is never blank after a pick here. */
const PICKED_MID_COLOR = "#E5B5FF";

/**
 * Asks a multi-MID merchant to pick which account they mean, and lets them pick
 * it right here.
 *
 * Ported from pg-dashboard's SelectMidView. It exists because these features
 * address a single MID in the request path rather than filtering across several:
 * with more than one to choose from, defaulting to the first silently shows one
 * account's data under another's name. Better to ask.
 *
 * It used to come in two forms: one that only pointed at the sidebar's selector,
 * and one with the picker in the card for the full-screen routes that draw no
 * sidebar. The pointer-only form made the merchant leave the page to answer a
 * question the page had just asked, so the picker is now always in the card,
 * and the sidebar is mentioned only as where to switch later. Surfaces without
 * a sidebar pass `showSidebarHint={false}` so that line never points at nothing.
 *
 * The options are read from the store for `midType` rather than passed in, so
 * every page that gates on a MID gets the picker without wiring it. It is the
 * app's one full-page MID picker, for Card Payments as well as Global Fund
 * Transfer; the small popover on action buttons (MidChoiceMenu) is the only
 * other way the app asks. Picking
 * writes the same selected-MID store the sidebar writes, which is what every
 * gate reads, so the page re-renders into its content on the spot.
 *
 * Distinct from NoFeatureView, which answers "this MID cannot do this"; this one
 * answers "which MID did you mean".
 */
export function SelectMidView({
  midType,
  midOptions: midOptionsOverride,
  onSelectMid,
  showSidebarHint = true,
}: {
  midType: MidType;
  /** Narrows the list below every MID of `midType`, for a feature that only
   *  some of them have (payment buttons). Defaults to all of them. */
  midOptions?: string[];
  /** Replaces the default "select this MID app-wide", for a route that carries
   *  the pick in its URL instead (payment button create). */
  onSelectMid?: (mid: string) => void;
  /** Off on full-screen routes that render no sidebar. */
  showSidebarHint?: boolean;
}) {
  const copy = MID_TYPE_COPY[midType];
  const paMids = useApp((s) => s.paMids);
  const paCbMids = useApp((s) => s.paCbMids);
  const tidsInfo = useApp((s) => s.tidsInfo);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);
  const setSelectedMidDetails = useAccountSetup((s) => s.setSelectedMidDetails);

  const productMids = midType === "PA" ? paMids : paCbMids;
  const midOptions = midOptionsOverride ?? productMids;
  const hasOptions = midOptions.length > 0;

  // Some pages land here because the merchant already chose a MID, just one of
  // the other product (a Card Payments MID on an eBRC page). Saying so is the
  // difference between "pick one" and "why is it asking me again".
  // Checked against the product's MIDs, not a narrowed list: a MID left out of
  // that list is the right product, just without the feature.
  const selectedIsOtherProduct = !!selectedMid && !productMids.includes(selectedMid);
  const selectedInfo = tidsInfo.find((t) => t.mid === selectedMid);
  const selectedName = selectedInfo?.displayTag || selectedInfo?.tradeName || selectedMid;

  const select =
    onSelectMid ?? ((mid: string) => setSelectedMidDetails({ mid, color: PICKED_MID_COLOR }));

  const lead = selectedIsOtherProduct
    ? `${selectedName} is a ${copy.other} account, and this feature needs a ${copy.label}.`
    : `This feature works on one ${copy.label} at a time.`;

  const instruction = hasOptions
    ? "Choose the account you want to continue with."
    : showSidebarHint
      ? "Use the Merchant ID selector in the sidebar to choose the right account."
      : "None of your accounts can use this feature yet.";

  return (
    // Sized to its content rather than the page: the question and its handful
    // of rows are all there is, and a full-width card left them floating in a
    // field of empty space. `size="sm"` because the default card padding plus
    // any of our own doubled the whitespace above and below.
    <Card size="sm" className="mx-auto w-full max-w-xl">
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon name="building-2" size={20} />
        </span>

        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Select a {copy.label}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {lead} {instruction}
          </p>
        </div>

        {hasOptions && (
          // Left-aligned inside a centred card: the rows are records, and a
          // centred list of names and MIDs has no edge for the eye to run down.
          // Bordered so the rows read as one set of choices rather than loose
          // text, and capped so a merchant with many MIDs scrolls the list
          // instead of the page.
          <div className="w-full rounded-xl border border-border bg-background p-1 text-left">
            <MidChoiceList
              midOptions={midOptions}
              onSelect={select}
              showChevron
              className="max-h-80 overflow-y-auto"
            />
          </div>
        )}

        {hasOptions && showSidebarHint && (
          <p className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
            <Icon name="info" size={12} />
            You can switch accounts anytime from the Merchant ID selector in the sidebar.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
