import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { RollingNumber } from "@/components/common/RollingNumber";
import type { McaStatCardData } from "@/features/dashboard/mca-home/mock-data";

interface McaStatCardProps {
  data: McaStatCardData;
}

export function McaStatCard({ data }: McaStatCardProps) {
  const hasTrend = data.trendPct !== undefined;
  const positive = hasTrend && data.trendPct! >= 0;
  const sparkData = data.spark.map((v, i) => ({ i, v }));
  const gradId = `mca-stat-fill-${data.title.replace(/\s+/g, "-").toLowerCase()}`;

  return (
    <Card className="h-full gap-2 p-5">
      <p className="text-[13px] font-medium text-muted-foreground">{data.title}</p>
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
          {hasTrend && <Icon name={positive ? "trending-up" : "trending-down"} size={12} aria-hidden />}
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
      <div className="mt-auto h-12 w-full pt-3">
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
      </div>
    </Card>
  );
}
