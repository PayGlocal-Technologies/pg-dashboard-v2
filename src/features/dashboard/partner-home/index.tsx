"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useApp } from "@/stores/useApp";
import { TimeRangeTabs } from "@/components/common/TimeRangeTabs";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { McaDashboardAurora } from "@/features/dashboard/mca-home/components/McaDashboardAurora";
import { McaStatCard } from "@/features/dashboard/mca-home/components/McaStatCard";
import { OnboardingPipelineCard } from "@/features/dashboard/partner-home/components/OnboardingPipelineCard";
import { NextPayoutCard } from "@/features/dashboard/partner-home/components/NextPayoutCard";
import { ReferralLinksCard } from "@/features/dashboard/partner-home/components/ReferralLinksCard";
import { TopMerchantsCard } from "@/features/dashboard/partner-home/components/TopMerchantsCard";
import {
  ProductLegend,
  ProductSplit,
} from "@/features/dashboard/partner-home/components/ProductSplit";
import { dayMonth, inr } from "@/features/dashboard/partner-home/format";
import {
  PARTNER_DASHBOARD_MOCK,
  type ActionItem,
  type PartnerDashboardData,
  type PartnerPeriod,
} from "@/features/dashboard/partner-home/mock-data";

const PERIOD_OPTIONS = [
  { value: "month", label: "This month" },
  { value: "quarter", label: "Last 3 months" },
  { value: "year", label: "This year" },
] as const satisfies readonly { value: PartnerPeriod; label: string }[];

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
 * DESIGN MOCK: the Partner Dashboard (Partners → Home). An operating view,
 * in the MCA dashboard's own components and layout: how the business is
 * doing (KPIs), who needs the partner (pipeline and actions), what they'll
 * be paid (next payout), which merchants earn most, and how to bring more.
 */
export function PartnerDashboardFeature() {
  const router = useRouter();
  const profile = useApp((s) => s.profile);
  const greeting = useGreeting();
  const [period, setPeriod] = useState<PartnerPeriod>("month");
  const referralRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError } = usePartnerDashboard();

  const firstName = profile?.firstName || profile?.username || "there";
  const summary = data.summary[period];
  const attention = data.actionItems.length;

  // One line of context from the data: who needs the partner, then money.
  const lead =
    attention > 0
      ? `${attention} ${attention === 1 ? "merchant needs" : "merchants need"} your attention.`
      : `You have ${data.onboarding.live} live ${data.onboarding.live === 1 ? "merchant" : "merchants"}.`;
  const payoutLine = data.nextPayout
    ? ` Your next payout of ${inr(data.nextPayout.amount)} is due on ${dayMonth(data.nextPayout.date)}.`
    : "";

  function handleAction(item: ActionItem) {
    // MOCK: no partner action endpoints yet; confirms what would happen.
    const done = {
      "send-reminder": `Reminder sent to ${item.merchant}.`,
      "resend-invite": `Invite resent to ${item.merchant}.`,
      "complete-for-merchant": `Assisted onboarding for ${item.merchant} isn't connected yet.`,
    }[item.action];
    if (item.action === "complete-for-merchant") toast.message(done);
    else toast.success(done);
  }

  const count = (n: number) => n.toLocaleString("en-IN");
  const merchants = (n: number) => `${n} ${n === 1 ? "merchant" : "merchants"}`;

  const kpis = [
    {
      title: "Commission earned",
      split: summary.commissionEarned.split,
      formatSplit: inr,
      shares: true,
      valueLabel: inr(summary.commissionEarned.value),
      trendPct: summary.commissionEarned.changePct,
      spark: summary.commissionEarned.spark,
      accentColor: "var(--chart-1)",
    },
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
      {/* ── Greeting and actions ── */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-[1.35rem] font-bold leading-snug tracking-tight text-foreground">
            {greeting}, {firstName}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {lead}
            {payoutLine}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Icon name="link" className="h-3.5 w-3.5" />}
            onClick={() =>
              referralRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
            }
          >
            Share referral links
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
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
      </div>

      {isError ? (
        <PlaceholderState
          variant="error"
          title="Couldn't load your dashboard"
          description="Refresh the page to try again."
          className="py-16"
        />
      ) : (
        <>
          {/* ── Business overview ── */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                Business overview
              </h2>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="hidden md:flex">
                  <ProductLegend />
                </span>
                <TimeRangeTabs
                  options={PERIOD_OPTIONS}
                  value={period}
                  onValueChange={setPeriod}
                  label="Business overview period"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map(({ split, formatSplit, shares, ...k }) => (
                <McaStatCard
                  key={k.title}
                  data={{ ...k, comparisonLabel: summary.comparisonLabel }}
                  isLoading={isLoading}
                  // The split by product takes the sparkline's place.
                  footer={<ProductSplit split={split} format={formatSplit} shares={shares} />}
                />
              ))}
            </div>
          </section>

          {/* ── Attention and merchant performance (wide, left) beside money
              and growth (narrow, right). Top earning merchants sits under the
              pipeline rather than full width below both, so the two columns
              come out about even and neither leaves a gap under it. Below lg
              it all stacks: pipeline, payout, referral links, top merchants. */}
          <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
            <div className="contents lg:col-span-8 lg:flex lg:flex-col lg:gap-4">
              <OnboardingPipelineCard
                onboarding={data.onboarding}
                actionItems={data.actionItems}
                isLoading={isLoading}
                onViewAll={() => router.push(ROUTES.merchants)}
                onAction={handleAction}
              />
              <div className="order-last lg:order-none">
                <TopMerchantsCard
                  merchants={data.topMerchants}
                  isLoading={isLoading}
                  onSeeAll={() => router.push(ROUTES.liveMerchants)}
                />
              </div>
            </div>
            <div className="contents lg:col-span-4 lg:flex lg:flex-col lg:gap-4">
              <NextPayoutCard
                nextPayout={data.nextPayout}
                previousPayouts={data.previousPayouts}
                isLoading={isLoading}
                onViewPayouts={() => router.push(ROUTES.payouts)}
              />
              <div ref={referralRef}>
                <ReferralLinksCard
                  links={data.referralLinks}
                  onViewLinks={() => router.push(ROUTES.referralLinks)}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </McaDashboardAurora>
  );
}
