"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils/format";

/**
 * A currency KPI that compacts to Indian short form (₹9.95L, ₹1.20Cr) once the
 * figure reaches a lakh, and reveals the exact grouped amount (₹9,95,393.34) in
 * a tooltip on hover. Anything under a lakh — five digits or fewer — renders in
 * full with no tooltip, since there is nothing left to expand.
 *
 * `className` styles the visible figure, so a caller passes the same typography
 * it would have put on its own <span>/<p>. Renders inline (a <span>) so it drops
 * into an existing baseline-aligned row unchanged.
 */
export function CompactAmount({
  amount,
  currency = "INR",
  locale = "en-IN",
  className,
}: {
  amount: number;
  currency?: string;
  locale?: string;
  className?: string;
}) {
  const compact = formatCurrencyCompact(amount, currency, locale);
  const full = formatCurrency(amount, currency, locale);

  // Under a lakh the two are identical — nothing was compacted, so a tooltip
  // would only repeat the figure already on screen.
  if (compact === full) {
    return <span className={className}>{full}</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("cursor-help", className)}>{compact}</span>
        </TooltipTrigger>
        <TooltipContent className="tabular-nums">{full}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
