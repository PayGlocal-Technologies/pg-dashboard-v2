"use client";

import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { SettlementDetailsContent } from "@/features/dashboard/settlement-reports/components/SettlementDetailsContent";
import type { SettlementRow } from "@/features/dashboard/settlement-reports/types";

/**
 * The expanded view of a settlement, in place of the list (the same pattern
 * as a transaction's details page): Back to the list, Collapse back into the
 * drawer, then the details with the full payments table.
 */
export function SettlementDetailsPage({
  settlement,
  onBack,
  onCollapse,
  onDownload,
}: {
  settlement: SettlementRow;
  onBack: () => void;
  onCollapse?: () => void;
  onDownload?: () => void;
}) {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-4 flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="chevron-left" className="h-4 w-4" />}
          onClick={onBack}
          className="pl-0 text-primary hover:text-primary-hover"
        >
          Back to Settlements
        </Button>
        {onCollapse && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="shrink" className="h-4 w-4" />}
            onClick={onCollapse}
            className="text-muted-foreground hover:text-foreground"
          >
            Collapse
          </Button>
        )}
      </div>
      <SettlementDetailsContent settlement={settlement} layout="page" onDownload={onDownload} />
    </div>
  );
}
