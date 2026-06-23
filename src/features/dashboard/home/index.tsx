"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useApp } from "@/stores/useApp";
import {
  readDashboardLayout,
  writeDashboardLayout,
  type WidgetId,
} from "@/features/dashboard/home/widget-catalog";
import { TodaysAnalyticsSection } from "@/features/dashboard/home/components/TodaysAnalyticsSection";
import { QuickAccess } from "@/features/dashboard/home/components/QuickAccess";
import { PayGlocalAdvantageBanner } from "@/features/dashboard/home/components/PayGlocalAdvantageBanner";
import { RecentActivityTable } from "@/features/dashboard/home/components/RecentActivityTable";
import { DashboardWidgetCustomization } from "@/features/dashboard/home/components/widgets/DashboardWidgetCustomization";

/** Greeting bucket — computed once on mount (no impure Date in render). */
function useGreeting() {
  const [greeting] = useState<string>(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  });
  return greeting;
}

/** Time/day-aware context line — computed once on mount. */
function useContextLine() {
  const [line] = useState<string>(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const h = now.getHours();
    const date = now.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    if (day === 1 && h < 11) return `Here's everything lined up for the week ahead 🗓️`;
    if (day === 5 && h >= 15) return `Great work this week — here's your final summary 🎉`;
    if (day === 0 || day === 6) return `Taking a weekend peek at your numbers 📊`;
    if (h >= 5 && h < 9) return `Early bird! Here's what's waiting for you ☕`;
    if (h >= 9 && h < 12) return `Here's your morning briefing for ${date} 🌤️`;
    if (h >= 12 && h < 14) return `Midday check-in — things are moving along 📈`;
    if (h >= 14 && h < 17) return `Here's your overview for ${date}`;
    if (h >= 17 && h < 20) return `End of day — here's how ${date} shaped up today`;
    if (h >= 20) return `Winding down — a quick look before you log off 🌙`;
    return `Your business overview for ${date} 🚀`;
  });
  return line;
}

export function DashboardHomeFeature() {
  const profile = useApp((s) => s.profile);
  const greeting = useGreeting();
  const contextLine = useContextLine();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<WidgetId[]>(() => readDashboardLayout());
  const layoutSnapshot = useRef<WidgetId[]>(layout);
  const [activeTab, setActiveTab] = useState(0);

  const firstName = profile?.firstName ?? "";
  const lastName = profile?.lastName ?? "";
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || profile?.username || "there";

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 1300);
    return () => clearTimeout(t);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsRefreshing(false);
    }, 1300);
  };

  const handleCustomise = () => {
    layoutSnapshot.current = [...layout];
    setEditMode(true);
    toast.message("Customise your dashboard", {
      description: "Drag widgets from the library on the right onto your dashboard.",
    });
  };

  const handleDoneCustomise = () => {
    writeDashboardLayout(layout);
    layoutSnapshot.current = [...layout];
    setEditMode(false);
    toast.success("Dashboard updated", {
      description: "Changes saved and edit mode closed.",
    });
  };

  const handleDiscardCustomise = () => {
    setLayout([...layoutSnapshot.current]);
    setEditMode(false);
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* ── Page header + tab switcher ──────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-[1.35rem] font-bold leading-snug tracking-tight text-foreground">
              {greeting}, {displayName}{" "}
              <span
                className="inline-block origin-bottom-right"
                style={{ animation: "wave 2.4s ease-in-out infinite" }}
              >
                👋
              </span>
            </h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{contextLine}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
              <Icon
                name="check-circle"
                className="h-3 w-3 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span>Amount received at mid-market rate</span>
            </div>
            <div className="hidden h-3.5 w-px bg-border sm:block" />
            <Button
              variant="outline"
              size="sm"
              isLoading={isRefreshing}
              leftIcon={<Icon name="refresh" className="h-3.5 w-3.5" aria-hidden />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon name="download" className="h-3.5 w-3.5" aria-hidden />}
            >
              Export
            </Button>
          </div>
        </div>

        {/* Tab switcher — sits flush below header */}
        <div className="flex w-fit items-center gap-1 rounded-xl border border-border/70 bg-muted/60 p-1 dark:border-border dark:bg-muted/40">
          {["Payment Gateway", "Multi-Currency Accounts"].map((tab, i) => (
            <Button
              key={tab}
              variant="ghost"
              onClick={() => setActiveTab(i)}
              className={cn(
                "h-auto rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150",
                i === activeTab
                  ? "bg-card text-foreground shadow-sm dark:border dark:border-border dark:bg-muted"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      <PayGlocalAdvantageBanner />

      {/* ── Today's analytics (replaces four KPI cards) ─────────────── */}
      <TodaysAnalyticsSection isLoading={isLoading} />

      {/* ── Quick access + dashboard edit (Stripe-style) ───────────── */}
      <QuickAccess editMode={editMode} onEditDashboard={handleCustomise} />

      {/* ── Configurable charts & insights ─────────────────────────── */}
      <DashboardWidgetCustomization
        layout={layout}
        onLayoutChange={setLayout}
        editMode={editMode}
        isLoading={isLoading}
        onDiscardEdit={handleDiscardCustomise}
        onDoneEdit={handleDoneCustomise}
      />

      {/* ── Recent Activity ─────────────────────────────────────────── */}
      <RecentActivityTable isLoading={isLoading} />
    </div>
  );
}
