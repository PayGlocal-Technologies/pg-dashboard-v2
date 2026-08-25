"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
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
 * Tabs (hidden below md) on desktop/tablet, Select (hidden md and up) on
 * mobile; both drive the same state, so switching viewport width mid-session
 * never desyncs which one "wins".
 */
export function AnalyticsTimeRangeControl({ value, onValueChange }: AnalyticsTimeRangeControlProps) {
  return (
    <>
      <Tabs
        value={value}
        onValueChange={(v) => onValueChange(v as TimeRange)}
        className="hidden md:block"
      >
        {/* Plain underlined tabs per the reference, not flux Tabs' own
            pill/segmented look: no container background/border/padding, a
            gap-4 row of triggers, each just an underline + colour change on
            the active one rather than a filled pill. Still Radix Tabs
            underneath (keyboard nav, aria-selected, the works), only the
            className overrides differ. */}
        <TabsList className="h-auto gap-4 rounded-none border-0 bg-transparent p-0">
          {TIME_RANGE_OPTIONS.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className="rounded-none border-b-2 border-transparent px-0 py-1 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Select value={value} onValueChange={(v) => onValueChange(v as TimeRange)}>
        <SelectTrigger className="w-32 md:hidden" aria-label="Time range">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIME_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
