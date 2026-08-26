"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";
import { invoiceTrend } from "@/features/dashboard/mca-home/mock-data";

function InvoiceTrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: readonly { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold tabular-nums text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function McaInvoiceTrendCard() {
  return (
    <Card className="h-full gap-4 p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Invoice trend</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Paid vs outstanding invoices by month</p>
      </div>

      <div className="min-h-56 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={invoiceTrend} barCategoryGap="28%" barGap={2} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 6" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "var(--chart-tick)" }}
            />
            <YAxis axisLine={false} tickLine={false} width={30} tick={{ fontSize: 11, fill: "var(--chart-tick)" }} />
            <Tooltip content={<InvoiceTrendTooltip />} cursor={{ fill: "var(--chart-cursor)", radius: 4 }} />
            <Bar dataKey="paid" name="Paid" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="outstanding" name="Outstanding" fill="var(--chart-1)" fillOpacity={0.3} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
