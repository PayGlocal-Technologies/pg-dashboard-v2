import { Button, Card, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { NonWorkingDayExplanation } from "@/features/dashboard/settlement-reports/components/NonWorkingDayExplanation";
import type { SettlementRow } from "@/features/dashboard/settlement-reports/types";

interface SettlementReportInfoPanelProps {
  onClose: () => void;
  settlement: SettlementRow;
}

/** Explains the top "Download Report" button, opened via its info icon.
 * Same right-docked, non-overlay pattern as the list page's "About this
 * settlement" panel (SettlementCycleInfoPanel), so the interaction reads
 * identically wherever a merchant asks "why" on this feature. */
export function SettlementReportInfoPanel({ onClose, settlement }: SettlementReportInfoPanelProps) {
  return (
    <Card className="sticky top-4 gap-5 p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">About this settlement</p>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          aria-label="Close"
          className="h-7 w-7 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground"
        >
          <Icon name="x" size={14} />
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon name="file-text" size={16} />
        </span>
        <p className="text-sm font-semibold text-foreground">What is in this report?</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          The same amount breakdown and payment list shown on this page, for the transactions that
          made up this settlement cycle.
        </p>
      </div>

      {/* Only when a weekend or bank holiday actually moved the date. It answers
          "why did my Friday payments land on Monday", which stays a live
          question even for a settlement that has already completed. */}
      {settlement.affectedByNonWorkingDay &&
        settlement.nonWorkingDayDate &&
        settlement.nonWorkingDayReason && (
          <>
            <Separator />
            <NonWorkingDayExplanation
              paymentReceivedDate={settlement.paymentReceivedAt.slice(0, 10)}
              nonWorkingDayDate={settlement.nonWorkingDayDate}
              nonWorkingDayReason={settlement.nonWorkingDayReason}
              nonWorkingDayName={settlement.nonWorkingDayName}
              settlementDate={settlement.date.slice(0, 10)}
              settlementComplete
            />
          </>
        )}
    </Card>
  );
}
