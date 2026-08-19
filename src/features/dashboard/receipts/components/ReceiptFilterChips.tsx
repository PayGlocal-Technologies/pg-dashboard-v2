"use client";

import { useState } from "react";
import {
  AmountFilterChip,
  type AmountRangeValue,
  type FilterChipOption,
} from "@/components/common/filters/FilterChips";
import { MonthFilterChip } from "@/features/dashboard/receipts/components/MonthFilterChip";
import { RECEIPT_AMOUNT_HINT } from "@/features/dashboard/receipts/constants";

/**
 * Amount and Month as one unit — the two filters the receipts table offers, and
 * no others.
 *
 * Amount is the product's existing AmountFilterChip, unchanged: a min/max range
 * with the same staged-draft-then-Apply semantics every other chip has. Month is
 * this page's own chip, built from the same shared primitives (see
 * MonthFilterChip). Both narrow independently and compose — an amount range and a
 * month applied together match only the rows satisfying both.
 *
 * This owns the "which popover is open" state itself rather than taking it as a
 * prop, and that ownership is load-bearing: the table renders this row twice —
 * once in its desktop control bar and once in its narrow-viewport one, with CSS
 * deciding which is visible — so both copies are mounted at all times. Lifting
 * `openChip` above them would make a click on the visible chip also open its
 * display:none twin, and a Radix popover anchored to a hidden trigger never
 * positions: it stays translated off-screen while still stacking above the real
 * one and competing for focus, so the visible popover appears to do nothing at
 * all. Each instance holding its own state means the hidden copy simply never
 * opens. (FilterChipsRow, the shared Date/Status/Currency row this replaced,
 * carries the same note for the same reason.)
 */
export function ReceiptFilterChips({
  idPrefix,
  amountRange,
  onAmountRangeChange,
  monthOptions,
  monthFilters,
  onMonthFiltersChange,
}: {
  /**
   * Distinguishes the Amount popover's min/max input ids between the two mounted
   * copies of this row. Both are in the DOM at once (only CSS hides one), so a
   * shared prefix would put duplicate ids on the page and point each `<label>` at
   * whichever input happened to come first — the hidden one.
   */
  idPrefix: string;
  amountRange: AmountRangeValue;
  onAmountRangeChange: (next: AmountRangeValue) => void;
  monthOptions: FilterChipOption[];
  monthFilters: string[];
  onMonthFiltersChange: (next: string[]) => void;
}) {
  const [openChip, setOpenChip] = useState<"amount" | "month" | null>(null);

  return (
    <>
      <AmountFilterChip
        value={amountRange}
        onChange={onAmountRangeChange}
        open={openChip === "amount"}
        onOpenChange={(next) => setOpenChip(next ? "amount" : null)}
        idPrefix={idPrefix}
        hint={RECEIPT_AMOUNT_HINT}
      />
      <MonthFilterChip
        options={monthOptions}
        selected={monthFilters}
        onChange={onMonthFiltersChange}
        open={openChip === "month"}
        onOpenChange={(next) => setOpenChip(next ? "month" : null)}
      />
    </>
  );
}
