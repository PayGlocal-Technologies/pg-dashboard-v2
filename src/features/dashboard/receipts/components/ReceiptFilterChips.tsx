"use client";

import { useState } from "react";
import {
  DateFilterChip,
  StatusFilterChip,
  type DateRangeValue,
} from "@/components/common/filters/FilterChips";
import { RECEIPT_STATUS_FILTERS } from "@/features/dashboard/receipts/constants";

/**
 * Date and Status as one unit — the two filters the receipts table offers, and no
 * others.
 *
 * A trimmed sibling of FilterChipsRow, which pairs those two with Currency. It
 * isn't reused here because every receipt is billed in INR (see Receipt.currency
 * — a receipt is PayGlocal's own tax invoice for a month's fees, not a record of
 * what a collection arrived in), so a Currency chip would offer exactly one
 * option and could never change the result. A control that cannot narrow anything
 * is worse than no control.
 *
 * Like FilterChipsRow, this owns the "which popover is open" state itself rather
 * than taking it as a prop, and for the same load-bearing reason: the table
 * renders this row twice — once in its desktop control bar and once in its
 * narrow-viewport one, with CSS deciding which is visible — so both copies are
 * mounted at all times. Lifting `openChip` above them would make a click on the
 * visible chip also open its display:none twin, and a Radix popover anchored to a
 * hidden trigger never positions: it stays translated off-screen while still
 * stacking above the real one and competing for focus, so the visible popover
 * appears to do nothing at all. Each instance holding its own state means the
 * hidden copy simply never opens.
 */
export function ReceiptFilterChips({
  dateRange,
  onDateRangeChange,
  statusFilters,
  onStatusFiltersChange,
}: {
  dateRange: DateRangeValue;
  onDateRangeChange: (next: DateRangeValue) => void;
  statusFilters: string[];
  onStatusFiltersChange: (next: string[]) => void;
}) {
  const [openChip, setOpenChip] = useState<"date" | "status" | null>(null);

  return (
    <>
      <DateFilterChip
        value={dateRange}
        onChange={onDateRangeChange}
        open={openChip === "date"}
        onOpenChange={(next) => setOpenChip(next ? "date" : null)}
      />
      <StatusFilterChip
        options={RECEIPT_STATUS_FILTERS}
        selected={statusFilters}
        onChange={onStatusFiltersChange}
        open={openChip === "status"}
        onOpenChange={(next) => setOpenChip(next ? "status" : null)}
      />
    </>
  );
}
