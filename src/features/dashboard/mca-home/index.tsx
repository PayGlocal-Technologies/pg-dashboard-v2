"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";
import { McaRevenueCard } from "@/features/dashboard/mca-home/components/McaRevenueCard";
import { McaClientAnalyticsCard } from "@/features/dashboard/mca-home/components/McaClientAnalyticsCard";
import { McaNeedsAttentionCard } from "@/features/dashboard/mca-home/components/McaNeedsAttentionCard";
import { McaQuickAccess } from "@/features/dashboard/mca-home/components/McaQuickAccess";
import { McaDashboardWidgetCustomization } from "@/features/dashboard/mca-home/components/widgets/McaDashboardWidgetCustomization";
import {
  readMcaDashboardLayout,
  writeMcaDashboardLayout,
  type McaWidgetId,
} from "@/features/dashboard/mca-home/widget-catalog";

/** Greeting bucket, computed once on mount (no impure Date in render), same
 * pattern as home/index.tsx's useGreeting. */
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

function useContextLine() {
  const [line] = useState<string>(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 9) return "Early bird! Here's what's waiting for you ☕";
    if (h >= 9 && h < 12) return "Here's your morning briefing 🌤️";
    if (h >= 12 && h < 14) return "Midday check-in, things are moving along 📈";
    if (h >= 14 && h < 17) return "Here's your overview for today";
    if (h >= 17 && h < 20) return "End of day, here's how today shaped up";
    if (h >= 20) return "Winding down, a quick look before you log off 🌙";
    return "Your cross-border business overview 🚀";
  });
  return line;
}

export function McaDashboardFeature() {
  const profile = useApp((s) => s.profile);
  const greeting = useGreeting();
  const contextLine = useContextLine();

  const firstName = profile?.firstName ?? "";
  const lastName = profile?.lastName ?? "";
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || profile?.username || "there";

  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [layout, setLayout] = useState<McaWidgetId[]>(() => readMcaDashboardLayout());
  const layoutSnapshot = useRef<McaWidgetId[]>(layout);

  function handleInvoice() {
    router.push("/create-invoice");
  }

  function handleViewSettlements() {
    toast.message("View settlements", { description: "This action isn't wired up yet." });
  }

  function handleViewAll(section: string) {
    toast.message(section, { description: "This action isn't wired up yet." });
  }

  function handleNeedsAttentionAction(id: string) {
    toast.message("Action queued", { description: `Follow-up started for ${id}.` });
  }

  function handleCustomise() {
    layoutSnapshot.current = [...layout];
    setEditMode(true);
    toast.message("Customise your dashboard", {
      description: "Add widgets, then drag tiles to reorder.",
    });
  }

  function handleDoneCustomise() {
    writeMcaDashboardLayout(layout);
    layoutSnapshot.current = [...layout];
    setEditMode(false);
    toast.success("Dashboard updated", { description: "Changes saved and edit mode closed." });
  }

  function handleDiscardCustomise() {
    setLayout([...layoutSnapshot.current]);
    setEditMode(false);
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* ── Page header ──────────────────────────────────────────────── */}
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
            variant="primary"
            size="sm"
            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" aria-hidden />}
            onClick={handleInvoice}
          >
            Invoice
          </Button>
        </div>
      </div>

      {/* ── Revenue + client analytics / needs attention ─────────────── */}
      <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-8">
          <McaRevenueCard onViewSettlements={handleViewSettlements} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <McaClientAnalyticsCard onViewAll={() => handleViewAll("Client analytics")} />
          <McaNeedsAttentionCard
            onViewAll={() => handleViewAll("Needs attention")}
            onAction={handleNeedsAttentionAction}
          />
        </div>
      </div>

      <McaQuickAccess editMode={editMode} onEditDashboard={handleCustomise} />

      {/* ── Configurable widgets (Transactions/globe, stat cards, charts) ── */}
      <McaDashboardWidgetCustomization
        layout={layout}
        onLayoutChange={setLayout}
        editMode={editMode}
        onDiscardEdit={handleDiscardCustomise}
        onDoneEdit={handleDoneCustomise}
      />
    </div>
  );
}
