"use client";

import { Button, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export interface StateInsightRow {
  state: string;
  code: string;
  amount: number;
  transactions: number;
}

function fmt(n: number): string {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

function PeriodChrome({ static: isStatic }: { static?: boolean }) {
  const className =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground bg-muted border border-border";
  const inner = (
    <>
      Last 30 days
      <Icon name="chevron-down" width={10} height={10} className="text-muted-foreground" />
    </>
  );
  if (isStatic) {
    return <span className={className}>{inner}</span>;
  }
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(className, "h-auto transition-colors hover:bg-muted/80")}
    >
      {inner}
    </Button>
  );
}

export function StateInsightsList({
  data,
  isLoading,
  className,
  staticPeriodControl,
}: {
  data: StateInsightRow[];
  isLoading?: boolean;
  className?: string;
  /** Use non-interactive chrome (e.g. widget library tile) to avoid nested buttons */
  staticPeriodControl?: boolean;
}) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-card text-card-foreground rounded-xl p-5 border border-border shadow-sm",
          className
        )}
      >
        <div className="flex items-center justify-between mb-5">
          <Shimmer className="h-4 w-44" />
          <Shimmer className="h-7 w-28 rounded-lg" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Shimmer className="h-3 w-24 rounded" />
              <Shimmer className="flex-1 h-5 rounded-md" />
              <Shimmer className="h-3 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-xl p-5 border border-border shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">India — state volume</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Domestic INR volume by state (GST relevant)
          </p>
        </div>
        <PeriodChrome static={staticPeriodControl} />
      </div>

      <div className="space-y-3">
        {data.map((item, i) => {
          const pct = (item.amount / maxAmount) * 100;
          return (
            <div key={item.code} className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 w-32 flex-shrink-0">
                <span className="text-[10px] font-semibold text-muted-foreground w-6">
                  {item.code}
                </span>
                <span className="text-xs text-muted-foreground font-medium truncate">
                  {item.state}
                </span>
              </div>
              <div className="flex-1 relative h-6 flex items-center">
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background:
                        i === 0
                          ? "linear-gradient(90deg, #0061E3, #60a5fa)"
                          : i === 1
                            ? "linear-gradient(90deg, #1d4ed8, #3b82f6)"
                            : "linear-gradient(90deg, #6d28d9, #8b5cf6)",
                      opacity: 0.7 + i * -0.08,
                    }}
                  />
                </div>
              </div>
              <div className="w-16 text-right flex-shrink-0">
                <span className="text-xs font-semibold text-foreground">{fmt(item.amount)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
