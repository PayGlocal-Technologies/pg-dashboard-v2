import type { ReactNode } from "react";
import type { Column } from "@/components/ui";

/**
 * A row's own action (e.g. "View details") as a trailing, header-less column,
 * so it sits right after the last data column instead of at the table's far
 * right edge, which is where Flux pins its `rowAction` slot (a zero-width
 * sticky cell with no placement option). Append it to the table's columns in
 * place of `rowAction`.
 *
 * Revealed on row hover or focus, as `rowAction` is: opacity only, so showing
 * it never shifts the row. Clicks on its buttons are skipped by DataTable's
 * row click, as they were in the overlay.
 */
export function rowActionColumn<T>(render: (row: T, index: number) => ReactNode): Column<T> {
  return {
    key: "__row-action",
    header: "",
    render: (row, index) => (
      <span className="inline-flex items-center gap-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {render(row, index)}
      </span>
    ),
  };
}
