import type { Column } from "@/components/ui";

/**
 * Re-orders an already-built column list to match a saved key order (from
 * ReorderColumnsPopover), keeping "action" pinned last regardless of order:
 * it's a utility column, not a data field a merchant would want to move
 * around. Appends any column missing from `order` (e.g. Merchant ID, which
 * only exists for partner users) right before it.
 */
export function reorderColumns<T>(cols: Column<T>[], order: string[] | null): Column<T>[] {
  if (!order) return cols;
  const actionCol = cols.find((c) => c.key === "action");
  const reorderable = cols.filter((c) => c.key !== "action");
  const byKey = new Map(reorderable.map((c) => [c.key, c]));
  const ordered = order.map((k) => byKey.get(k)).filter((c): c is Column<T> => !!c);
  const missing = reorderable.filter((c) => !order.includes(c.key));
  return [...ordered, ...missing, ...(actionCol ? [actionCol] : [])];
}
