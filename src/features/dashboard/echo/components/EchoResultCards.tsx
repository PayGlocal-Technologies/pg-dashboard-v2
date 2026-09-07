"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import type { EchoResult } from "@/features/dashboard/echo/types";

const POSITIVE_STATUS_WORDS = ["issued", "sent for capture", "success", "captured", "paid"];
const NEGATIVE_STATUS_WORDS = ["failed", "declined", "error"];

/** A quick heuristic, not a real status taxonomy — this is mock data across
 *  two different domains (transactions, FIRCs), so a shared lookup table
 *  isn't worth building for demo rows. */
function statusDotClass(status: string): string {
  const s = status.toLowerCase();
  if (POSITIVE_STATUS_WORDS.some((w) => s.includes(w))) return "bg-emerald-500";
  if (NEGATIVE_STATUS_WORDS.some((w) => s.includes(w))) return "bg-red-500";
  if (s.includes("refund")) return "bg-blue-500";
  return "bg-amber-500";
}

function MetricResultCard({ result }: { result: Extract<EchoResult, { kind: "metric" }> }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-[11px] font-medium text-muted-foreground">{result.title}</p>
      <p className="mt-1 text-[22px] font-semibold tracking-tight text-foreground">
        {result.value}
      </p>
      <p
        className={cn(
          "mt-1 text-[11.5px] font-medium",
          result.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
        )}
      >
        {result.changeLabel}
      </p>
    </div>
  );
}

function TableResultCard({ result }: { result: Extract<EchoResult, { kind: "table" }> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <p className="px-3.5 pb-2 pt-3 text-[12px] font-semibold text-foreground">{result.title}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="border-t border-border bg-muted/40">
              {result.columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap px-3.5 py-1.5 text-[10px] font-semibold text-muted-foreground",
                    col.align === "right" ? "text-right" : "text-left"
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i} className="border-t border-border/60">
                {result.columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "whitespace-nowrap px-3.5 py-1.5 text-foreground",
                      col.align === "right" ? "text-right tabular-nums" : "text-left"
                    )}
                  >
                    {col.key === "status" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={cn("size-1.5 shrink-0 rounded-full", statusDotClass(row[col.key] ?? ""))}
                        />
                        {row[col.key]}
                      </span>
                    ) : (
                      (row[col.key] ?? "—")
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link
        href={result.viewAllHref}
        className="flex items-center justify-between border-t border-border px-3.5 py-2 text-[12px] font-medium text-primary hover:underline"
      >
        {result.viewAllLabel}
        <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function DonutResultCard({ result }: { result: Extract<EchoResult, { kind: "donut" }> }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-[12px] font-semibold text-foreground">{result.title}</p>
      {result.subtitle && <p className="mt-0.5 text-[11px] text-muted-foreground">{result.subtitle}</p>}

      <div className="mt-2 flex justify-center">
        <div style={{ width: 140, height: 140 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={result.segments}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={38}
                outerRadius={62}
                paddingAngle={2}
                animationDuration={600}
              >
                {result.segments.map((seg) => (
                  <Cell key={seg.key} fill={seg.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "var(--foreground)",
                }}
                formatter={(value) => [`${value}%`]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
        {result.segments.map((seg) => (
          <li key={seg.key} className="flex items-center gap-1.5 text-[11px]">
            <span className="size-2 shrink-0 rounded-full" style={{ background: seg.color }} />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{seg.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-foreground">{seg.value}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionResultCard({ result }: { result: Extract<EchoResult, { kind: "action" }> }) {
  // flux's Button has no `asChild`/Slot support, so navigation goes through
  // router.push on click rather than wrapping a <Link> — unlike the "View
  // all" row above, which is a plain Link and doesn't need this.
  const router = useRouter();
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-[13px] font-semibold text-foreground">{result.title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{result.description}</p>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="mt-3"
        onClick={() => router.push(result.href)}
      >
        {result.actionLabel}
      </Button>
    </div>
  );
}

export function EchoResultCard({ result }: { result: EchoResult }) {
  switch (result.kind) {
    case "metric":
      return <MetricResultCard result={result} />;
    case "table":
      return <TableResultCard result={result} />;
    case "donut":
      return <DonutResultCard result={result} />;
    case "action":
      return <ActionResultCard result={result} />;
    default:
      return null;
  }
}
