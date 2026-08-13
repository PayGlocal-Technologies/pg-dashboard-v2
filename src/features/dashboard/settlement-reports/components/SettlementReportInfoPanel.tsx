import { Button, Card, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { NonWorkingDayExplanation } from "@/features/dashboard/settlement-reports/components/NonWorkingDayExplanation";
import { processingBannerCopy } from "@/features/dashboard/settlement-reports/settlementCopy";
import { isSettlementComplete } from "@/features/dashboard/settlement-reports/columns";
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
  const isSettled = isSettlementComplete(settlement.status);
  const settleCopy = processingBannerCopy(settlement);

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
        <p className="text-sm font-semibold text-foreground">
          What does &quot;Available&quot; mean for this report?
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          This report is generated as soon as the transactions in this settlement cycle are
          finalized, even before the bank transfer completes. It includes the same amount breakdown
          and payment list shown below, whether or not the transfer has gone through yet.
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon name="clock" size={16} />
        </span>
        <p className="text-sm font-semibold text-foreground">
          {isSettled ? "When was this settled?" : "When will this settle?"}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {isSettled
            ? "This settlement has already been transferred to your registered bank account, the report reflects the exact transactions and amount that moved."
            : settleCopy.body}
        </p>
      </div>

      {!isSettled &&
        settlement.affectedByNonWorkingDay &&
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
            />
          </>
        )}
    </Card>
  );
}
