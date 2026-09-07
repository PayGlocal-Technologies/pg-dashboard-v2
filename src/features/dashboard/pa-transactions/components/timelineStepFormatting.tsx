"use client";

import { Button } from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import { formatDisplayDateTime } from "@/features/dashboard/pa-transactions/paColumns";
import { getDisputeReasonMeta } from "@/features/dashboard/pa-transactions/disputeReasonMeta";
import type { TimelineStep } from "@/features/dashboard/pa-transactions/components/PaymentTimeline";
import type { TimelineStepData } from "@/features/dashboard/pa-transactions/financial/types";

/** Formats one deriveTimelineSteps/deriveDisputeOnlyTimelineSteps entry's
 * description text/JSX. Switches on the step's own (stable, centrally-
 * defined) label rather than sniffing its id, every label this function
 * doesn't special-case just falls back to the formatted date. Shared by the
 * parent transaction's full-lifecycle timeline and a dispute's own
 * lifecycle timeline, so the two can never describe the same event
 * differently. */
function describeTimelineStep(
  step: TimelineStepData,
  when: string | undefined,
  amountLabel: string | undefined,
  onViewSettlement: (settlementId: string) => void
): TimelineStep["description"] {
  switch (step.label) {
    case "Settled":
      return (
        <span className="flex flex-wrap items-center gap-x-1.5">
          <span>{when}</span>
          {step.utrNumber && (
            <>
              <span aria-hidden="true">·</span>
              <span>{step.utrNumber}</span>
            </>
          )}
          {step.settlementReportId && (
            <Button
              type="button"
              variant="link"
              onClick={() => onViewSettlement(step.settlementReportId!)}
              className="h-auto min-h-0 p-0 text-xs font-medium"
            >
              View settlement
            </Button>
          )}
        </span>
      );
    case "Settlement in progress":
      return step.expectedOnDate
        ? (formatDisplayDateTime(step.expectedOnDate) ?? step.expectedOnDate)
        : undefined;
    case "Refund initiated":
    case "Refund failed":
      return `${amountLabel} · ${when}`;
    case "Partially refunded":
    case "Refunded":
      return `${step.isAdditionalRefund ? "Additional " : ""}${amountLabel} refunded · ${when}`;
    case "Dispute raised":
      return (
        <span className="flex flex-col gap-0.5">
          <span>
            {amountLabel} disputed · {when}
          </span>
          {step.reason && (
            <span>
              {getDisputeReasonMeta(step.reason).merchantLabel} · Reason code{" "}
              {step.reasonCode ?? getDisputeReasonMeta(step.reason).reasonCode}
            </span>
          )}
        </span>
      );
    case "Awaiting your response":
      return step.respondBy
        ? `Respond by ${formatDisplayDateTime(step.respondBy) ?? step.respondBy}`
        : undefined;
    case "Under review":
      return "Evidence submitted, awaiting the card network's decision";
    case "Bank review":
      return "Bank is reviewing the evidence. We'll notify you when we have a decision from the bank.";
    case "Insufficient documents":
      return "We need more information to investigate this dispute. Please upload additional documents to submit more supporting evidence.";
    default:
      return when;
  }
}

/** JSX presentation for a list of centrally-derived timeline steps (either
 * the full parent lifecycle from deriveTimelineSteps, or one dispute's own
 * slice from deriveDisputeOnlyTimelineSteps). All the actual event logic
 * (which events exist, their order, their labels, the running refunded-so-
 * far total) lives in generateTimeline.ts, this only formats each step's
 * timestamp/amount into display text. */
export function formatTimelineSteps(
  steps: TimelineStepData[],
  currency: string,
  onViewSettlement: (settlementId: string) => void
): TimelineStep[] {
  return steps.map((step) => {
    const when = step.timestamp
      ? (formatDisplayDateTime(step.timestamp) ?? step.timestamp)
      : undefined;
    const amountLabel =
      step.amount != null ? formatCurrency(step.amount, step.currency ?? currency) : undefined;
    return {
      id: step.id,
      label: step.label,
      description: describeTimelineStep(step, when, amountLabel, onViewSettlement),
      state: step.state,
    };
  });
}
