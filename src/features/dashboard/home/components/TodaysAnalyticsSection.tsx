"use client";

import { useId, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, Card, ChartSkeleton, Tabs, TabsList, TabsTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { todaysAnalytics } from "@/features/dashboard/home/mock-data";

const VOLUME_PAY_MODE_LABELS = ["UPI", "Cards", "Net banking", "Wallets"] as const;
const VOLUME_PAY_MODE_SWATCHES = ["#6366f1", "#0061e3", "#0d9488", "#d97706"];

function normPayMix(m: readonly [number, number, number, number]): [number, number, number, number] {
  const s = m[0] + m[1] + m[2] + m[3];
  if (s <= 0) return [0.25, 0.25, 0.25, 0.25];
  return [m[0] / s, m[1] / s, m[2] / s, m[3] / s];
}

function payModeDonutSegmentPath(cx: number, cy: number, rInner: number, rOuter: number, a0: number, a1: number): string {
  const span = a1 - a0;
  if (span <= 1e-6) return "";
  if (span >= 2 * Math.PI - 1e-5) {
    return [`M ${cx + rOuter} ${cy}`, `A ${rOuter} ${rOuter} 0 1 1 ${cx - rOuter} ${cy}`, `A ${rOuter} ${rOuter} 0 1 1 ${cx + rOuter} ${cy}`, `M ${cx + rInner} ${cy}`, `A ${rInner} ${rInner} 0 1 0 ${cx - rInner} ${cy}`, `A ${rInner} ${rInner} 0 1 0 ${cx + rInner} ${cy}`, "Z"].join(" ");
  }
  const big = span > Math.PI ? 1 : 0;
  const xo0 = cx + rOuter * Math.cos(a0), yo0 = cy + rOuter * Math.sin(a0);
  const xo1 = cx + rOuter * Math.cos(a1), yo1 = cy + rOuter * Math.sin(a1);
  const xi1 = cx + rInner * Math.cos(a1), yi1 = cy + rInner * Math.sin(a1);
  const xi0 = cx + rInner * Math.cos(a0), yi0 = cy + rInner * Math.sin(a0);
  return `M ${xo0} ${yo0} A ${rOuter} ${rOuter} 0 ${big} 1 ${xo1} ${yo1} L ${xi1} ${yi1} A ${rInner} ${rInner} 0 ${big} 0 ${xi0} ${yi0} Z`;
}

function PaymentModeDonutSvg({ segments, centerLabel, animateKey }: { segments: readonly { name: string; value: number; fill: string }[]; centerLabel: string; animateKey: string }) {
  const reduceMotion = useReducedMotion();
  const cx = 50, cy = 50, rOuter = 44, rInner = 26;
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  const denom = total > 0 ? total : 1;
  let angle = -Math.PI / 2;
  const arcs: { name: string; d: string; fill: string; fillRule: "evenodd" | "nonzero" }[] = [];
  segments.forEach((seg) => {
    const v = Math.max(0, seg.value);
    if (v <= 0) return;
    const span = (v / denom) * 2 * Math.PI;
    const start = angle, end = angle + span;
    angle = end;
    const d = payModeDonutSegmentPath(cx, cy, rInner, rOuter, start, end);
    if (!d) return;
    arcs.push({ name: seg.name, d, fill: seg.fill, fillRule: span >= 2 * Math.PI - 1e-5 ? "evenodd" : "nonzero" });
  });
  return (
    <motion.svg key={animateKey} width={100} height={100} viewBox="0 0 100 100" className="mx-auto shrink-0 overflow-visible" aria-hidden initial={reduceMotion ? false : { opacity: 0.82 }} animate={{ opacity: 1 }} transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}>
      {arcs.map((arc, i) => (
        <motion.path key={`${arc.name}-${animateKey}`} d={arc.d} fill={arc.fill} fillRule={arc.fillRule} stroke="var(--border)" strokeWidth={0.5} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0.12 : 0.34, delay: reduceMotion ? 0 : i * 0.045, ease: [0.22, 1, 0.36, 1] }} />
      ))}
      <motion.text key={centerLabel} x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[10px] font-semibold tabular-nums" initial={reduceMotion ? false : { opacity: 0.45 }} animate={{ opacity: 1 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>{centerLabel}</motion.text>
    </motion.svg>
  );
}

 
function VolumeAnalyticsTooltip({ active, payload, label, isPaymentsTab, showGrossPayMode }: { active?: boolean; payload?: readonly any[]; label?: string | number; isPaymentsTab: boolean; showGrossPayMode: boolean }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as { today?: number; yesterday?: number; payMixToday?: readonly [number, number, number, number] };
  const formatMain = (v: number) => isPaymentsTab ? new Intl.NumberFormat("en-IN").format(Math.max(0, Math.round(v))) : `₹${Number(v).toFixed(1)}L`;
  const mixT = row?.payMixToday ? normPayMix(row.payMixToday) : null;
  const todayTotal = Number(row?.today ?? 0);
  const payModeChartData = mixT ? VOLUME_PAY_MODE_LABELS.map((name, i) => ({ name, value: Math.max(0, todayTotal * mixT[i]), fill: VOLUME_PAY_MODE_SWATCHES[i] })) : [];
  const showPayModeBlock = showGrossPayMode && mixT && payModeChartData.some((d) => d.value > 0);
  const payModeAnimateKey = showPayModeBlock ? `${String(label)}-${payModeChartData.map((d) => d.value.toFixed(4)).join("|")}` : "";
  return (
    <div className={cn("rounded-2xl border border-border bg-card px-4 py-3.5 text-xs antialiased shadow-[0_10px_40px_-14px_rgba(15,23,42,0.2)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)]", showPayModeBlock ? "max-w-[min(100vw-1.5rem,22.5rem)]" : "max-w-[min(100vw-1.5rem,17.5rem)]")}>
      <p className="mb-2.5 text-sm font-semibold leading-none text-foreground">{label}</p>
      <div className="space-y-2">
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/[0.06] dark:ring-white/[0.1]" style={{ background: entry.color ?? entry.fill ?? "#0061E3" }} />
              <span className="truncate text-[13px] text-muted-foreground">{entry.name}:</span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">{entry.value !== undefined ? formatMain(Number(entry.value)) : "—"}</span>
          </div>
        ))}
      </div>
      {showPayModeBlock && mixT && (
        <>
          <div className="my-3 border-t border-zinc-200/80 dark:border-zinc-700/70" role="presentation" />
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] sm:items-stretch sm:gap-0">
            <div className="flex min-w-0 flex-col gap-2.5 sm:pr-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-foreground/80">Payment mode</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Today</p>
              </div>
              <div className="flex justify-center rounded-xl border border-zinc-200/70 bg-zinc-50/90 px-3 py-3 dark:border-zinc-700/60 dark:bg-zinc-900/40">
                <PaymentModeDonutSvg segments={payModeChartData} centerLabel={formatMain(todayTotal)} animateKey={payModeAnimateKey} />
              </div>
            </div>
            <ul className="flex min-w-0 flex-col justify-center gap-2 border-zinc-200/80 pt-1 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0 dark:border-zinc-700/70">
              {VOLUME_PAY_MODE_LABELS.map((name, i) => {
                const vToday = todayTotal * mixT[i];
                return (
                  <li key={name} className="flex items-center justify-between gap-3 text-[12px]">
                    <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] ring-1 ring-black/[0.06] dark:ring-white/[0.08]" style={{ background: VOLUME_PAY_MODE_SWATCHES[i] }} aria-hidden />
                      <span className="truncate">{name}</span>
                    </span>
                    <motion.span key={`${name}-${formatMain(vToday)}`} className="shrink-0 font-semibold tabular-nums text-foreground" initial={{ opacity: 0.55 }} animate={{ opacity: 1 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>{formatMain(vToday)}</motion.span>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function VolumeChartXTick({ x, y, payload }: any) {
  return <text x={x} y={y} dy={10} textAnchor="middle" className="fill-muted-foreground/80 text-[11px] font-medium tabular-nums">{payload.value}</text>;
}

function VolumeChartYTick({ y, payload, isPaymentsTab }: any) {
  const v = payload.value;
  const text = isPaymentsTab ? new Intl.NumberFormat("en-IN").format(Number(v)) : `₹${v}L`;
  return <text x={0} y={y} dy={3} textAnchor="start" className="fill-muted-foreground/80 text-[11px] font-medium tabular-nums">{text}</text>;
}

function PsrYAxisTick({ y, payload }: any) {
  return <text x={0} y={y} dy={3} textAnchor="start" className="fill-muted-foreground/80 text-[11px] font-medium tabular-nums">{`${payload.value}%`}</text>;
}
 

function paymentYTicks(top: number): number[] {
  const step = top <= 500 ? 100 : top <= 900 ? 200 : 250;
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  if (ticks[ticks.length - 1] < top) ticks.push(top);
  return ticks;
}

type VolumeTab = "gross" | "net" | "payments";

const TABS: { id: VolumeTab; label: string }[] = [
  { id: "gross", label: "Gross volume" },
  { id: "net", label: "Net volume" },
  { id: "payments", label: "No. of payments" },
];

const CHART_PRIMARY = "#0061e3";
const CHART_PRIMARY_SOFT = "#38bdf8";
const CHART_YESTERDAY = "#94a3b8";

function formatInrCompact(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export function TodaysAnalyticsSection({ isLoading }: { isLoading?: boolean }) {
  const router = useRouter();
  const gradId = useId().replace(/:/g, "");
  const psrGradId = useId().replace(/:/g, "");
  const [tab, setTab] = useState<VolumeTab>("gross");

  const summary = useMemo(() => {
    if (tab === "gross") return todaysAnalytics.grossVolume;
    if (tab === "net") return todaysAnalytics.netVolume;
    return todaysAnalytics.paymentCount;
  }, [tab]);

  const chartRows = useMemo(() => todaysAnalytics.hourly.map((row) => ({
    label: row.label,
    today: tab === "gross" ? row.grossL : tab === "net" ? row.netL : row.payments,
    yesterday: tab === "gross" ? row.grossYesterdayL : tab === "net" ? row.netYesterdayL : row.paymentsYesterday,
    payMixToday: row.payMixToday,
    payMixYesterday: row.payMixYesterday,
  })), [tab]);

  const psrChartData = useMemo(() => todaysAnalytics.hourly.map((r) => ({
    label: r.label,
    psrToday: Math.round((100 * r.payOk) / Math.max(r.payments, 1)),
    psrYesterday: Math.round((100 * r.payOkY) / Math.max(r.paymentsYesterday, 1)),
  })), []);

  const psrYDomain = useMemo((): [number, number] => {
    const all = psrChartData.flatMap((d) => [d.psrToday, d.psrYesterday]);
    const lo = Math.min(...all), hi = Math.max(...all);
    if (lo === hi) return [Math.max(0, lo - 4), Math.min(100, lo + 4)];
    return [Math.max(0, Math.floor(lo - 2) - 1), Math.min(100, Math.ceil(hi + 2) + 1)];
  }, [psrChartData]);

  const isPaymentsTab = tab === "payments";

  const yAxisConfig = useMemo(() => {
    if (isPaymentsTab) {
      const max = Math.max(...chartRows.flatMap((r) => [Number(r.today), Number(r.yesterday)]), 1);
      const ceil = Math.ceil(max / 100) * 100;
      const top = Math.max(ceil + 100, Math.ceil(max * 1.06));
      return { domain: [0, top] as [number, number], ticks: paymentYTicks(top) };
    }
    return { domain: [0, 12] as [number, number], ticks: [0, 3, 6, 9, 12] };
  }, [chartRows, isPaymentsTab]);

  const headlineMain = useMemo(() => {
    if (tab === "payments") return new Intl.NumberFormat("en-IN").format(summary.todayTotal);
    return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(summary.todayTotal as number)}`;
  }, [tab, summary]);

  const changePositive = summary.changePct >= 0;
  const { successRate, attention } = todaysAnalytics;

  if (isLoading) {
    return (
      <section className="grid gap-2 lg:grid-cols-12 lg:items-stretch lg:gap-3" aria-label="Today's analytics">
        <Card className="flex min-h-[300px] flex-col p-3 lg:col-span-8">
          <div className="mb-3 flex justify-between gap-3">
            <div className="h-[4.5rem] w-48 shimmer rounded-lg" />
            <div className="h-9 w-56 shrink-0 shimmer rounded-lg" />
          </div>
          <ChartSkeleton height="h-[232px]" />
        </Card>
        <div className="flex flex-col gap-2 lg:col-span-4">
          <Card className="p-3">
            <div className="h-4 w-32 shimmer rounded" />
            <div className="mt-2 h-8 w-20 shimmer rounded-md" />
            <div className="mt-2 h-[92px] shimmer rounded-lg" />
            <div className="mt-2 h-12 shimmer rounded" />
          </Card>
          <Card className="p-3">
            <div className="h-24 shimmer rounded-lg" />
          </Card>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-2 lg:grid-cols-12 lg:items-stretch lg:gap-3" aria-label="Today's analytics">
      <Card className="flex min-h-[300px] flex-col p-3 lg:col-span-8 lg:min-h-[316px]">
        <div className="flex flex-col gap-3 pt-0.5 sm:flex-row sm:items-start sm:justify-between">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="min-w-0 flex-1 px-1 pt-1 sm:px-2 sm:pt-1.5">
              <p className="text-[13px] font-normal text-muted-foreground">
                {tab === "gross" ? "Gross volume" : tab === "net" ? "Net volume" : "Total payments"}
              </p>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="font-sans text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-foreground tabular-nums">{headlineMain}</span>
                {!isPaymentsTab && <span className="text-[13px] font-normal leading-none text-muted-foreground">INR</span>}
              </div>
              <div className={cn("mt-1 flex flex-wrap items-center gap-1 text-[12px] font-semibold", changePositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                <Icon name={changePositive ? "trending-up" : "trending-down"} className="h-[13px] w-[13px] shrink-0" aria-hidden />
                <span className="tabular-nums">{changePositive ? "+" : ""}{summary.changePct}%</span>
                <span className="text-[11px] font-normal text-muted-foreground">vs yesterday</span>
              </div>
            </motion.div>
          </AnimatePresence>

          <LayoutGroup id="volume-metric-tabs">
            <div className="flex shrink-0 flex-wrap gap-0 rounded-lg border border-border bg-muted/45 p-1 dark:bg-muted/25" role="tablist" aria-label="Volume metric">
              {TABS.map((t) => (
                <Button key={t.id} type="button" role="tab" aria-selected={tab === t.id} variant="ghost" onClick={() => setTab(t.id)} className="relative h-auto min-h-0 gap-0 rounded-md border-0 bg-transparent px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:bg-transparent sm:px-3 sm:text-[13px]">
                  {tab === t.id && <motion.span layoutId="volume-tab-pill" className="absolute inset-0 z-0 rounded-md bg-card shadow-sm ring-1 ring-border dark:ring-border" transition={{ type: "spring", stiffness: 520, damping: 38 }} aria-hidden />}
                  <span className={cn("relative z-10", tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>{t.label}</span>
                </Button>
              ))}
            </div>
          </LayoutGroup>
        </div>

        <div className="mt-2 flex min-h-0 flex-1 flex-col">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }} className="flex min-h-[220px] flex-1 flex-col sm:min-h-[236px]">
              <div className="min-h-[220px] w-full flex-1 px-1 pb-0.5 pt-1 sm:min-h-[236px] sm:px-2 sm:pb-1 sm:pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartRows} margin={{ top: 4, right: 10, left: 0, bottom: 12 }}>
                    <defs>
                      <linearGradient id={`ta-fill-${gradId}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.28} />
                        <stop offset="40%" stopColor={CHART_PRIMARY_SOFT} stopOpacity={0.14} />
                        <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 6" stroke="var(--chart-grid)" vertical={false} />
                    <XAxis dataKey="label" axisLine={{ stroke: "var(--border)", strokeOpacity: 0.55 }} tickLine={false} tick={<VolumeChartXTick />} interval="preserveStartEnd" height={26} />
                    <YAxis domain={yAxisConfig.domain} ticks={yAxisConfig.ticks} allowDecimals={!isPaymentsTab} axisLine={false} tickLine={false} width={isPaymentsTab ? 48 : 44} tick={<VolumeChartYTick isPaymentsTab={isPaymentsTab} />} />
                    <Tooltip content={(props) => <VolumeAnalyticsTooltip {...props} isPaymentsTab={isPaymentsTab} showGrossPayMode={tab === "gross"} />} />
                    <Area type="monotone" dataKey="today" name="Today" stroke={CHART_PRIMARY} strokeWidth={2.25} fill={`url(#ta-fill-${gradId})`} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: CHART_PRIMARY }} />
                    <Line type="monotone" dataKey="yesterday" name="Yesterday" stroke={CHART_YESTERDAY} strokeWidth={1.75} strokeDasharray="5 4" dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: CHART_YESTERDAY }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="-mx-3 -mb-3 mt-4 overflow-hidden rounded-b-xl border-t border-border/60 bg-muted/35 dark:bg-muted/20">
          <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Upcoming settlement</p>
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-lg font-semibold leading-snug tracking-tight text-foreground tabular-nums sm:text-xl">{formatInrCompact(attention.settlementsDue.amount)}</span>
                <span className="text-[13px] font-normal text-muted-foreground"><span className="text-muted-foreground/45" aria-hidden>· </span>{attention.settlementsDue.expectedLabel}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-9 shrink-0 self-start px-3 text-sm sm:self-center" onClick={() => router.push("/settlement-reports")} rightIcon={<Icon name="arrow-up-right" className="h-3.5 w-3.5 shrink-0" aria-hidden />}>
              View settlement history
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-2 lg:col-span-4">
        <Card className="flex flex-col p-3">
          <p className="text-[13px] font-normal text-muted-foreground">Payment success rate</p>
          <p className="mt-3 font-sans text-[1.75rem] font-bold leading-none tracking-[-0.02em] text-foreground tabular-nums">{successRate.pct}%</p>

          <div className="mt-2 h-[92px] w-full sm:h-[100px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={psrChartData} margin={{ top: 4, right: 8, left: 0, bottom: 6 }}>
                <defs>
                  <linearGradient id={`psr-fill-${psrGradId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--chart-tick)" }} interval="preserveStartEnd" height={22} dy={4} />
                <YAxis domain={psrYDomain} axisLine={false} tickLine={false} width={38} tick={<PsrYAxisTick />} />
                <Tooltip content={(props) => {
                   
                  const { active, payload, label } = props as any;
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-2xl border border-border bg-card px-4 py-3.5 text-xs antialiased shadow-[0_10px_40px_-14px_rgba(15,23,42,0.2)] dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)]">
                      <p className="mb-2.5 font-semibold text-foreground">{label}</p>
                      {payload.map((entry: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />{entry.name}:</span>
                          <span className="font-semibold text-foreground">{Number(entry.value).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  );
                   
                }} />
                <Area type="monotone" dataKey="psrToday" name="Today" stroke="#059669" strokeWidth={2} fill={`url(#psr-fill-${psrGradId})`} dot={false} activeDot={{ r: 3, strokeWidth: 0, fill: "#059669" }} />
                <Line type="monotone" dataKey="psrYesterday" name="Yesterday" stroke={CHART_YESTERDAY} strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 border-t border-border pt-2.5">
            <div className="grid grid-cols-3 gap-1">
              <div className="text-left">
                <p className="text-[11px] font-medium text-muted-foreground">Successful</p>
                <p className="mt-1 flex items-center justify-start gap-1.5 font-sans text-sm font-bold tabular-nums tracking-[-0.02em] text-foreground"><span className="h-2 w-2 shrink-0 rounded-[3px] bg-emerald-500" />{new Intl.NumberFormat("en-IN").format(successRate.succeeded)}</p>
              </div>
              <div className="text-left">
                <p className="text-[11px] font-medium text-muted-foreground">Failed</p>
                <p className="mt-1 flex items-center justify-start gap-1.5 font-sans text-sm font-bold tabular-nums tracking-[-0.02em] text-foreground"><span className="h-2 w-2 shrink-0 rounded-[3px] bg-red-500" />{new Intl.NumberFormat("en-IN").format(successRate.failed)}</p>
              </div>
              <div className="text-left">
                <p className="text-[11px] font-medium text-muted-foreground">Avg. value</p>
                <p className="mt-1 font-sans text-sm font-bold tabular-nums tracking-[-0.02em] text-foreground">{formatInrCompact(successRate.avgTicket)}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="flex flex-col p-3">
          <p className="text-[13px] font-normal text-muted-foreground">Needs attention</p>
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-2.5 dark:bg-muted/15">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug text-foreground">Funds on hold</p>
                <p className="mt-1 font-sans text-sm font-bold tabular-nums tracking-[-0.02em] text-amber-800 dark:text-amber-300 sm:text-base">{formatInrCompact(attention.fundsOnHold.amount)}</p>
                <p className="mt-1 text-[11px] font-normal leading-snug text-muted-foreground">{attention.fundsOnHold.releaseLabel}</p>
              </div>
              <Button variant="outline" size="sm" className="h-7 shrink-0 px-2.5 text-xs" onClick={() => router.push("/transactions")} rightIcon={<Icon name="arrow-up-right" className="h-3 w-3 shrink-0" aria-hidden />}>
                Take action
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-2.5 dark:bg-muted/15">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug text-foreground">Open disputes</p>
                <p className="mt-1 font-sans text-sm font-bold tabular-nums tracking-[-0.02em] text-red-800 dark:text-red-400 sm:text-base">{formatInrCompact(attention.disputes.disputedAmount)}</p>
                <p className="mt-1 text-[11px] font-normal leading-snug text-muted-foreground">{attention.disputes.openCount} open {attention.disputes.openCount === 1 ? "case" : "cases"}</p>
              </div>
              <Button variant="outline" size="sm" className="h-7 shrink-0 px-2.5 text-xs" onClick={() => router.push("/dispute-management")} rightIcon={<Icon name="arrow-up-right" className="h-3 w-3 shrink-0" aria-hidden />}>
                Take action
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
