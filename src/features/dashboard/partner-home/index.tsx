"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { McaDashboardAurora } from "@/features/dashboard/mca-home/components/McaDashboardAurora";
import { OnboardingPipelineCard } from "@/features/dashboard/partner-home/components/OnboardingPipelineCard";
import { PartnerAttentionCard } from "@/features/dashboard/partner-home/components/PartnerAttentionCard";
import { PartnerCommissionCard } from "@/features/dashboard/partner-home/components/PartnerCommissionCard";
import { PartnerQuickAccess } from "@/features/dashboard/partner-home/components/PartnerQuickAccess";
import { ReferralLinksDialog } from "@/features/dashboard/partner-home/components/ReferralLinksDialog";
import {
  MerchantFollowUpDialog,
  type FollowUpKind,
} from "@/features/dashboard/partner-home/components/MerchantFollowUpDialog";
import { PreviousPayoutCard } from "@/features/dashboard/partner-home/components/PreviousPayoutCard";
import { ReferralLinksCard } from "@/features/dashboard/partner-home/components/ReferralLinksCard";
import { TopMerchantsCard } from "@/features/dashboard/partner-home/components/TopMerchantsCard";
import { PartnerMetricTile } from "@/features/dashboard/partner-home/components/PartnerMetricTile";
import { inr } from "@/features/dashboard/partner-home/format";
import {
  PARTNER_DASHBOARD_MOCK,
  type ActionItem,
  type PartnerDashboardData,
  type PartnerPeriod,
} from "@/features/dashboard/partner-home/mock-data";

/** Where each dashboard link goes: the routes the Partners navigation
 *  already uses. /my-merchants is listed there but not built yet. */
const ROUTES = {
  merchants: "/my-merchants",
  liveMerchants: "/my-merchants?status=live",
  payouts: "/commission",
  referralLinks: "/refer-and-earn",
} as const;

/** MOCK data hook, in the shape a real query would return. TODO(integration):
 *  replace with the partner dashboard endpoints (see mock-data.ts). */
function usePartnerDashboard(): {
  data: PartnerDashboardData;
  isLoading: boolean;
  isError: boolean;
} {
  return { data: PARTNER_DASHBOARD_MOCK, isLoading: false, isError: false };
}

/** Same greeting the MCA dashboard uses, read once on mount. */
function useGreeting() {
  const [greeting] = useState(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  });
  return greeting;
}

/**
 * DESIGN MOCK: the Partner Dashboard (Partners → Home), in the MCA
 * dashboard's hierarchy:
 *  1. greeting, with the one primary action (Add merchant);
 *  2. quick-access pills;
 *  3. the snapshot: commission earned (with its chart) and the other three
 *     KPIs under it, beside who needs the partner and the referral links;
 *  4. "Explore your business": the onboarding pipeline beside the last
 *     payout, then the top earning merchants.
 */
export function PartnerDashboardFeature() {
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const greeting = useGreeting();
  const [period, setPeriod] = useState<PartnerPeriod>("month");
  const { data, isLoading, isError } = usePartnerDashboard();

  const firstName = profile?.firstName || profile?.username || "there";
  const summary = data.summary[period];
  const attention = data.actionItems.length;

  // One line of context from the data: who needs the partner.
  const lead =
    attention > 0
      ? `${attention} ${attention === 1 ? "merchant needs" : "merchants need"} your attention.`
      : `You have ${data.onboarding.live} live ${data.onboarding.live === 1 ? "merchant" : "merchants"}.`;

  // Remind and Resend open their follow-up flow; what was sent this session
  // marks the row (and stops a second send straight after the first).
  const [followUp, setFollowUp] = useState<{ kind: FollowUpKind; item: ActionItem } | null>(null);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [referralOpen, setReferralOpen] = useState(false);
  const [followedUp, setFollowedUp] = useState<Record<string, FollowUpKind>>({});

  function handleAction(item: ActionItem) {
    if (item.action === "send-reminder" || item.action === "resend-invite") {
      setFollowUp({ kind: item.action, item });
      setFollowUpOpen(true);
      return;
    }
    // MOCK: assisted onboarding has no flow yet.
    toast.message(`Assisted onboarding for ${item.merchant} isn't connected yet.`);
  }

  const count = (n: number) => n.toLocaleString("en-IN");
  const merchants = (n: number) => `${n} ${n === 1 ? "merchant" : "merchants"}`;

  const kpis = [
    {
      title: "Gross volume",
      split: summary.grossVolume.split,
      formatSplit: inr,
      shares: true,
      valueLabel: inr(summary.grossVolume.value),
      trendPct: summary.grossVolume.changePct,
      spark: summary.grossVolume.spark,
      accentColor: "var(--chart-2)",
    },
    {
      title: "Transactions",
      split: summary.transactionCount.split,
      formatSplit: count,
      shares: true,
      valueLabel: summary.transactionCount.value.toLocaleString("en-IN"),
      trendPct: summary.transactionCount.changePct,
      spark: summary.transactionCount.spark,
      accentColor: "var(--chart-3)",
    },
    {
      title: "Live merchants",
      split: summary.liveMerchants.split,
      formatSplit: merchants,
      shares: false,
      valueLabel: String(summary.liveMerchants.value),
      trendPct: summary.liveMerchants.changePct,
      spark: summary.liveMerchants.spark,
      accentColor: "var(--chart-4)",
    },
  ];

  return (
    <McaDashboardAurora contentClassName="space-y-5">
      {/* ── 1. Greeting: one line of context, one primary action ── */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[1.35rem] font-bold leading-snug tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{lead}</p>
        </div>
        <Button
          type="button"
          variant="primary"
          leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
          onClick={() =>
            toast.message("Adding a merchant isn't connected yet", {
              description: "Share a referral link for now.",
            })
          }
        >
          Add merchant
        </Button>
      </div>

      {/* ── 2. Shortcuts ── */}
      <PartnerQuickAccess onReferralLinks={() => setReferralOpen(true)} />

      {isError ? (
        <PlaceholderState
          variant="error"
          title="Couldn't load your dashboard"
          description="Refresh the page to try again."
          className="py-16"
        />
      ) : (
        <>
          {/* ── 3. Snapshot: what they earn, beside who needs them and how to
              bring more. The right column stretches to the commission card's
              height: Needs your attention takes the room, the referral links
              sit fixed under it, in view without scrolling. */}
          <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
            {/* Left: the commission card takes whatever height is left once
                the three compact KPIs under it are placed, so all of it sits
                in view together. */}
            <div className="flex flex-col gap-4 lg:col-span-8">
              <div className="min-h-0 flex-1">
                <PartnerCommissionCard
                  kpi={summary.commissionEarned}
                  comparisonLabel={summary.comparisonLabel}
                  period={period}
                  onPeriodChange={setPeriod}
                  isLoading={isLoading}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {kpis.map(({ split, formatSplit, shares, title, valueLabel, trendPct }) => (
                  <PartnerMetricTile
                    key={title}
                    title={title}
                    valueLabel={valueLabel}
                    trendPct={trendPct}
                    comparisonLabel={summary.comparisonLabel}
                    split={split}
                    formatSplit={formatSplit}
                    shares={shares}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4 lg:col-span-4">
              <div className="min-h-0 flex-1">
                <PartnerAttentionCard
                  items={data.actionItems}
                  isLoading={isLoading}
                  onViewAll={() => router.push(ROUTES.merchants)}
                  onAction={handleAction}
                  followedUp={followedUp}
                />
              </div>
              <ReferralLinksCard
                links={data.referralLinks}
                onViewLinks={() => router.push(ROUTES.referralLinks)}
              />
            </div>
          </div>

          {/* ── 4. Deeper insights ── */}
          <section className="space-y-4 pt-2">
            <h2 className="text-base font-semibold tracking-[-0.01em] text-foreground">
              Explore your business
            </h2>

            <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
              <div className="lg:col-span-8">
                <OnboardingPipelineCard
                  onboarding={data.onboarding}
                  isLoading={isLoading}
                  onViewAll={() => router.push(ROUTES.merchants)}
                />
              </div>
              <div className="lg:col-span-4">
                <PreviousPayoutCard
                  payouts={data.previousPayouts}
                  isLoading={isLoading}
                  onViewPayouts={() => router.push(ROUTES.payouts)}
                />
              </div>
            </div>

            <TopMerchantsCard
              merchants={data.topMerchants}
              isLoading={isLoading}
              onSeeAll={() => router.push(ROUTES.liveMerchants)}
            />
          </section>
        </>
      )}
      <ReferralLinksDialog
        open={referralOpen}
        onOpenChange={setReferralOpen}
        links={data.referralLinks}
        onViewAll={() => router.push(ROUTES.referralLinks)}
      />
      <MerchantFollowUpDialog
        kind={followUp?.kind ?? "send-reminder"}
        item={followUp?.item ?? null}
        open={followUpOpen}
        onOpenChange={setFollowUpOpen}
        onSent={(item, kind) => setFollowedUp((prev) => ({ ...prev, [item.id]: kind }))}
      />
    </McaDashboardAurora>
  );
}
