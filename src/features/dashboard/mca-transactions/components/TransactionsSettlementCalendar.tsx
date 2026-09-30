"use client";

import { useScopeId } from "@/lib/hooks/useScopeId";
import { SettlementCalendarButton } from "@/features/dashboard/mca-settlement-report/components/SettlementCalendarButton";
import {
  useSettlementCalendar,
  useSettlementList,
} from "@/features/dashboard/mca-settlement-report/hooks";

/** Enough of the newest settlements to mark every settled day in the months a
 *  merchant would page back through from here; the full history lives on the
 *  Settlement Reports page. */
const RECENT_SETTLEMENTS_LIMIT = 50;

/**
 * The MCA Settlement Reports calendar, in the Transactions header: the same
 * popover, fed from the same two reads (the live holiday calendar and the
 * settlement list, scoped exactly as that page scopes them), so both pages
 * mark the same days.
 */
export function TransactionsSettlementCalendar() {
  const calendar = useSettlementCalendar();
  const { scopeId } = useScopeId("PACB");
  const { rows } = useSettlementList(scopeId, { page: 1, limit: RECENT_SETTLEMENTS_LIMIT });

  return (
    <SettlementCalendarButton
      rows={rows}
      todayKey={calendar.today}
      nextSettlementDate={calendar.nextSettlement.date}
      nextSettlementReason={calendar.nextSettlement.reason}
      nextSettlementSkippedDays={calendar.nextSettlement.skippedDays}
      hasUpcomingHoliday={calendar.hasUpcomingHoliday}
    />
  );
}
