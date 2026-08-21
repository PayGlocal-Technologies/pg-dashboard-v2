"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Text } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";

/** Flux tokens, so both arcs follow the theme rather than carrying fixed hex. */
const WAIVED_FILL = "var(--primary)";
const REMAINING_FILL = "var(--border)";

/**
 * All three figures at once, rather than only the hovered arc — the split is the
 * point, and two of the three are what the reader is comparing. Styled to match
 * the Flux tooltip surface (the chart lives inside Recharts, which renders its
 * own tooltip container, so the treatment is applied here rather than reused
 * from TooltipContent).
 */
function WaivedTooltip({
  active,
  waived,
  remaining,
  eligible,
  currency,
}: {
  active?: boolean;
  waived: number;
  remaining: number;
  eligible: number;
  currency: string;
}) {
  if (!active) return null;

  const rows: { label: string; value: number; swatch?: string }[] = [
    { label: "Waived", value: waived, swatch: WAIVED_FILL },
    { label: "Remaining", value: remaining, swatch: REMAINING_FILL },
    { label: "Total", value: eligible },
  ];

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            {row.swatch ? (
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.swatch }} />
            ) : (
              <span className="h-2 w-2 shrink-0" />
            )}
            {row.label}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatCurrency(row.value, currency, "en-US")}
          </span>
        </div>
      ))}
    </div>
  );
}

interface WaivedDonutProps {
  /** Rewards already waived against fees. */
  waived: number;
  /** The pool they are waived from — the earned total. */
  eligible: number;
  currency: string;
  className?: string;
}

/**
 * Compact donut showing how much of the earned total has been waived, with the
 * share in its hole. Sized to fit the slack beside the card's amount rather than
 * to add height of its own, so the amount stays the card's primary content.
 */
export function WaivedDonut({ waived, eligible, currency, className }: WaivedDonutProps) {
  // Nothing earned means nothing to waive, and no ratio to draw — an empty state
  // rather than a 0/0 division.
  if (eligible <= 0) {
    return (
      <Text size="xs" color="subtle" className={cn("shrink-0", className)}>
        Nothing to waive yet
      </Text>
    );
  }

  const remaining = Math.max(0, eligible - waived);
  const percent = Math.round((waived / eligible) * 100);

  const data = [
    { key: "waived", value: waived },
    { key: "remaining", value: remaining },
  ];

  return (
    <div
      role="img"
      aria-label={`${percent}% of ${formatCurrency(eligible, currency, "en-US")} earned has been waived`}
      className={cn("relative size-24 shrink-0", className)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            cursor={false}
            content={
              <WaivedTooltip
                waived={waived}
                remaining={remaining}
                eligible={eligible}
                currency={currency}
              />
            }
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="key"
            cx="50%"
            cy="50%"
            innerRadius={31}
            outerRadius={46}
            startAngle={90}
            endAngle={-270}
            // Only worth a gap when there are genuinely two arcs to separate.
            paddingAngle={waived > 0 && remaining > 0 ? 2 : 0}
          >
            <Cell key="waived" fill={WAIVED_FILL} stroke="none" />
            <Cell key="remaining" fill={REMAINING_FILL} stroke="none" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Centred in the hole. Absolutely positioned rather than a Recharts
          <Label>, which would need its own viewBox arithmetic to stay centred.
          `pointer-events-none` so it never blocks the arcs' own hover. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold tabular-nums leading-none text-foreground">
          {percent}%
        </span>
        <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">waived</span>
      </div>
    </div>
  );
}
