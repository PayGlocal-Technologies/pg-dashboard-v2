import { applyColumnPreferences, type Column } from "@/components/ui";

/**
 * Re-orders an already-built column list to match a saved key order, keeping
 * "action" pinned last regardless: it is a utility column, not a data field
 * anyone would want to move. Columns missing from `order` (a field that only
 * exists for some roles, say) are appended before it rather than dropped.
 *
 * A thin adapter over flux's `applyColumnPreferences`, which is the same
 * function generalised — it also takes a `hidden` list and a custom set of
 * pinned keys. Kept under this name because the call sites read
 * `reorderColumns(cols, order)` and a `null` order means "no saved preference",
 * which is its own state rather than an empty arrangement.
 */
export function reorderColumns<T>(cols: Column<T>[], order: string[] | null): Column<T>[] {
  if (!order) return cols;
  return applyColumnPreferences(cols, { order });
}
