"use client";

import { useState } from "react";
import {
  AmountFilterChip,
  MonthRangeFilterChip,
  type AmountRangeValue,
  type MonthRange,
} from "@/components/common/filters/FilterChips";
import { RECEIPT_AMOUNT_HINT } from "@/features/dashboard/receipts/constants";

/**
 * Amount and Month as one unit — the two filters the receipts table offers, and
 * no others.
 *
 * Both are shared chips from FilterChips.tsx: Amount is the min/max range every
 * other table uses, and Period is the year-and-month grid in its range form,
 * picking the start and end months the list request is bounded by.
 *
 * They do not narrow the same way. Amount is applied client-side over whatever
 * came back; Period goes into the request body, so changing it refetches. And
 * Period always has a value — the window the page opens on — which is why the
 * chip renders as active from first paint rather than reading as unset while it
 * silently bounds every row on screen.
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
  periodBounds,
  monthsWithData,
  period,
  defaultPeriod,
  onPeriodChange,
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
  /** The outer limits the Period grid can navigate within. */
  periodBounds: MonthRange;
  monthsWithData: Set<string>;
  /** The window currently in force, and in the request body. */
  period: MonthRange;
  /** What the chip's Reset goes back to. */
  defaultPeriod: MonthRange;
  onPeriodChange: (next: MonthRange) => void;
}) {
  const [openChip, setOpenChip] = useState<"amount" | "period" | null>(null);

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
      <MonthRangeFilterChip
        bounds={periodBounds}
        value={period}
        defaultRange={defaultPeriod}
        monthsWithData={monthsWithData}
        onChange={onPeriodChange}
        open={openChip === "period"}
        onOpenChange={(next) => setOpenChip(next ? "period" : null)}
      />
    </>
  );
}
