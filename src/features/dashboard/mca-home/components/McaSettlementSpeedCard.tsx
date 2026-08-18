import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Badge, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { RollingNumber } from "@/components/common/RollingNumber";
import { settlementSpeed } from "@/features/dashboard/mca-home/mock-data";

const ACCENT_COLOR = "var(--chart-2)";

export function McaSettlementSpeedCard() {
  const sparkData = settlementSpeed.spark.map((v, i) => ({ i, v }));

  return (
    <Card className="h-full gap-3 p-5">
      <p className="text-[13px] font-medium text-muted-foreground">Avg settlement time</p>

      <RollingNumber
        value={settlementSpeed.valueLabel}
        className="block text-2xl font-bold tracking-tight text-foreground tabular-nums"
      />

      <Badge
        variant="success"
        size="sm"
        className="w-fit"
        leftIcon={<Icon name="trending-down" className="h-3 w-3" aria-hidden />}
      >
        {settlementSpeed.fasterByLabel} faster than the {settlementSpeed.slaLabel}
      </Badge>

      <div className="mt-auto min-h-12 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mca-settlement-speed-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ACCENT_COLOR} stopOpacity={0.25} />
                <stop offset="100%" stopColor={ACCENT_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="v"
              stroke={ACCENT_COLOR}
              strokeWidth={2}
              fill="url(#mca-settlement-speed-fill)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
