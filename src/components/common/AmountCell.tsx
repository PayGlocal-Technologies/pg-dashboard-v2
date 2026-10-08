import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Every table's Amount column is right-aligned so the figures' last digits
 * line up under the last letter of the "Amount" header. The currency code
 * that follows a figure sits in a fixed-width slot after it, so every figure
 * ends at the same x whatever the code, and the header is padded by that
 * slot plus the gap before it, so its text ends exactly there too.
 *
 * Use with the column's `align: "right"`:
 *   { header: <AmountHeader />, align: "right",
 *     render: (row) => <AmountWithCode amount={…} code={row.currency} /> }
 * A column with no currency code uses a plain "Amount" header.
 */

/** The code slot (w-7, 28px) plus the gap before it (gap-1.5, 6px). */
const CODE_OFFSET = "pr-[34px]";

/** The "Amount" header, ending where the figures below it end. */
export function AmountHeader({ children = "Amount" }: { children?: ReactNode }) {
  return <span className={CODE_OFFSET}>{children}</span>;
}

/** Pads a value with no code (a dash, "Customer decides") so it ends where
 *  the figures do. */
export function AmountPlaceholder({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("inline-block", CODE_OFFSET, className)}>{children}</span>;
}

/** A formatted figure and its currency code, the code in its fixed slot. */
export function AmountWithCode({
  amount,
  code,
  className,
  amountClassName,
  codeClassName,
}: {
  amount: ReactNode;
  code?: ReactNode;
  className?: string;
  amountClassName?: string;
  codeClassName?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-baseline justify-end gap-1.5 whitespace-nowrap", className)}
    >
      <span
        className={cn("text-[13px] font-semibold tabular-nums text-foreground", amountClassName)}
      >
        {amount}
      </span>
      <span
        className={cn(
          "w-7 shrink-0 text-left text-[11px] font-medium text-muted-foreground",
          codeClassName
        )}
      >
        {code}
      </span>
    </span>
  );
}
