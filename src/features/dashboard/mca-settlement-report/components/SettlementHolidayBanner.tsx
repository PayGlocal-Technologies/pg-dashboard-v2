"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useSettlementCalendar } from "@/features/dashboard/mca-settlement-report/hooks";
import { formatDayMonth, formatWeekdayDate } from "@/lib/utils/format";

/**
 * One slim amber line at the top of the MCA Dashboard, Transactions and
 * Invoice management screens, shown only when a bank holiday pushes the
 * upcoming settlement to a later day. Same trigger and the same live holiday
 * calendar (/gcc/v1/calendar) as the Settlement Reports banner, so every
 * screen agrees on whether there is one. Renders nothing otherwise, and
 * nothing while the calendar loads, so it never flashes in and out.
 *
 * The × hides it until the page is next loaded.
 */
export function SettlementHolidayBanner() {
  const router = useRouter();
  const { upcomingSchedule: upcoming, isLoading } = useSettlementCalendar();
  const [dismissed, setDismissed] = useState(false);

  const show =
    !isLoading &&
    !dismissed &&
    upcoming.affectedByNonWorkingDay &&
    upcoming.nonWorkingDayReason === "holiday" &&
    !!upcoming.nonWorkingDayDate;
  if (!show) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 py-1.5 pr-1.5 pl-3 text-xs text-amber-900 animate-in fade-in duration-300 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <Icon
        name="calendar-days"
        size={14}
        className="shrink-0 text-amber-600 dark:text-amber-400"
        aria-hidden
      />
      <p className="min-w-0 flex-1 truncate">
        <span className="font-semibold">
          Bank holiday on {formatWeekdayDate(upcoming.nonWorkingDayDate!)}
        </span>
        {upcoming.nonWorkingDayName ? ` for ${upcoming.nonWorkingDayName}` : ""}
        <span className="text-amber-800/80 dark:text-amber-200/80">
          {" "}
          · Settlements move to the next working day, {formatDayMonth(upcoming.settlementDate)}
        </span>
      </p>
      <Button
        type="button"
        variant="link"
        size="sm"
        onClick={() => router.push("/mca-settlement-report")}
        className="hidden h-auto min-h-0 shrink-0 p-0 text-xs font-semibold text-amber-900 underline-offset-2 hover:underline sm:inline-flex dark:text-amber-200"
      >
        View calendar
      </Button>
      <IconButton
        type="button"
        variant="ghost"
        size="xs"
        aria-label="Dismiss bank holiday notice"
        onClick={() => setDismissed(true)}
        className="h-6 w-6 min-h-0 min-w-0 shrink-0 text-amber-700 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-500/15"
      >
        <Icon name="x" size={13} aria-hidden />
      </IconButton>
    </div>
  );
}
