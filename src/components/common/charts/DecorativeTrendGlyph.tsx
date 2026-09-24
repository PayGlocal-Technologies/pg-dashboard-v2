const UP_PATH = "M4,80 C60,58 100,20 150,16 C200,12 220,52 270,68 C320,84 360,78 396,64";
const DOWN_PATH = "M4,16 C60,38 100,76 150,80 C200,84 220,44 270,28 C320,12 360,18 396,32";

/**
 * A trend flourish for cards whose backend only returns one aggregate figure
 * for the whole period, not a day-by-day series — so there's nothing real to
 * chart. This is deliberately NOT a chart of real numbers: no axis, no
 * dates, no tooltip, nothing that claims a value it doesn't have. It's a
 * fixed decorative shape that fills the space a chart would, shaped to agree
 * with the trend figure already shown beside it (up when that's positive,
 * down when it isn't) rather than a generic always-the-same-shape filler
 * that could read as contradicting the number. Coloured blue/purple rather
 * than green/red: this is decoration, not a real data series, and a
 * card-sized wash of --destructive red reads as an alert/error state, not
 * "this happens to be trending down".
 */
export function DecorativeTrendGlyph({ positive = true }: { positive?: boolean }) {
  const gradientId = positive ? "trend-glyph-fill-up" : "trend-glyph-fill-down";
  const color = positive ? "var(--primary)" : "var(--chart-3)";
  const path = positive ? UP_PATH : DOWN_PATH;

  return (
    <svg
      viewBox="0 0 400 96"
      width="100%"
      height="96"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" y1="32" x2="400" y2="32" stroke="var(--chart-grid)" strokeWidth="1" />
      <line x1="0" y1="64" x2="400" y2="64" stroke="var(--chart-grid)" strokeWidth="1" />
      <path d={`${path} L396,92 L4,92 Z`} fill={`url(#${gradientId})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
