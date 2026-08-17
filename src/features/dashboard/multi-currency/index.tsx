"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, MetricSparklineCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { VirtualAccountList } from "@/features/dashboard/multi-currency/components/VirtualAccountList";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { ShareAccountDetailsModal } from "@/features/dashboard/multi-currency/components/ShareAccountDetailsModal";
import { FxCalculatorModal } from "@/features/dashboard/multi-currency/components/FxCalculatorModal";
import { AccountCurrencyNotice } from "@/features/dashboard/multi-currency/components/AccountCurrencyNotice";
import { HowItWorksDialog } from "@/features/dashboard/multi-currency/components/HowItWorksDialog";
import {
  MULTI_CURRENCY_SUMMARY,
  TOTAL_EARNING_TREND,
} from "@/features/dashboard/multi-currency/mock-data";
import { useVirtualAccounts } from "@/features/dashboard/multi-currency/hooks";
import { formatAccount, formatFullAccount } from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

export function MultiCurrencyFeature() {
  // The merchant's own receiving accounts. The response also carries an
  // `amazon` bucket, which this page deliberately ignores — those are Amazon
  // payout accounts and belong to the Platforms page, which reads the same
  // query with bucket "amazon".
  const { accounts, isLoading } = useVirtualAccounts("general");

  // Unique per mount so the Settled Amount chart's fill gradient doesn't
  // collide with another <linearGradient> id elsewhere on the page.
  const settledAmountGradientId = useId().replace(/:/g, "");

  // Exactly one account is selected at all times — defaults to the first so
  // Account Details is populated immediately on load, not only after an
  // explicit click.
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? "");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  const selectAccount = (account: VirtualAccount) => setSelectedAccountId(account.id);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [fxModalOpen, setFxModalOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const handleCopyAccount = (account: VirtualAccount) =>
    copyToClipboard(formatAccount(account), `${account.accountName} details copied`);

  // The details section shows every field, not just the card's compact two —
  // its copy/share actions need the fuller text block to match.
  const handleCopyFullAccount = (account: VirtualAccount) =>
    copyToClipboard(formatFullAccount(account), `${account.accountName} details copied`);

  /**
   * Uses the OS share sheet where the browser exposes one, and falls back to
   * putting the same text on the clipboard elsewhere. Replace with the
   * dedicated share flow once it ships.
   */
  const share = async (title: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        // User dismissed the sheet, or the browser refused — fall through to copy.
      }
    }
    await copyToClipboard(text, "Account details copied — ready to send to your client");
  };

  const handleShareAccount = (account: VirtualAccount) => {
    void share(account.accountName, formatAccount(account));
  };

  const handleShareFullAccount = (account: VirtualAccount) => {
    void share(`${account.countryName} Account`, formatFullAccount(account));
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      {/* Both actions go through PageHeader's own actions slot. They belong with
          the title rather than below the accounts because both are about the
          page's subject as a whole: what a foreign-currency invoice becomes in
          INR, and how a client actually pays into these accounts. pg-dashboard
          puts its FxCalculatorBanner and "How it works?" on this same page.

          Ordered by how often they are needed — the calculator is a tool a
          merchant returns to, "How it works?" is read once — and ghost vs
          outline says which is which without a second row. */}
      <PageHeader
        title="Virtual accounts"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {selectedAccount && (
              <Button
                variant="ghost"
                size="sm"
                leftIcon={<Icon name="help-circle" className="h-4 w-4" />}
                onClick={() => setHowItWorksOpen(true)}
              >
                How it works?
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Icon name="calculator" className="h-4 w-4" />}
              onClick={() => setFxModalOpen(true)}
            >
              Forex calculator
            </Button>
          </div>
        }
      />

      <FxCalculatorModal open={fxModalOpen} onOpenChange={setFxModalOpen} />

      {/* Keyed to the selected account: the rail and its timeline differ per
          currency, so the guide follows the selection rather than being a
          single page-level explainer. */}
      {selectedAccount && (
        <HowItWorksDialog
          currency={selectedAccount.currency}
          open={howItWorksOpen}
          onOpenChange={setHowItWorksOpen}
        />
      )}

      {selectedAccount && (
        <ShareAccountDetailsModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          account={selectedAccount}
          accounts={accounts}
          onCopyLink={(url) => copyToClipboard(url, "Link copied")}
          onCopyFullAccount={handleCopyFullAccount}
          onShareFullAccount={handleShareFullAccount}
        />
      )}

      <VirtualAccountList
        accounts={accounts}
        isLoading={isLoading}
        onCopy={handleCopyAccount}
        onShare={handleShareAccount}
        selectedAccountId={selectedAccount?.id ?? ""}
        onSelect={selectAccount}
      />

      {/* Two-column layout: Account Details sizes to its own content
          (capped at 730px — see VirtualAccountDetails), the summary cards
          fill whatever width is left, stacked in their own column rather
          than side by side. items-start keeps both top-aligned even though
          their heights differ; flex-wrap drops the summary cards below
          Account Details on narrow viewports instead of squeezing either. */}
      {selectedAccount && (
        // key remounts the whole section on every selection change, so the
        // fade replays on every switch, not just the first render.
        <div
          key={selectedAccount.id}
          className="mt-4 flex flex-wrap items-start gap-4 page-enter"
        >
          {/* Details and their currency's caveat as one column: the notice is
              about the account whose details sit above it, so it travels with
              them rather than with the summary cards beside them. Renders
              nothing for a currency that carries no caveat. */}
          <div className="w-full max-w-[730px] space-y-3">
            <VirtualAccountDetails
              account={selectedAccount}
              onCopy={handleCopyFullAccount}
              onShare={() => setShareModalOpen(true)}
              className="w-full max-w-none"
            />
            <AccountCurrencyNotice currency={selectedAccount.currency} />
          </div>
          {/* Total Earnings/Outstanding span every account, not just the
              selected one, so they don't live inside VirtualAccountDetails'
              own per-account remount above. */}
          <div className="min-w-0 flex-1">
            {/* items-start on the row above aligns both columns to the top
                of the *tallest element in each* — but VirtualAccountDetails'
                own "{Country} Account" caption sits above its Card, so
                without this spacer the row's shared top edge would be that
                caption's top, not the Card's. Same classes as that caption
                (just invisible), rather than a guessed margin value, so the
                two stay pixel-aligned regardless of how its line-height
                actually resolves. Kept outside the space-y-4 below so it
                contributes only its own mb-2 — matching the caption's own
                mb-2-then-Card spacing — not an extra 16px on top of it. */}
            <div aria-hidden className="mb-2 text-[11px] font-semibold uppercase tracking-wide">
              &nbsp;
            </div>
            <div className="space-y-4">
              {/* Not MetricSparklineCard: that renders its sparkline as a
                  tiny borderless corner overlay with no axes, which can't
                  satisfy this card's "line + area chart with monthly
                  X-axis labels and USD Y-axis values" requirement. Built
                  from the same card shell (rounded-xl border bg-card p-5
                  shadow-sm) and the same recharts primitives/styling flux-ui
                  itself uses in DashboardAreaChartTemplate, so it stays
                  visually consistent with Outstanding below and with the
                  rest of the app's charts without introducing a new chart
                  abstraction. */}
              <div className="rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm">
                <span className="truncate text-sm font-semibold text-foreground">
                  Settled amount in USD
                </span>

                <div className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                  {MULTI_CURRENCY_SUMMARY.totalEarnings.value}
                </div>

                {/* Secondary to the USD figure above it: smaller size, muted
                    colour, same left edge — supporting context, not a second
                    headline. */}
                <div className="mt-1 text-sm tabular-nums text-muted-foreground">
                  {MULTI_CURRENCY_SUMMARY.totalEarnings.valueInr}
                </div>

                {/* Own row below the INR line (not sharing its baseline) so
                    the indicator reads as a distinct, lower-priority step,
                    right-aligned per the reference. */}
                <div className="mt-2 flex items-center justify-end gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Icon name="trending-up" className="h-3.5 w-3.5 shrink-0" />
                  <span>{MULTI_CURRENCY_SUMMARY.totalEarnings.trendLabel}</span>
                </div>

                <div className="mt-6 h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={TOTAL_EARNING_TREND} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id={settledAmountGradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="color-mix(in srgb, var(--border) 65%, transparent)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="x"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        tickFormatter={(v: number) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v}`)}
                        width={44}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          fontSize: 12,
                          background: "var(--popover)",
                          color: "var(--popover-foreground)",
                        }}
                        formatter={(v) => [`$${Number(v).toLocaleString("en-US")}`, "Settled"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="y"
                        stroke="var(--chart-4)"
                        strokeWidth={2}
                        fill={`url(#${settledAmountGradientId})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <MetricSparklineCard
                title="Outstanding"
                icon={<Icon name="clock" />}
                value={MULTI_CURRENCY_SUMMARY.outstanding.value}
                // "flat" is what keeps this note at muted body colour — it's
                // supporting context, not a movement against a prior period.
                trend={{ direction: "flat", label: MULTI_CURRENCY_SUMMARY.outstanding.note }}
                data={[]}
                onInfoClick={() => toast.info(MULTI_CURRENCY_SUMMARY.outstanding.info)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
