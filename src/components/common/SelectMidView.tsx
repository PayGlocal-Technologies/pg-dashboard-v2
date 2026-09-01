"use client";

import { Card, CardContent } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidChoiceList } from "@/components/common/MidScopedAction";

const MID_TYPE_COPY: Record<"PACB" | "PA", { label: string; hint: string }> = {
  PACB: {
    label: "Global Fund Transfer Merchant ID",
    hint: "This feature requires a Global Fund Transfer Merchant ID. Use the Merchant ID selector in the sidebar to choose the right account.",
  },
  PA: {
    label: "Card Payments Merchant ID",
    hint: "This feature requires a Card Payments Merchant ID. Use the Merchant ID selector in the sidebar to choose the right account.",
  },
};

/** What to say when the picker is right here rather than in the sidebar. */
const INLINE_HINT = "Pick the account this belongs to and you can carry on.";

/**
 * Asks a multi-MID merchant to pick which account they mean.
 *
 * Ported from pg-dashboard's SelectMidView. It exists because these features
 * address a single MID in the request path rather than filtering across several:
 * with more than one to choose from, defaulting to the first silently shows one
 * account's data under another's name. Better to ask.
 *
 * Two forms, because two kinds of surface use it:
 *
 * - Inside the dashboard shell, it points at the sidebar's own merchant selector
 *   — the merchant is going to be switching accounts across pages, and the one
 *   control that does it should stay the one they learn.
 * - Given `midOptions`, it puts the picker in the card instead. The invoice
 *   editor is the case: it is a full-screen route with no sidebar rendered at
 *   all, so pointing at a control that is not on screen is an instruction the
 *   merchant cannot follow.
 *
 * Distinct from NoFeatureView, which answers "this MID cannot do this"; this one
 * answers "which MID did you mean".
 */
export function SelectMidView({
  midType,
  midOptions,
  onSelectMid,
}: {
  midType?: "PACB" | "PA";
  /** Renders the picker inline. Omit on surfaces that show the sidebar. */
  midOptions?: string[];
  onSelectMid?: (mid: string) => void;
}) {
  const copy = midType ? MID_TYPE_COPY[midType] : null;
  const isInline = !!midOptions?.length && !!onSelectMid;

  return (
    <Card>
      <CardContent
        className={
          isInline
            ? "flex flex-col items-center gap-4 px-8 py-10 text-center"
            : "flex flex-col items-center gap-4 px-8 py-20 text-center"
        }
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon name="building-2" size={24} />
        </span>
        <div className="max-w-md space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            {copy ? `Select a ${copy.label}` : "Select a Merchant ID"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isInline
              ? INLINE_HINT
              : (copy?.hint ??
                "Use the Merchant ID selector in the sidebar to choose an account, then you can use this feature for it.")}
          </p>
        </div>

        {isInline && (
          // Left-aligned inside a centred card: the rows are records, and a
          // centred list of names and MIDs has no edge for the eye to run down.
          <MidChoiceList
            midOptions={midOptions}
            onSelect={onSelectMid}
            className="w-full max-w-xs text-left"
          />
        )}
      </CardContent>
    </Card>
  );
}
