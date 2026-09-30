import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RollingNumber } from "@/components/common/RollingNumber";
import type { McaStatCardData } from "@/features/dashboard/mca-home/types";

interface McaStatCardProps {
  data: McaStatCardData;
  isLoading?: boolean;
}

export function McaStatCard({ data, isLoading = false }: McaStatCardProps) {
  const hasTrend = data.trendPct !== undefined;
  const positive = hasTrend && data.trendPct! >= 0;
  const sparkData = (data.spark ?? []).map((v, i) => ({ i, v }));
  const gradId = `mca-stat-fill-${data.title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <Card className="h-full gap-2 p-5">
      <p className="text-[13px] font-medium text-muted-foreground">{data.title}</p>
      {isLoading ? (
        <div className="space-y-2">
          <Shimmer className="h-8 w-28" />
          <Shimmer className="h-3.5 w-36" />
        </div>
      ) : (
        <div>
          <RollingNumber
            value={data.valueLabel}
            className="block text-2xl font-bold tracking-tight text-foreground tabular-nums"
          />
          <div
            className={cn(
              "mt-1 flex items-center gap-1 text-xs font-medium",
              hasTrend
                ? positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            )}
          >
            {hasTrend && (
              <Icon name={positive ? "trending-up" : "trending-down"} size={12} aria-hidden />
            )}
            <span>
              {hasTrend ? (
                <>
                  {positive ? "+" : ""}
                  {data.trendPct}% vs last month
                </>
              ) : (
                data.captionLabel
              )}
            </span>
          </div>
        </div>
      )}
      {/* The strip keeps its height with no series, so a card without one
          still lines up with its neighbours in the grid. */}
      <div className="mt-auto h-12 w-full pt-3">
        {sparkData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={data.accentColor} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={data.accentColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={data.accentColor}
                strokeWidth={2}
                fill={`url(#${gradId})`}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
