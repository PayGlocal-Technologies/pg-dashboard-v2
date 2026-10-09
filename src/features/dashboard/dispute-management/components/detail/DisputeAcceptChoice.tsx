"use client";

import { useState } from "react";
import {
  Button,
  Callout,
  CalloutTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";
import { plural } from "@/features/dashboard/dispute-management/helpers";

interface DisputeAcceptChoiceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency: string;
  /** Days left to submit evidence, for the partial accept's "What happens next". */
  daysToRespond: number;
  /** pg-dashboard offers no partial accept at arbitration. */
  allowPartial: boolean;
  onAcceptFull: () => void;
  /** The amount to return to the customer, as typed. Accepted with the evidence, on its Submit. */
  onAcceptPartially: (acceptedAmount: string) => void;
  isAccepting: boolean;
}

type ChoiceView = "choice" | "confirm-full" | "partial";

/**
 * pg-dashboard's partial-amount rule (AcceptContestDrawer): required, and
 * between 0.01 and the disputed amount, both ends included.
 */
function acceptedAmountError(value: string, max: number): string | null {
  const text = value.trim();
  if (!text) return "Amount is required";
  if (!/^\d+(\.\d+)?$/.test(text)) return "The Amount must be a positive number";
  const n = Number(text);
  if (n < 0.01 || n > max) return `The Amount must be between 0.01 and ${max}`;
  return null;
}

/** Pop-up shown the moment "Accept dispute" is clicked. First asks full vs.
 * partial. "Accept in full" advances to an irreversible confirmation step;
 * "Accept partially" asks how much is returned to the customer, as
 * pg-dashboard's accept drawer does, then goes on to the evidence form; the
 * amount is accepted together with the evidence, on the form's Submit. */
export function DisputeAcceptChoice({
  open,
  onOpenChange,
  amount,
  currency,
  daysToRespond,
  allowPartial,
  onAcceptFull,
  onAcceptPartially,
  isAccepting,
}: DisputeAcceptChoiceProps) {
  const [view, setView] = useState<ChoiceView>("choice");
  const [partial, setPartial] = useState("");
  const [showError, setShowError] = useState(false);
  const amountLabel = `${formatCurrency(amount, currency)} ${currency}`;
  const partialError = acceptedAmountError(partial, amount);

  function handleOpenChange(next: boolean) {
    // Reset to the first step every time the dialog (re)opens, not via an
    // effect, see CLAUDE.md's hooks-purity rules.
    if (next) {
      setView("choice");
      setPartial("");
      setShowError(false);
    }
    onOpenChange(next);
  }

  function confirmPartial() {
    setShowError(true);
    if (partialError) return;
    onAcceptPartially(partial.trim());
  }

  const allOptions: {
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
      onSelect: () => setView("partial"),
    },
  ];
  const options = allOptions.filter((opt) => allowPartial || opt.key !== "partial");

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
        ) : view === "partial" ? (
          <>
            <div className="flex items-start gap-3 px-6 pt-6 pr-14">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon name="scale" size={18} aria-hidden />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-lg leading-tight">Accept a partial amount</DialogTitle>
                <DialogDescription className="mt-0.5 text-[13px]">
                  Out of {amountLabel} disputed.
                </DialogDescription>
              </div>
            </div>

            <form
              className="flex flex-col gap-4 px-6 pt-4 pb-6"
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                confirmPartial();
              }}
            >
              <Field>
                <FieldLabel htmlFor="dispute-accepted-amount">
                  Enter the amount you&apos;re agreeing to return to the customer{" "}
                  <span className="text-destructive">*</span>
                </FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id="dispute-accepted-amount"
                    inputMode="decimal"
                    placeholder="Enter amount"
                    value={partial}
                    aria-invalid={showError && !!partialError}
                    onChange={(e) => setPartial(e.target.value)}
                  />
                  <span className="shrink-0 text-sm text-muted-foreground">/ {amountLabel}</span>
                </div>
                {showError && partialError ? <FieldError>{partialError}</FieldError> : null}
              </Field>

              <Callout variant="warning">
                <Icon name="alert-triangle" size={16} aria-hidden className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <CalloutTitle className="text-sm font-semibold">What happens next</CalloutTitle>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] leading-relaxed opacity-90">
                    <li>
                      The accepted amount will be returned to the customer and settled from your
                      account
                    </li>
                    <li>You&apos;ll continue to contest the remaining amount</li>
                    <li>Supporting evidence will be required for contesting the remaining amount</li>
                    <li>Evidence must be submitted within {plural(Math.max(daysToRespond, 0), "day")}</li>
                  </ul>
                </div>
              </Callout>

              <div className="flex justify-end gap-2">
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
                <Button type="submit" variant="primary" size="sm" isLoading={isAccepting}>
                  {`Continue${partial.trim() && !partialError ? ` with ${formatCurrency(Number(partial), currency)} ${currency}` : ""}`}
                </Button>
              </div>
            </form>
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
