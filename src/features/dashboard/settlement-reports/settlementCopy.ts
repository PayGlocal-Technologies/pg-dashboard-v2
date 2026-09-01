import { formatWeekdayDate } from "@/lib/utils/format";
import type { SettlementRow } from "@/features/dashboard/settlement-reports/types";

// Single source of truth for settlement-state copy, the table's UTR
// tooltip, the detail page's banner, and anywhere else that explains "why"
// all read from here so the wording never drifts apart across surfaces (see
// the settlement workflow's communication rules, e.g. never say "delayed"
// for a weekend/holiday, never say "UTR missing").

/** "Not generated yet" is never the only explanation on its own. */
export function utrPendingReason(row: SettlementRow): string {
  if (row.affectedByNonWorkingDay && row.nonWorkingDayDate) {
    const reasonText =
      row.nonWorkingDayReason === "holiday"
        ? `${row.nonWorkingDayName ?? "a bank holiday"} (${formatWeekdayDate(row.nonWorkingDayDate)})`
        : "the weekend";
    return `Settlement is scheduled for the next working day because of ${reasonText}. The UTR will be generated once the bank transfer is processed.`;
  }
  return "The UTR is generated once the bank transfer is processed.";
}

export interface SettlementBannerCopy {
  title: string;
  body: string;
}

/** Banner shown on the detail page while a settlement is still processing. */
export function processingBannerCopy(row: SettlementRow): SettlementBannerCopy {
  if (!row.affectedByNonWorkingDay || !row.nonWorkingDayDate) {
    return {
      title: "Settlement is being processed",
      body: "Your payments have been received and are being processed for settlement. The settlement amount is available in the report below. The UTR will be generated once the bank transfer is processed.",
    };
  }

  const settlementDateLabel = formatWeekdayDate(row.date.slice(0, 10));

  if (row.nonWorkingDayReason === "holiday") {
    const holidayDateLabel = formatWeekdayDate(row.nonWorkingDayDate);
    return {
      title: "Settlement affected by a bank holiday",
      body: `Banks are closed on ${holidayDateLabel}${row.nonWorkingDayName ? ` for ${row.nonWorkingDayName}` : ""}. Your settlement is therefore scheduled for the next working day, ${settlementDateLabel}.`,
    };
  }

  return {
    title: "Settlement scheduled for the next working day",
    body: `Your payments have been received, but bank transfers are processed only on working days. This settlement is scheduled for ${settlementDateLabel}. The UTR will be generated once the bank transfer is processed.`,
  };
}
