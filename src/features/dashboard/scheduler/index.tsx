"use client";

import { PageHeader } from "@/components/ui";
import { MidGuard } from "@/components/common/MidGuard";
import { SelectMidView } from "@/components/common/SelectMidView";
import { useApp } from "@/stores/useApp";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { SchedulerTable } from "@/features/dashboard/scheduler/components/SchedulerTable";
import {
  SCHEDULER_FEATURE,
  SCHEDULER_PAGE_SUBTITLE,
} from "@/features/dashboard/scheduler/constants";

/**
 * Scheduler, at /scheduler, gated as pg-dashboard gates it:
 *
 *  - A multi-MID merchant with no MID chosen picks one first: the scheduler is
 *    read for a single MID.
 *  - A chosen MID must be PA and carry the SCHEDULER feature, else MidGuard
 *    shows the standard "not available for this MID" view.
 */
export function SchedulerFeature() {
  const isMultiMidUser = useApp((s) => s.isMultiMidUser);
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader title="Scheduler" subtitle={SCHEDULER_PAGE_SUBTITLE} />
      {isMultiMidUser && !selectedMid ? (
        <SelectMidView midType="PA" />
      ) : (
        <MidGuard productType="PA" feature={SCHEDULER_FEATURE}>
          <SchedulerTable />
        </MidGuard>
      )}
    </div>
  );
}
