"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { DotGridLine } from "@/components/common/charts/DotGridLine";
import { cn } from "@/lib/utils";

/** X-axis labels for an empty chart, per summary period. Static on purpose:
 *  there's no data to place, only the frame the data would appear in. */
const YEAR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const EMPTY_AXIS_LABELS = {
  today: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
  week: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  month: ["1", "5", "10", "15", "20", "25", "30"],
  quarter: ["Week 1", "Week 4", "Week 7", "Week 10", "Week 13"],
  year: YEAR,
  ytd: YEAR,
} satisfies Record<string, string[]>;

// Four gridlines above ₹0; only the baseline is labelled, so no made-up
// values appear on an axis with nothing to measure.
const Y_TICKS = [0, 1, 2, 3, 4];

/**
 * THE empty state for every chart on the platform: the same axes and dotted
 * gridlines as a loaded chart, a flat line along zero, and a short caption,
 * instead of an illustration. Fills its parent (give it a sized, `relative`
 * box), so it never changes the card's height.
 *
 * `hideAxes` is for charts that draw no axes when loaded (trend-line-only
 * metric cards): the gridlines and flat line stay, the tick labels go.
 */
export function EmptyAxesChart({
  labels,
  title,
  description,
  className,
  zeroLabel = "₹0",
  hideAxes = false,
}: {
  labels: string[];
  title: string;
  description?: string;
  className?: string;
  /** The baseline's label: "₹0" for money, "0" for counts. */
  zeroLabel?: string;
  hideAxes?: boolean;
}) {
  const data = labels.map((x) => ({ x, y: 0 }));
  return (
    <div className={cn("absolute inset-0", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={DotGridLine} vertical={false} />
          <XAxis
            hide={hideAxes}
            dataKey="x"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
            interval="preserveStartEnd"
            height={24}
          />
          <YAxis
            hide={hideAxes}
            domain={[0, 4]}
            ticks={Y_TICKS}
            axisLine={false}
            tickLine={false}
            width={48}
            tickFormatter={(v: number) => (v === 0 ? zeroLabel : "")}
            tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
          />
          <Line
            type="monotone"
            dataKey="y"
            stroke="var(--chart-tick)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Over the plot area (clear of the axis labels), not a separate block,
          so it adds no height. */}
      <div
        className={cn(
          "pointer-events-none absolute top-0 right-2 flex",
          hideAxes ? "bottom-0 left-2" : "bottom-6 left-12"
        )}
      >
        <div className="flex w-full flex-col items-center justify-center px-4 text-center">
          <p className="text-[13px] font-semibold text-foreground">{title}</p>
          {description && (
            <p className="mt-0.5 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
