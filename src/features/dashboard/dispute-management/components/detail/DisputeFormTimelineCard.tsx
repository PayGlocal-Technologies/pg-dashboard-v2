"use client";

import { Card } from "@/components/ui";
import { SectionLabel } from "@/features/dashboard/pa-transactions/components/TransactionDetailPrimitives";
import {
  SettlementTimelineStepper,
  type SettlementStepStatus,
} from "@/features/dashboard/mca-transactions/components/SettlementTimelineStepper";

export type DisputeFormStepState = "complete" | "current" | "locked";

export interface DisputeFormStep {
  label: string;
  description: string;
  state: DisputeFormStepState;
}

/** Each form step as the MCA timeline draws it. */
const STEPPER_STATUS: Record<DisputeFormStepState, SettlementStepStatus> = {
  complete: "success",
  current: "inProgress",
  locked: "pending",
};

/** The step list itself, shared by DisputeFormTimelineCard (wrapped in its
 * own Card below) and DisputeStatusNoticeCard (embedded directly inside an
 * already-existing card). Drawn by the MCA Transactions timeline, so every
 * dispute timeline has the same ticks and connecting line. */
export function DisputeStepList({ steps }: { steps: DisputeFormStep[] }) {
  return (
    <SettlementTimelineStepper
      items={steps.map((step) => ({
        status: STEPPER_STATUS[step.state],
        title: step.label,
        subtitle: step.description,
      }))}
    />
  );
}

interface DisputeFormTimelineCardProps {
  steps: DisputeFormStep[];
}

/** Live progress tracker for the Contest/Accept-partially form (see
 * DisputeRespondForm), a vertical-line timeline where each step ticks the
 * instant its matching form field/action is completed, steps beyond the
 * current one show locked until reached. This tracks the form's own
 * progress, not the dispute's overall lifecycle (see PaymentTimeline, a
 * different card on the main dispute detail page). */
export function DisputeFormTimelineCard({ steps }: DisputeFormTimelineCardProps) {
  return (
    <div className="flex flex-col gap-2">
      <SectionLabel>Timeline</SectionLabel>
      <Card className="shadow-none gap-0 p-5">
        <DisputeStepList steps={steps} />
      </Card>
    </div>
  );
}
