"use client";

import { useState } from "react";
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
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

  const options: {
    key: string;
    icon: IconName;
    title: string;
    description: string;
    tag: string;
    onSelect: () => void;
  }[] = [
    {
      key: "full",
      icon: "rotate-ccw",
      title: "Accept in full",
      description: `Refund the full ${amountLabel} to the cardholder and close this dispute.`,
      tag: "Closes immediately",
      onSelect: () => setView("confirm-full"),
    },
    {
      key: "partial",
      icon: "scale",
      title: "Accept partially",
      description:
        "Refund part of the disputed amount and contest the rest with supporting evidence.",
      tag: "Needs documents",
      onSelect: () => {
        onOpenChange(false);
        onAcceptPartially();
      },
    },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-md">
        {view === "choice" ? (
          <>
            <div className="flex items-start gap-3 px-6 pt-6 pr-14">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="receipt" size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight">Accept dispute</DialogTitle>
                <DialogDescription className="mt-0.5 text-[13px]">
                  Choose how much of this dispute you want to accept.
                </DialogDescription>
              </div>
            </div>

            <div className="mx-6 mt-4 flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3.5 py-2.5">
              <span className="text-[13px] text-muted-foreground">Disputed amount</span>
              <span className="text-sm font-semibold tabular-nums text-foreground">
                {amountLabel}
              </span>
            </div>

            {/* Button wraps its children in one inline span, so each option's
             * layout lives on its own inner wrapper (see DisputeRespondForm's
             * upload dropzone for the same fix). */}
            <div className="flex flex-col gap-2.5 px-6 pt-4 pb-6">
              {options.map((opt) => (
                <Button
                  key={opt.key}
                  type="button"
                  variant="outline"
                  onClick={opt.onSelect}
                  className="group h-auto min-h-0 w-full justify-start rounded-xl p-4 text-left whitespace-normal shadow-none transition-colors hover:border-primary/60 hover:bg-primary/5 focus-visible:border-primary"
                >
                  <span className="flex w-full items-center gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                      <Icon name={opt.icon} size={18} aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{opt.title}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {opt.tag}
                        </span>
                      </span>
                      <span className="text-xs leading-relaxed font-normal text-muted-foreground">
                        {opt.description}
                      </span>
                    </span>
                    <Icon
                      name="chevron-right"
                      size={16}
                      aria-hidden
                      className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </span>
                </Button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start gap-3 px-6 pt-6 pr-14">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                <Icon name="alert-triangle" size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight">Accept dispute in full?</DialogTitle>
                <DialogDescription className="mt-0.5 text-[13px]">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>

            <dl className="mx-6 mt-4 divide-y divide-border rounded-lg border border-border">
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <dt className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Icon name="rotate-ccw" size={14} aria-hidden />
                  Refunded to the cardholder
                </dt>
                <dd className="text-sm font-semibold tabular-nums text-foreground">
                  {amountLabel}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                <dt className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <Icon name="x" size={14} aria-hidden />
                  Dispute outcome
                </dt>
                <dd className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Marked as lost
                </dd>
              </div>
            </dl>

            <div className="flex justify-end gap-2 px-6 pt-5 pb-6">
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Icon name="chevron-left" size={13} />}
                onClick={() => setView("choice")}
                className="shadow-none"
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
