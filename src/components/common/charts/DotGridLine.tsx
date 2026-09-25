/**
 * A `<CartesianGrid>` `horizontal`/`vertical` line, redrawn as a row of dots
 * instead of a solid/dashed stroke — still anchored to the real Y-axis tick
 * (or X-axis tick) coordinate recharts computed, unlike a plain CSS
 * background pattern, which has no idea where "₹75Cr" actually sits and so
 * can't line up with it. Pass as `<CartesianGrid horizontal={DotGridLine} />`.
 *
 * Typed as `any`: recharts' own type for this render-prop
 * (`GridLineTypeFunctionProps`, in cartesian/CartesianGrid.d.ts) isn't part
 * of its public export surface, and its `offset` field collides with SVG's
 * own `offset` attribute in a way that makes a structurally equivalent local
 * type fail assignability anyway — only x1/y1/x2/y2 are read here, so there
 * is nothing an exact type would actually protect against.
 */
export function DotGridLine({ x1, y1, x2, y2 }: any) {
  const nx1 = Number(x1);
  const ny1 = Number(y1);
  const nx2 = Number(x2);
  const ny2 = Number(y2);
  // Never null: recharts' own type for this render-prop requires an
  // element back, not a nullable one — an empty <g> is the equivalent of
  // "nothing to draw" for whatever bad/missing coordinates recharts might
  // hand in.
  if ([nx1, ny1, nx2, ny2].some((n) => Number.isNaN(n))) return <g />;

  const horizontal = ny1 === ny2;
  const spacing = 8;
  const length = horizontal ? nx2 - nx1 : ny2 - ny1;
  const count = Math.max(0, Math.floor(length / spacing));

  return (
    <g>
      {Array.from({ length: count + 1 }, (_, i) => {
        const cx = horizontal ? nx1 + i * spacing : nx1;
        const cy = horizontal ? ny1 : ny1 + i * spacing;
        return <circle key={i} cx={cx} cy={cy} r={1} fill="var(--chart-grid)" />;
      })}
    </g>
  );
}
