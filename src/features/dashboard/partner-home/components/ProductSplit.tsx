/** The two products' colours, shared by every split and the legend. */
export const PRODUCT_COLOURS = {
  pa: "var(--chart-1)",
  mca: "var(--chart-4)",
} as const;

export const PRODUCT_NAMES = { pa: "Payment gateway", mca: "MCA" } as const;

/**
 * One KPI by product: a thin two-tone bar, then a row per product with its
 * value and share. `shares={false}` drops the percentages, for counts where
 * the two can overlap (a merchant on both products counts under each).
 */
export function ProductSplit({
  split,
  format,
  shares = true,
}: {
  split: { pa: number; mca: number };
  format: (n: number) => string;
  shares?: boolean;
}) {
  const total = split.pa + split.mca;
  const paPct = total > 0 ? Math.round((split.pa / total) * 100) : 0;
  const rows = [
    { key: "pa" as const, value: split.pa, pct: paPct },
    { key: "mca" as const, value: split.mca, pct: total > 0 ? 100 - paPct : 0 },
  ];

  return (
    <div>
      {/* Two segments with a 2px surface gap, each rounded at its own ends. */}
      <div
        className="flex h-1.5 gap-0.5 overflow-hidden rounded-full"
        role="img"
        aria-label={`${PRODUCT_NAMES.pa} ${paPct}%, ${PRODUCT_NAMES.mca} ${100 - paPct}%`}
      >
        {rows.map((r) =>
          r.pct > 0 ? (
            <span
              key={r.key}
              className="h-full rounded-full"
              style={{ width: `${r.pct}%`, backgroundColor: PRODUCT_COLOURS[r.key] }}
            />
          ) : null
        )}
      </div>
      <dl className="mt-2.5 space-y-1">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3 text-xs">
            <dt className="flex items-center gap-1.5 text-muted-foreground">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PRODUCT_COLOURS[r.key] }}
              />
              {PRODUCT_NAMES[r.key]}
            </dt>
            <dd className="font-medium tabular-nums text-foreground">
              {format(r.value)}
              {shares && <span className="text-muted-foreground"> · {r.pct}%</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
