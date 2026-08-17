"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";

export type MetricsPeriod = "today" | "last7" | "last1month" | "ytd";

interface MetricsPeriodOption {
  value: MetricsPeriod;
  label: string;
}

export const METRICS_PERIOD_OPTIONS: MetricsPeriodOption[] = [
  { value: "today", label: "Today" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last1month", label: "Last 1 Month" },
  { value: "ytd", label: "Year to Date" },
];

interface PaymentLinksMetricsPeriodFilterProps {
  value: MetricsPeriod;
  onChange: (value: MetricsPeriod) => void;
}

export function PaymentLinksMetricsPeriodFilter({
  value,
  onChange,
}: PaymentLinksMetricsPeriodFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as MetricsPeriod)}>
      <SelectTrigger className="w-[150px]" aria-label="Metrics time period">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {METRICS_PERIOD_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
