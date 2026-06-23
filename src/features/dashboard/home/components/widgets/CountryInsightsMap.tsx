"use client";

import { Button, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

interface CountryData {
  country: string;
  code: string;
  amount: number;
  transactions: number;
}

interface CountryInsightsMapProps {
  data: CountryData[];
  isLoading?: boolean;
  className?: string;
  /** Non-interactive period label (e.g. widget library) — avoids nested buttons */
  staticPeriodControl?: boolean;
}

function fmt(n: number): string {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n}`;
}

const flagEmoji: Record<string, string> = {
  US: "🇺🇸",
  IE: "🇮🇪",
  GB: "🇬🇧",
  CA: "🇨🇦",
  QA: "🇶🇦",
  SG: "🇸🇬",
  DE: "🇩🇪",
};

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

export function CountryInsightsMap({
  data,
  isLoading,
  className,
  staticPeriodControl,
}: CountryInsightsMapProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-card text-card-foreground rounded-xl p-5 border border-border shadow-sm",
          className
        )}
      >
        <div className="flex items-center justify-between mb-5">
          <Shimmer className="h-4 w-36" />
          <Shimmer className="h-7 w-28 rounded-lg" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Shimmer className="h-3 w-20 rounded" />
              <Shimmer className="flex-1 h-5 rounded-md" />
              <Shimmer className="h-3 w-14 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const maxAmount = Math.max(...data.map((d) => d.amount));

  return (
    <div
      className={cn(
        "bg-card text-card-foreground rounded-xl p-5 border border-border shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Country Insights</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Revenue by geography</p>
        </div>
        <PeriodChrome static={staticPeriodControl} />
      </div>

      <div className="space-y-3">
        {data.map((item, i) => {
          const pct = (item.amount / maxAmount) * 100;
          return (
            <div key={item.code} className="flex items-center gap-3 group">
              {/* Flag + name */}
              <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                <span className="text-sm leading-none">{flagEmoji[item.code] ?? "🌍"}</span>
                <span className="text-xs text-muted-foreground font-medium truncate">
                  {item.country}
                </span>
              </div>

              {/* Bar */}
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

              {/* Amount */}
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
