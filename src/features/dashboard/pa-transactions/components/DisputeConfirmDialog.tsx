"use client";

import {
  Button,
  Callout,
  CalloutTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";
import { formatDisplayDateTime } from "@/features/dashboard/pa-transactions/paColumns";
import {
  ARBITRATION_FEE,
  WITHDRAWAL_FEE,
  formatFee,
} from "@/features/dashboard/pa-transactions/status/disputeStages";

/** Which confirmation, per the "Pre-arb and arb" design. */
export type DisputeConfirmKind = "contest-prearb" | "contest-arb" | "withdraw";

/**
 * The last check before an escalation step that can't be undone:
 *
 *  - contest-prearb: evidence will be needed, by the deadline; accepting may
 *    be safer without it.
 *  - contest-arb: this is the final stage, nothing can be added after it,
 *    and losing charges the arbitration fee.
 *  - withdraw: the dispute closes, the amount goes back to the customer, and
 *    a withdrawal fee is charged or not, depending on the case.
 */
export function DisputeConfirmDialog({
  kind,
  open,
  onOpenChange,
  amount,
  currency,
  respondBy,
  withdrawalFeeApplies,
  onConfirm,
}: {
  kind: DisputeConfirmKind | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  currency: string;
  respondBy?: string;
  withdrawalFeeApplies?: boolean;
  onConfirm: () => void;
}) {
  const money = `${formatCurrency(amount, currency)}`;
  const deadline = respondBy ? (formatDisplayDateTime(respondBy) ?? respondBy) : undefined;

  const content =
    kind === "withdraw"
      ? {
          title: "Do you want to withdraw this dispute and close the case?",
          lead: "If you withdraw at this stage:",
          points: [
            "The dispute will be closed",
            `${money} will be returned to the customer and settled from your account`,
            withdrawalFeeApplies
              ? `A withdrawal fee of ${formatFee(WITHDRAWAL_FEE)} will be charged and settled from your account`
              : "No arbitration withdrawal fee will be charged to you",
          ],
          tone: withdrawalFeeApplies ? ("warning" as const) : ("neutral" as const),
          confirm: "Confirm withdrawal",
        }
      : kind === "contest-arb"
        ? {
            title: `Do you want to proceed to arbitration for ${money}?`,
            lead: "Before you proceed, here's what to know",
            points: [
              "This is the final stage. No further documents or actions are allowed after this.",
              `If the dispute is lost, a ${formatFee(ARBITRATION_FEE)} arbitration fee will be charged`,
            ],
            tone: "warning" as const,
            confirm: "Contest dispute",
          }
        : {
            title: `Contest this dispute for ${money}?`,
            lead: "Before you proceed, here's what to know",
            points: [
              "You'll need to submit supporting evidence to contest this dispute",
              ...(deadline ? [`Documents must be submitted by ${deadline}`] : []),
            ],
            note: "If you don't have supporting evidence, accepting the dispute may be the safer option.",
            tone: "warning" as const,
            confirm: "Contest dispute",
          };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="pr-6">{content.title}</DialogTitle>
        <DialogDescription className="sr-only">
          Review what happens next before you confirm.
        </DialogDescription>
        <Callout variant={content.tone} className="mt-1">
          <Icon name="alert-triangle" size={16} aria-hidden className="mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <CalloutTitle className="text-sm font-semibold">{content.lead}</CalloutTitle>
            <div className="mt-1 text-sm leading-relaxed opacity-90">
              <ul className="list-disc space-y-0.5 pl-4 text-[13px]">
                {content.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        </Callout>
        {"note" in content && content.note && (
          <p className="text-[13px] text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> {content.note}
          </p>
        )}
        <div className="mt-2 flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {content.confirm}
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Go back
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
