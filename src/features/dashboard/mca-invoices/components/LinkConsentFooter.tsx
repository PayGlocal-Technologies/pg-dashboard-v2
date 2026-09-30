"use client";

import { useState } from "react";
import {
  Button,
  Checkbox,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * The consent tick and the Cancel/confirm pair, shared by both directions of
 * linking — an invoice looking for its transaction (LinkTransactionModal) and a
 * transaction looking for its invoice (LinkInvoiceModal).
 *
 * It is a FOOTER, not the last thing in the body, and that is the whole point.
 * Both dialogs sit a paginated table above this, so as soon as a merchant has
 * ten rows to choose from the consent box scrolled out of sight — leaving a
 * confirm button that is disabled with nothing on screen to explain why. Pinned
 * here it cannot be missed, whatever the table below does.
 *
 * `disabledReason` is the same idea from the other end: production puts a
 * tooltip on its disabled Link button, so hovering says what is still missing
 * rather than leaving the merchant to guess.
 */

/** Production's linkage consent, shown in both directions. */
export const CONSENT_TEXT = {
  short:
    "By proceeding with this action, you authorize the platform to attach the generated invoice to the selected transaction.",
  more: "You acknowledge that the accuracy and suitability of this linkage are solely your responsibility. PayGlocal Technologies Private Limited does not review, validate, or assume any liability for incorrect, incomplete, or inappropriate linkage or for any disputes or consequences arising from it.",
};

export function LinkConsentFooter({
  consent,
  onConsentChange,
  disabledReason,
  isPending,
  actionLabel,
  pendingLabel,
  onCancel,
  onConfirm,
}: {
  consent: boolean;
  onConsentChange: (next: boolean) => void;
  /** Why the action cannot run yet, or null when it can. Doubles as the
   *  disabled state, so the two can never disagree. */
  disabledReason: string | null;
  isPending: boolean;
  actionLabel: string;
  pendingLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const isDisabled = !!disabledReason || isPending;

  const action = (
    <Button
      type="button"
      variant="primary"
      size="sm"
      disabled={isDisabled}
      // A disabled button emits no pointer events, so without this the hover
      // would land on the button and never reach the tooltip's trigger.
      className={cn(isDisabled && "pointer-events-none")}
      onClick={onConfirm}
    >
      {isPending ? pendingLabel : actionLabel}
    </Button>
  );

  return (
    <div className="shrink-0 border-t border-border px-5 py-4">
      <label className="flex cursor-pointer items-start gap-3">
        <Checkbox
          checked={consent}
          onCheckedChange={(next) => onConsentChange(next === true)}
          className="mt-0.5"
        />
        <span className="text-[12.5px] text-muted-foreground">
          {CONSENT_TEXT.short}
          {showMore && <> {CONSENT_TEXT.more}</>}{" "}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto p-0 align-baseline text-[12.5px]"
            onClick={(e) => {
              // The label wraps this, so a bare click would also toggle the box.
              e.preventDefault();
              setShowMore((v) => !v);
            }}
          >
            {showMore ? "Show less" : "Show more"}
          </Button>
        </span>
      </label>

      <div className="mt-3 flex items-center justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        {disabledReason ? (
          <Tooltip>
            {/* The span is the trigger, not the button — see the className note
                above. inline-flex so it wraps the button without changing its
                box. */}
            <TooltipTrigger asChild>
              <span className="inline-flex">{action}</span>
            </TooltipTrigger>
            <TooltipContent>{disabledReason}</TooltipContent>
          </Tooltip>
        ) : (
          action
        )}
      </div>
    </div>
  );
}
