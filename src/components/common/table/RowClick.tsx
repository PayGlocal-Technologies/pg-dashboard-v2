"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Wraps every cell's content in a clickable-row table, including the Actions
 * column, so the whole row (not just its rendered text) is a click target.
 *
 * DataTable's own `<td>` owns the cell's padding (px-3 py-2.5 at compact
 * density, see flux-ui's data-table.tsx cellPad), which sits outside whatever
 * this component renders, so clicking that padding/whitespace would otherwise
 * do nothing. The negative margin + matching padding below pushes this div's
 * box out to the cell's edges and re-adds the same padding from inside it,
 * making the entire cell (whitespace included) clickable without changing
 * where its content visually sits. h-full stretches it to the row's full
 * height too.
 *
 * Buttons rendered inside (Upload Invoice, Copy Link, …) must stop
 * propagation in their own onClick so they keep performing only their own
 * action instead of also triggering this row-level click.
 */
export function RowClick({
  onClick,
  align,
  children,
}: {
  onClick: () => void;
  align?: "left" | "right" | "center";
  children: ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "-mx-3 -my-2.5 flex h-full min-h-[44px] cursor-pointer items-center px-3 py-2.5",
        align === "right" && "justify-end",
        align === "center" && "justify-center"
      )}
    >
      {children}
    </div>
  );
}
