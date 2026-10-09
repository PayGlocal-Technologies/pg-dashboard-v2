import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Every table's Amount column is right-aligned so the currency code's last
 * letter lines up under the last letter of the "Amount" header. The code
 * follows the figure at its own width, a small gap after it (a fixed slot
 * left a visible hole after a narrow code); codes are all three letters, so
 * the figures still end within a pixel or two of each other. A value with no
 * code is padded by about a code's width so it ends where the figures do.
 *
 * Use with the column's `align: "right"`:
 *   { header: <AmountHeader />, align: "right",
 *     render: (row) => <AmountWithCode amount={…} code={row.currency} /> }
 * A column with no currency code uses a plain "Amount" header.
 */

/** About a three-letter code at 11px (~22px) plus the gap before it (gap-1, 4px). */
const CODE_OFFSET = "pr-[26px]";

/** The "Amount" header, ending where the currency codes below it end. */
export function AmountHeader({ children = "Amount" }: { children?: ReactNode }) {
  return <span>{children}</span>;
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
      className={cn("inline-flex items-baseline justify-end gap-1 whitespace-nowrap", className)}
    >
      <span
        className={cn("text-[13px] font-semibold tabular-nums text-foreground", amountClassName)}
      >
        {amount}
      </span>
      <span
        className={cn(
          "shrink-0 text-[11px] font-medium text-muted-foreground",
          codeClassName
        )}
      >
        {code}
      </span>
    </span>
  );
}
