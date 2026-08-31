"use client";

import { TimeRangeTabs } from "@/components/common/TimeRangeTabs";
import {
  TIME_RANGE_OPTIONS,
  type TimeRange,
} from "@/features/dashboard/mca-transactions/components/SettlementAnalyticsCard";

interface AnalyticsTimeRangeControlProps {
  value: TimeRange;
  onValueChange: (value: TimeRange) => void;
}

/**
 * The Today/This week/This month/Year to date control that drives the
 * Transactions page's Analytics section (see SettlementAnalyticsCard's own
 * TIME_RANGE_MULTIPLIERS comment for what it actually redraws). Rendered as
 * the page header's action, in line with the "Transactions" title, rather
 * than inside the Analytics cards themselves.
 *
 * The markup this used to carry now lives in the shared `TimeRangeTabs`, which
 * Invoice management's summary uses too — this file is what supplies the
 * transactions-specific options, so the call site is unchanged.
 */
export function AnalyticsTimeRangeControl({ value, onValueChange }: AnalyticsTimeRangeControlProps) {
  return (
    <TimeRangeTabs
      options={TIME_RANGE_OPTIONS}
      value={value}
      onValueChange={onValueChange}
      label="Analytics time range"
    />
  );
}
