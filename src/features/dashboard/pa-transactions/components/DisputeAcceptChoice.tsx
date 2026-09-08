"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";

interface DisputeAcceptChoiceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency: string;
  onAcceptFull: () => void;
  onAcceptPartially: () => void;
}

type ChoiceView = "choice" | "confirm-full";

/** Pop-up shown the moment "Accept dispute" is clicked on DisputeActionCard,
 * not a full-screen navigation. First asks full vs. partial, "Accept
 * partially" closes the dialog and hands off to DisputeRespondForm (the
 * "screen approach"), "Accept in full" advances to a second, irreversible
 * confirmation step inside the same dialog before calling onAcceptFull. */
export function DisputeAcceptChoice({
  open,
  onOpenChange,
  amount,
  currency,
  onAcceptFull,
  onAcceptPartially,
}: DisputeAcceptChoiceProps) {
  const [view, setView] = useState<ChoiceView>("choice");
  const amountLabel = `${formatCurrency(amount, currency)} ${currency}`;

  function handleOpenChange(next: boolean) {
    // Reset to the first step every time the dialog (re)opens, not via an
    // effect, see CLAUDE.md's hooks-purity rules.
    if (next) setView("choice");
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={view === "choice" ? "sm:max-w-lg" : "sm:max-w-md"}>
        {view === "choice" ? (
          <>
            <DialogTitle>Accept dispute</DialogTitle>
            <DialogDescription>
              Choose how much of this {amountLabel} dispute you want to accept.
            </DialogDescription>

            {/* Button wraps all of its children in a single inline span, so
             * each option's title/description need their own flex-col
             * wrapper here, putting flex-col on the Button itself has no
             * effect since it only ever has that one wrapper span as a
             * direct child (see DisputeRespondForm's upload dropzone for the
             * same fix). */}
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setView("confirm-full")}
                className="h-full min-h-0 w-full items-start justify-start rounded-xl p-4 text-left"
              >
                <span className="flex flex-col items-start gap-1">
                  <span className="text-sm font-semibold text-foreground">Accept in full</span>
                  <span className="text-xs leading-relaxed whitespace-normal text-muted-foreground">
                    Refund the full disputed amount ({amountLabel}) to the cardholder and close this
                    dispute immediately.
                  </span>
                </span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  onAcceptPartially();
                }}
                className="h-full min-h-0 w-full items-start justify-start rounded-xl p-4 text-left"
              >
                <span className="flex flex-col items-start gap-1">
                  <span className="text-sm font-semibold text-foreground">Accept partially</span>
                  <span className="text-xs leading-relaxed whitespace-normal text-muted-foreground">
                    Refund only part of the disputed amount and contest the rest with supporting
                    evidence.
                  </span>
                </span>
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle>Accept dispute in full?</DialogTitle>
            <DialogDescription>
              {amountLabel} will be refunded to the cardholder and this dispute will be marked as
              lost. This action cannot be undone.
            </DialogDescription>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Icon name="chevron-left" size={13} />}
                onClick={() => setView("choice")}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onAcceptFull();
                }}
              >
                Confirm, refund customer
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
