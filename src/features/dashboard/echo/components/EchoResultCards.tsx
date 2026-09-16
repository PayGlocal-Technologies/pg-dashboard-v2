"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Button, DataTable, type Column } from "@/components/ui";
import { Icon } from "@/components/icon";
import { EchoLink } from "@/features/dashboard/echo/components/EchoLink";
import { asWholeUrl, shortUrlLabel } from "@/features/dashboard/echo/links";
import type { EchoResult } from "@/features/dashboard/echo/types";
import { cn } from "@/lib/utils";

/**
 * The rich result cards Echo's design calls for: a KPI figure, a short table,
 * a breakdown donut, and a call-to-action.
 *
 * BACKEND GAP — nothing renders these yet. `POST /gcc/v1/echo/app` answers
 * only with `text` / `image` / `interactive` chunks (see `EchoChunk`), and
 * there is no field in a response to build an `EchoResult` from. This file is
 * the rendering half, kept ready so that wiring it up later is a mapping job
 * in `helper.ts` rather than a design job. See the BACKEND GAP note on
 * `EchoResult` in `types.ts`.
 *
 * Deliberately NOT reachable from the transcript today: rendering an empty
 * card, or one filled with invented figures, would be worse than rendering
 * nothing.
 */

const POSITIVE_STATUS_WORDS = ["issued", "sent for capture", "success", "captured", "paid"];
const NEGATIVE_STATUS_WORDS = ["failed", "declined", "error"];

/** A quick heuristic, not a real status taxonomy — a result card can carry
 *  rows from any domain (transactions, FIRCs, settlements), so a shared
 *  lookup table would have to know all of them. Revisit alongside the real
 *  contract, which may well name the status semantics itself. */
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
          "mt-0.5 text-[11.5px] font-medium",
          result.positive
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-red-600 dark:text-red-400"
        )}
      >
        {result.changeLabel}
      </p>
    </div>
  );
}

type TableRow = Record<string, string>;

/** Statuses that put a payment link beyond use. A link in any of these is
 *  still shown and still opens — the merchant may want to see what their
 *  customer sees — but it loses its copy button, because copying is only ever
 *  a prelude to sharing, and sharing a dead link collects nothing.
 *
 *  A deny-list rather than an allow-list of live statuses: a status word this
 *  file has not met before keeps the copy button, which is the harmless way to
 *  be wrong. Same heuristic caveat as `statusDotClass` above. */
const UNSHAREABLE_STATUS_WORDS = ["expired", "cancelled", "canceled", "revoked", "paid"];

function linkIsShareable(row: TableRow): boolean {
  const status = row.status?.toLowerCase() ?? "";
  return !UNSHAREABLE_STATUS_WORDS.some((w) => status.includes(w));
}

function TableResultCard({ result }: { result: Extract<EchoResult, { kind: "table" }> }) {
  // flux's DataTable rather than bare table markup, per CLAUDE.md. `snug`
  // + compact density is what keeps it card-sized inside a chat bubble
  // instead of reading as a full page grid.
  const columns: Column<TableRow>[] = result.columns.map((col) => ({
    key: col.key,
    header: col.label,
    align: col.align ?? "left",
    render: (row) => {
      const value = row[col.key] ?? "";

      // A cell that is nothing but a URL — the `Payment Link` field of a link
      // record — becomes the link itself. The href and the clipboard carry
      // the whole URL; only what is on screen is elided, because a full
      // payment link is 90-odd characters and would set the column's width
      // for the entire table.
      const url = asWholeUrl(value);
      if (url) {
        return (
          <EchoLink
            variant="cell"
            url={url}
            label={shortUrlLabel(url)}
            copyable={linkIsShareable(row)}
            copyLabel="Copy payment link"
            copyToast="Payment link copied"
          />
        );
      }

      if (col.key === "status") {
        return (
          <span className="inline-flex items-center gap-1.5">
            <span className={cn("size-1.5 shrink-0 rounded-full", statusDotClass(value))} />
            {value}
          </span>
        );
      }

      return value || "—";
    },
  }));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {result.title ? (
        <p className="px-3.5 pb-2 pt-3 text-[12px] font-semibold text-foreground">{result.title}</p>
      ) : null}
      {/* Its own scroll container: a five-column table does not fit the 420px
          side panel, and the page must never scroll sideways as a whole. */}
      <div className="overflow-x-auto">
        <DataTable
          columns={columns}
          data={result.rows}
          rowKey={(row) => Object.values(row).join("|")}
          density="compact"
          snug
          tableLayout="auto"
          className="border-0"
        />
      </div>
      {result.viewAllHref && result.viewAllLabel ? (
        <Link
          href={result.viewAllHref}
          className="flex items-center justify-between border-t border-border px-3.5 py-2 text-[12px] font-medium text-primary hover:underline"
        >
          {result.viewAllLabel}
          <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </div>
  );
}

function DonutResultCard({ result }: { result: Extract<EchoResult, { kind: "donut" }> }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-[12px] font-semibold text-foreground">{result.title}</p>
      {result.subtitle && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{result.subtitle}</p>
      )}

      <div className="mt-2 flex justify-center">
        <div className="h-35 w-35">
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
            <span className="shrink-0 font-semibold tabular-nums text-foreground">
              {seg.value}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActionResultCard({ result }: { result: Extract<EchoResult, { kind: "action" }> }) {
  // flux's Button has no `asChild`/Slot support, so navigation goes through
  // router.push on click rather than wrapping a <Link> — unlike the "View all"
  // row above, which is a plain Link and needs none of this.
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
