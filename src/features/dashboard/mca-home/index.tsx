"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";
import { GuideLauncher } from "@/components/common/guide/GuideLauncher";
import { GuideTour } from "@/components/common/guide/GuideTour";
import { useHasEcho } from "@/features/dashboard/echo/hooks";
import { WelcomeExperienceModal } from "@/features/dashboard/mca-home/components/WelcomeExperienceModal";
import { McaDashboardAurora } from "@/features/dashboard/mca-home/components/McaDashboardAurora";
import {
  MCA_DASHBOARD_GUIDE_ECHO_TARGET,
  MCA_DASHBOARD_GUIDE_KEY,
  MCA_DASHBOARD_GUIDE_STEPS,
} from "@/features/dashboard/mca-home/guide";
import { McaPromoCarousel } from "@/features/dashboard/mca-home/components/McaPromoCarousel";
import { McaRevenueCard } from "@/features/dashboard/mca-home/components/McaRevenueCard";
import { McaNeedsAttentionCard } from "@/features/dashboard/mca-home/components/McaNeedsAttentionCard";
import { McaUpcomingSettlementCard } from "@/features/dashboard/mca-home/components/McaUpcomingSettlementCard";
import { McaNeedsAttentionDrawer } from "@/features/dashboard/mca-home/components/McaNeedsAttentionDrawer";
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

  // The tour's Echo step points at the sidebar's Echo row, which only exists
  // for accounts that have Echo. Dropped rather than left to Spotlight's
  // onMissing, which waits ~6s before moving on — see the note on
  // MCA_DASHBOARD_GUIDE_ECHO_TARGET.
  const hasEcho = useHasEcho();
  const guideSteps = hasEcho
    ? MCA_DASHBOARD_GUIDE_STEPS
    : MCA_DASHBOARD_GUIDE_STEPS.filter((step) => step.target !== MCA_DASHBOARD_GUIDE_ECHO_TARGET);
  const [editMode, setEditMode] = useState(false);
  const [needsAttentionOpen, setNeedsAttentionOpen] = useState(false);
  const [welcomeTourOpen, setWelcomeTourOpen] = useState(false);
  const [layout, setLayout] = useState<McaWidgetId[]>(() => readMcaDashboardLayout());
  const layoutSnapshot = useRef<McaWidgetId[]>(layout);

  /**
   * Both Needs attention actions — Remind on an overdue invoice, View on one
   * still in its window — land on the invoice's details page. That page is
   * where "Email / remind client" lives, so chasing an invoice is one hop from
   * here rather than a separate action on the dashboard.
   *
   * The id is the invoice's own id, the same segment the invoice list pushes.
   * Note the needs-attention payload carries no MID, so the details page
   * resolves one itself (the selected MID, else the merchant's first PACB one).
   * For a merchant with several PACB MIDs and none selected, this list spans
   * them all and a row from another MID will not resolve — the payload needs a
   * `mid` per row to fix properly.
   */
  function handleOpenInvoice(id: string) {
    router.push(`/mca-invoices/${id}`);
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
    <McaDashboardAurora contentClassName="space-y-5">
      {/* ── 1. Greeting ──────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[1.35rem] font-bold leading-snug tracking-tight text-foreground">
            {greeting}, {displayName}
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
            <span>Amount received at live FX rates</span>
          </div>
        </div>
      </div>

      {/* ── 2. Shortcuts ─────────────────────────────────────────────────
          Directly under the greeting, above the performance cards — a
          loose row of pills, not another dashboard card, so it reads as
          part of the header area rather than a peer of what follows. */}
      <div data-guide="mca-quick-access">
        <McaQuickAccess editMode={editMode} onEditDashboard={handleCustomise} />
      </div>

      {/* ── 3. Primary business snapshot ────────────────────────────────
          Performance, wider, beside Needs attention — items-stretch is
          what keeps the narrower panel at the same height as the chart
          card instead of shrinking to its own shorter content. */}
      <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
        <div className="lg:col-span-8">
          <McaRevenueCard />
        </div>
        {/* Needs attention grows to fill whatever height the performance
            card sets; Upcoming settlement is fixed-height beneath it, so the
            two together match that card rather than either one alone. */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          <div className="min-h-0 flex-1" data-guide="mca-needs-attention">
            <McaNeedsAttentionCard
              onViewAll={() => setNeedsAttentionOpen(true)}
              onAction={handleOpenInvoice}
            />
          </div>
          <McaUpcomingSettlementCard />
        </div>
      </div>

      {/* ── 4. Promotional banners ───────────────────────────────────── */}
      <McaPromoCarousel />

      {/* ── 5–6. Deeper business insights ────────────────────────────── */}
      <div className="space-y-4 pt-2">
        <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">
          Explore your business
        </h2>

        {/* ── Configurable widgets (Transactions/globe, stat cards, charts,
            Client Analytics) ── */}
        <McaDashboardWidgetCustomization
          layout={layout}
          onLayoutChange={setLayout}
          editMode={editMode}
          onDiscardEdit={handleDiscardCustomise}
          onDoneEdit={handleDoneCustomise}
        />
      </div>

      <McaNeedsAttentionDrawer
        open={needsAttentionOpen}
        onOpenChange={setNeedsAttentionOpen}
        onOpenInvoice={handleOpenInvoice}
      />

      {/* Guide launcher — highlighted once here (the main dashboard), a plain
          button on every other screen. */}
      <GuideLauncher
        steps={guideSteps}
        storageKey={MCA_DASHBOARD_GUIDE_KEY}
        highlightOnFirstVisit
      />

      {/* Post-login welcome — a separate GuideTour instance from
          GuideLauncher's own internal one, since GuideLauncher exposes no
          imperative way to start its tour from outside itself. Both drive
          the exact same `guideSteps`/MCA_DASHBOARD_GUIDE_STEPS, so "Start
          tour" here and the floating Guide button run the identical
          walkthrough — this is just a second, session-gated entry point
          into it, not a second tour. */}
      <WelcomeExperienceModal onStartTour={() => setWelcomeTourOpen(true)} />
      <GuideTour
        steps={guideSteps}
        open={welcomeTourOpen}
        onClose={() => setWelcomeTourOpen(false)}
      />
    </McaDashboardAurora>
  );
}
