import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  formatWeekdayDate,
  type NonWorkingDayReason,
} from "@/features/dashboard/settlement-reports/calendarUtils";

interface NonWorkingDayExplanationProps {
  /** YYYY-MM-DD, "Day 0". */
  paymentReceivedDate: string;
  /** YYYY-MM-DD, the specific non-working day being called out. */
  nonWorkingDayDate: string;
  nonWorkingDayReason: NonWorkingDayReason;
  /** Holiday name, only meaningful when nonWorkingDayReason === "holiday". */
  nonWorkingDayName?: string;
  /** YYYY-MM-DD, the resolved working day the settlement lands on. */
  settlementDate: string;
  /** Whether the settlement step below has already happened, defaults to
   * still-pending (amber clock) since this is mostly shown for open settlements. */
  settlementComplete?: boolean;
}

type StepTone = "complete" | "pending" | "skipped";

/**
 * Shared "why did this get pushed to the next working day" explainer, used
 * anywhere a settlement's schedule was affected by a weekend or bank
 * holiday, the info panel, the detail page banner, and the timeline dialog,
 * so the copy and visual treatment stay identical everywhere per the
 * settlement workflow's communication rules. Never rendered unless
 * `affectedByNonWorkingDay` is true on the caller's settlement/schedule,
 * this explanation only exists to answer a question that's actually live.
 */
export function NonWorkingDayExplanation({
  paymentReceivedDate,
  nonWorkingDayDate,
  nonWorkingDayReason,
  nonWorkingDayName,
  settlementDate,
  settlementComplete = false,
}: NonWorkingDayExplanationProps) {
  const nonWorkingLabel =
    nonWorkingDayReason === "holiday" ? (nonWorkingDayName ?? "Bank holiday") : "Non-working day";

  const steps: { label: string; date: string; tone: StepTone }[] = [
    { label: "Payment received", date: paymentReceivedDate, tone: "complete" },
    { label: nonWorkingLabel, date: nonWorkingDayDate, tone: "skipped" },
    {
      label: "Settlement",
      date: settlementDate,
      tone: settlementComplete ? "complete" : "pending",
    },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div>
        <p className="text-sm font-semibold text-foreground">
          Why is my settlement scheduled for the next working day?
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Payments received on weekends and bank holidays are processed on the next working day
          because banks do not process transfers on non-working days.
        </p>
      </div>

      <div className="flex flex-col">
        {steps.map((step, i) => (
          <div key={step.label} className="flex flex-col">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                  step.tone === "complete" && "bg-emerald-500 text-white",
                  step.tone === "pending" && "bg-amber-500 text-white",
                  step.tone === "skipped" && "bg-muted text-muted-foreground"
                )}
                aria-hidden
              >
                {step.tone === "complete" && <Icon name="check" size={11} strokeWidth={3} />}
                {step.tone === "pending" && <Icon name="clock" size={10} />}
                {step.tone === "skipped" && (
                  <span className="h-1.5 w-3 rounded-full bg-muted-foreground/50" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">{step.label}</p>
                <p className="text-[11px] text-muted-foreground">{formatWeekdayDate(step.date)}</p>
              </div>
            </div>
            {i < steps.length - 1 && <div className="ml-3 h-3 w-px bg-border" aria-hidden="true" />}
          </div>
        ))}
      </div>
    </div>
  );
}
