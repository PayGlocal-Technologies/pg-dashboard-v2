/** Settlement account details can be changed once in this many days. */
export const SETTLEMENT_CHANGE_INTERVAL_DAYS = 30;

/**
 * MOCK: when the settlement account was last changed (YYYY-MM-DD), or null if
 * it never has been. No endpoint returns this yet (the /settlement read is
 * only the account number and IFSC), so the 30-day lock is mock-driven until
 * one does. Set to null, or to a date more than 30 days back, to see the
 * editable state.
 */
export const MOCK_SETTLEMENT_LAST_CHANGED_DATE: string | null = "2026-09-28";

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

function toKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface SettlementChangePolicy {
  /** YYYY-MM-DD the details can next be changed, or null if never changed. */
  nextChangeDate: string | null;
  isEditable: boolean;
  /** Whole calendar days until editable; 0 once it is. */
  daysUntilEditable: number;
  /** True when there was a change and its 30 days have run out. */
  windowJustEnded: boolean;
}

/**
 * Everything the card shows about the 30-day rule, from the one stored fact
 * (when it last changed) and today. Calendar days, counted between local
 * midnights, so the count never drifts by an hour across a DST change.
 */
export function settlementChangePolicy(
  lastChangedDate: string | null,
  todayKey: string
): SettlementChangePolicy {
  if (!lastChangedDate) {
    return { nextChangeDate: null, isEditable: true, daysUntilEditable: 0, windowJustEnded: false };
  }
  const next = parseKey(lastChangedDate);
  next.setDate(next.getDate() + SETTLEMENT_CHANGE_INTERVAL_DAYS);
  const days = Math.round((next.getTime() - parseKey(todayKey).getTime()) / 86_400_000);
  const daysUntilEditable = Math.max(0, days);
  return {
    nextChangeDate: toKey(next),
    isEditable: daysUntilEditable === 0,
    daysUntilEditable,
    windowJustEnded: daysUntilEditable === 0,
  };
}

/** "28 days", "1 day". */
export function formatDayCount(days: number): string {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** Where a merchant locked out of a change is pointed for help. */
export const SETTLEMENT_SUPPORT_EMAIL = "merchant.support@payglocal.in";
