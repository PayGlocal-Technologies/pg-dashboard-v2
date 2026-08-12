import { Button, Card, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { NonWorkingDayExplanation } from "@/features/dashboard/settlement-reports/components/NonWorkingDayExplanation";
import type { NonWorkingDayReason } from "@/features/dashboard/settlement-reports/calendarUtils";

interface UpcomingScheduleInfo {
  affectedByNonWorkingDay: boolean;
  /** YYYY-MM-DD, "today". */
  paymentReceivedDate: string;
  nonWorkingDayDate?: string;
  nonWorkingDayReason?: NonWorkingDayReason;
  nonWorkingDayName?: string;
  /** YYYY-MM-DD */
  settlementDate: string;
}

interface SettlementCycleInfoPanelProps {
  onClose: () => void;
  previousSettledDateLabel: string;
  previousSettledTimeLabel: string;
  previousSettledTransactionCount: number;
  /** Only rendered when affectedByNonWorkingDay is true, this panel never
   * shows a permanent weekend/holiday warning, see NonWorkingDayExplanation. */
  upcomingSchedule: UpcomingScheduleInfo;
}

/** Explains the "Previous settled" stat card, opened via its info icon.
 * Rendered as a persistent right-docked panel (see index.tsx) rather than an
 * overlay, so the rest of the page stays usable while it's open. */
export function SettlementCycleInfoPanel({
  onClose,
  previousSettledDateLabel,
  previousSettledTimeLabel,
  previousSettledTransactionCount,
  upcomingSchedule,
}: SettlementCycleInfoPanelProps) {
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
          <Icon name="building-2" size={16} />
        </span>
        <p className="text-sm font-semibold text-foreground">What does &quot;Previous settled&quot; include?</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          The net payout from your most recently completed settlement cycle, gross value across{" "}
          {previousSettledTransactionCount} transactions, minus tax and platform fees. It was credited to your bank
          account on {previousSettledDateLabel} at {previousSettledTimeLabel}.
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon name="clock" size={16} />
        </span>
        <p className="text-sm font-semibold text-foreground">What does a T+1 settlement cycle mean?</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Funds captured from a customer on one business day are transferred to your bank account the very next
          business day.
        </p>

        <div className="mt-1 flex items-start gap-2">
          <div className="flex flex-1 flex-col items-center gap-1 text-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Icon name="check" size={13} />
            </span>
            <p className="text-[11px] font-semibold text-foreground">Day 0</p>
            <p className="text-[11px] text-muted-foreground">Payment received from customer</p>
          </div>
          <div className="mt-3.5 h-px flex-1 border-t border-dashed border-border" />
          <div className="flex flex-1 flex-col items-center gap-1 text-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Icon name="check" size={13} />
            </span>
            <p className="text-[11px] font-semibold text-foreground">Day 1</p>
            <p className="text-[11px] text-muted-foreground">Settled to your bank account</p>
          </div>
        </div>
      </div>

      {upcomingSchedule.affectedByNonWorkingDay &&
        upcomingSchedule.nonWorkingDayDate &&
        upcomingSchedule.nonWorkingDayReason && (
          <>
            <Separator />
            <NonWorkingDayExplanation
              paymentReceivedDate={upcomingSchedule.paymentReceivedDate}
              nonWorkingDayDate={upcomingSchedule.nonWorkingDayDate}
              nonWorkingDayReason={upcomingSchedule.nonWorkingDayReason}
              nonWorkingDayName={upcomingSchedule.nonWorkingDayName}
              settlementDate={upcomingSchedule.settlementDate}
            />
          </>
        )}
    </Card>
  );
}
