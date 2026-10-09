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
import { formatTimestamp } from "@/lib/utils/format";
import {
  formatFee,
  formatFeeWithCode,
} from "@/features/dashboard/dispute-management/disputeStages";
import type { DisputeCase } from "@/features/dashboard/dispute-management/types";

/** Which confirmation: contest (first round and pre-arbitration), contest at arbitration, withdraw. */
export type DisputeConfirmKind = "contest" | "contest-arb" | "withdraw";

/**
 * The last check before a step that can't be undone, with pg-dashboard's
 * merchant copy (AcceptContestDrawer's CONTEST/ARBITRATION_EXTERNAL_INFO,
 * CbWithdrawDrawer's ARB_EXTERNAL_WITHDRAW_INFO) and the dispute's own fees.
 */
export function DisputeConfirmDialog({
  kind,
  open,
  onOpenChange,
  dispute,
  onConfirm,
}: {
  kind: DisputeConfirmKind | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispute: DisputeCase;
  onConfirm: () => void;
}) {
  const money = formatCurrency(dispute.amount, dispute.currency);
  const deadline = formatTimestamp(dispute.dueDate, "");

  const content =
    kind === "withdraw"
      ? {
          title: "Do you want to withdraw this dispute and close the case?",
          lead: "If you withdraw at this stage:",
          points: [
            "The dispute will be closed",
            "Amount will be returned to the customer and settled from your account",
            dispute.withdrawalFee
              ? `Arbitration withdrawal fee of ${formatFeeWithCode(dispute.withdrawalFee)} will be charged to you`
              : "No arbitration withdrawal fee will be charged to you",
          ],
          tone: "warning" as const,
          confirm: "Confirm withdrawal",
        }
      : kind === "contest-arb"
        ? {
            title: `Do you want to proceed to arbitration for ${money}?`,
            lead: "Before you proceed, here's what to know",
            points: [
              "This is the final stage. No further documents or actions are allowed at this stage.",
              dispute.penaltyFee
                ? `If the dispute is lost, an arbitration fee of ${formatFee(dispute.penaltyFee)} may apply`
                : "If the dispute is lost, an additional fee may be charged",
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
            // Opens the evidence form; the contest is sent with the evidence, on Submit.
            confirm: "Continue",
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
