"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as ChartTooltip } from "recharts";
import {
  Button,
  Card,
  Shimmer,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrencyShort } from "@/lib/utils/format";
import { useInvoiceSummary } from "@/features/dashboard/mca-invoices/hooks";

interface SummaryCard {
  key: string;
  label: string;
  value: number | undefined;
  /** This status's share of the total, in USD — straight off the response's
   *  `amountsInUsd` block, not derived from the count. */
  amount: number;
  tooltip: string;
  /** A real color (not a Tailwind class): both the donut arc and the swatch
   *  dot need the same value, and the arc is drawn through Recharts' `fill`
   *  prop, which only takes a resolvable color, not a class name. */
  color: string;
  statuses: string[];
}

/** Donut hover/tooltip readout — one row, matching the Flux popover surface
 *  the way WaivedDonut's own tooltip does (Recharts renders its tooltip
 *  outside any of this file's DOM, so the styling is repeated here rather
 *  than reused from TooltipContent). */
function SummaryDonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload: SummaryCard & { percent: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="flex items-center gap-1.5 font-medium text-muted-foreground">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
        {row.label}
      </p>
      <p className="font-semibold tabular-nums text-popover-foreground">
        {row.value ?? 0} · {row.percent}%
      </p>
    </div>
  );
}

/**
 * The currency every figure on this card is stated in.
 *
 * Fixed, not a prop: the amounts come from the response's `amountsInUsd` block
 * (the sibling `total*Amount` fields sum across whatever currencies the
 * merchant billed in and so cannot carry a symbol), and a caller able to pass
 * "INR" here would only mislabel dollars.
 */
const SUMMARY_CURRENCY = "USD";

/**
 * Invoice counts and amounts, from get-invoice-summary.
 *
 * A card is a shortcut, not just a readout: clicking one pins the table to that
 * status set, which is pg-dashboard's behaviour and not an invention.
 *
 * The period itself — the "Summary" label + TimeRangeTabs — is NOT rendered
 * here: it lives one level up (McaInvoicesFeature), sitting above this card
 * rather than inside it, the same placement Transactions uses for its own
 * "Summary" row above the analytics cards. This component only owns the
 * counts the selected window scopes.
 *
 * The window still arrives from the page as epoch seconds, bucketed there so it
 * is stable across renders and the query key below can hit the cache.
 */
export function InvoiceSummaryCards({
  merchantId,
  windowSeconds,
  onStatusFilter,
}: {
  merchantId: string;
  windowSeconds: { start: number; end: number };
  onStatusFilter: (statuses: string[]) => void;
}) {
  const { summary, isLoading: isPending } = useInvoiceSummary(merchantId, windowSeconds);
  const usd = summary?.amountsInUsd;

  const cards: SummaryCard[] = [
    {
      key: "active",
      label: "Active invoices",
      value: summary?.totalActive,
      amount: usd?.totalActiveAmount ?? 0,
      tooltip: "The total number of successfully generated invoices.",
      // Softened from the app's saturated status tokens (--chart-1/--success/
      // --destructive) specifically for this donut: those read as loud
      // alert colors at this size, side by side, rather than calm
      // categorical data-viz hues. Validated CVD-safe (dataviz skill,
      // scripts/validate_palette.js) as a set.
      color: "#3b82f6",
      statuses: ["ACTIVE"],
    },
    {
      key: "paid",
      label: "Paid invoices",
      value: summary?.totalPaid,
      amount: usd?.totalPaidAmount ?? 0,
      tooltip: "The total number of invoices for which payments have been linked.",
      color: "#10b981",
      statuses: ["PAID", "PAID_OUTSIDE"],
    },
    {
      key: "outstanding",
      label: "Outstanding invoices",
      value: summary?.totalOutstanding,
      amount: usd?.totalOutstandingAmount ?? 0,
      tooltip: "The total number of unpaid invoices past due date.",
      color: "#ef4444",
      statuses: ["OUTSTANDING"],
    },
  ];

  // The three counts' own sum, not a separate `summary.totalNo` field: that
  // field also counts statuses this donut doesn't have a slice for (e.g.
  // drafts), which would leave the arcs short of a full circle.
  const totalCount = cards.reduce((sum, card) => sum + (card.value ?? 0), 0);
  // Likewise the three sliced amounts' own sum, not `amountsInUsd.totalAmount`
  // — that one also carries drafts, so it would not match the ring drawn above
  // it or the three figures listed beside it.
  const totalAmount = cards.reduce((sum, card) => sum + card.amount, 0);
  // The donut's own arcs and its center total are by count; each legend row
  // states its amount too, as plain secondary text — see below.
  const donutData = cards.map((card) => ({
    ...card,
    percent: totalCount > 0 ? Math.round(((card.value ?? 0) / totalCount) * 100) : 0,
  }));
  // Nothing to split means nothing to draw — a flat neutral ring rather than
  // a zero-value Pie (which Recharts renders as nothing at all).
  const hasData = totalCount > 0;

  return (
    <Card className="p-5">
      {/* flex-1 + sm:items-stretch: this card is height-matched to the
          invoice-action card beside it (the grid row is `items-stretch`),
          and whatever slack that creates has to reach the legend — with the
          row centring its children instead, the three rows stayed at their
          own natural height and the surplus collected as a dead band under
          them. The donut opts back out via self-center, since it's a fixed
          square and has nothing to do with extra height. */}
      <div className="flex flex-1 flex-col items-center gap-6 sm:flex-row sm:items-stretch">
        {/* Donut: each status's share of the total count, with the total
            count AND its total amount both in the hole — one
            glance answers "how many, what shape, and what it's worth". */}
        <div
          role="img"
          aria-label={`${totalCount} invoices total (${formatCurrencyShort(totalAmount, SUMMARY_CURRENCY)}): ${cards
            .map((c) => `${c.label} ${c.value ?? 0}`)
            .join(", ")}`}
          className="relative size-48 shrink-0 self-center"
        >
          {isPending ? (
            <Shimmer className="size-full rounded-full" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  {hasData && (
                    // allowEscapeViewBox: the chart's own box (size-48,
                    // 192px) is too small to keep Recharts' default
                    // in-container tooltip placement clear of the center
                    // count/amount label below — without this the tooltip
                    // renders right on top of it instead of outside the
                    // donut. offset pushes it further from the cursor so it
                    // clears the ring itself too, not just the center text.
                    <ChartTooltip
                      cursor={false}
                      content={<SummaryDonutTooltip />}
                      allowEscapeViewBox={{ x: true, y: true }}
                      offset={16}
                      wrapperStyle={{ zIndex: 20 }}
                    />
                  )}
                  <Pie
                    data={hasData ? donutData : [{ key: "empty", value: 1 }]}
                    dataKey="value"
                    nameKey="key"
                    cx="50%"
                    cy="50%"
                    innerRadius={66}
                    outerRadius={92}
                    startAngle={90}
                    endAngle={-270}
                    cornerRadius={hasData ? 3 : 0}
                    paddingAngle={hasData ? 2 : 0}
                    isAnimationActive={false}
                  >
                    {hasData ? (
                      donutData.map((row) => <Cell key={row.key} fill={row.color} stroke="none" />)
                    ) : (
                      <Cell key="empty" fill="var(--muted)" stroke="none" />
                    )}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold tabular-nums text-foreground">
                  {totalCount}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrencyShort(totalAmount, SUMMARY_CURRENCY)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Legend: each row is still the same filter shortcut the old cards
            were — clicking one pins the table to that status set.

            One line per status with three fixed-width, right-aligned
            numeric columns (count · share · amount) rather than the stacked
            pair this used to be. Two things were wrong with that version:
            the figures stacked two-deep read as three ragged blocks rather
            than one table, and — the actual cause of the dead gutter on the
            card's right — flux-ui's Button wraps its children in a plain
            `<span>` of its own (see its source), so `w-full justify-between`
            here only ever laid out the BUTTON's own children (icon/span/icon),
            never mine. That wrapper shrink-wrapped to each row's intrinsic
            width and sat centred, which is why no two rows' numbers lined up
            and why everything huddled left of the card's real width. The
            `[&>span]` rules below make that wrapper the row's actual grid,
            which is what both aligns the columns across rows and pushes them
            out to the full width. */}
        {/* Each row takes an equal share of the column's height (flex-1 on
            the item, h-full on the control inside it) rather than its own
            content height, so the three sit evenly down the card however
            tall the row it's matched to turns out to be — and the dividers
            land on those same even thirds. */}
        <ul className="flex w-full min-w-0 flex-1 flex-col divide-y divide-border">
          {cards.map((card) => {
            return (
              <li key={card.key} className="flex-1">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onStatusFilter(card.statuses)}
                  className="h-full min-h-14 w-full rounded-lg px-3 py-3 text-left hover:bg-muted/50 [&>span]:grid [&>span]:w-full [&>span]:grid-cols-[minmax(0,1fr)_3.5rem_5rem] [&>span]:items-center [&>span]:gap-x-3"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-3 w-3 shrink-0 rounded-sm"
                      style={{ background: card.color }}
                      aria-hidden="true"
                    />
                    <span className="truncate text-sm text-foreground">{card.label}</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex shrink-0 items-center text-muted-foreground">
                          <Icon name="info" className="h-3.5 w-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">{card.tooltip}</TooltipContent>
                    </Tooltip>
                  </span>

                  {/* Two separate grid cells, not one nested flex: fixed
                      track widths are what make the columns line up from row
                      to row, since each row is its own grid. Percentage share
                      dropped: it was the third number competing for the same
                      cramped space that forced the label to truncate, and
                      count + amount already say what each status is worth
                      without it. */}
                  {isPending ? (
                    <>
                      <Shimmer className="h-5 w-8 justify-self-end" />
                      <Shimmer className="h-5 w-12 justify-self-end" />
                    </>
                  ) : (
                    <>
                      <span className="text-right text-base font-bold tabular-nums text-foreground">
                        {card.value ?? 0}
                      </span>
                      <span className="text-right text-sm tabular-nums text-muted-foreground">
                        {formatCurrencyShort(card.amount, SUMMARY_CURRENCY)}
                      </span>
                    </>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
