"use client";

import { Card, CardContent } from "@/components/ui";
import { Icon } from "@/components/icon";

const MID_TYPE_COPY: Record<"PACB" | "PA", { label: string; hint: string }> = {
  PACB: {
    label: "Global Fund Transfer Merchant ID",
    hint: "This feature requires a Global Fund Transfer Merchant ID. Use the Merchant ID dropdown in the header to select the appropriate merchant.",
  },
  PA: {
    label: "Card Payments Merchant ID",
    hint: "This feature requires a Card Payments Merchant ID. Use the Merchant ID dropdown in the header to select the appropriate merchant.",
  },
};

/**
 * Asks a multi-MID merchant to pick which account they mean.
 *
 * Ported from pg-dashboard's SelectMidView, wording included. It exists because
 * these features address a single MID in the request path rather than filtering
 * across several: with more than one to choose from, defaulting to the first
 * silently shows one account's data under another's name. Better to ask.
 *
 * Distinct from NoFeatureView, which answers "this MID cannot do this"; this one
 * answers "which MID did you mean".
 */
export function SelectMidView({ midType }: { midType?: "PACB" | "PA" }) {
  const copy = midType ? MID_TYPE_COPY[midType] : null;

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 px-8 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <Icon name="building-2" size={24} />
        </span>
        <div className="max-w-md space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            {copy ? `Select a ${copy.label}` : "Select a Merchant ID"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {copy?.hint ??
              "Use the Merchant ID dropdown in the header to choose a merchant, then you can use this feature for that account."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
