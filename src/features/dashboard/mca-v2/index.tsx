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
import { Button, Card, MetricSparklineCard, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { currencySymbol, formatCurrency } from "@/lib/utils/format";
import { RegionSelector } from "@/features/dashboard/multi-currency/components/RegionSelector";
import { ShareAccountDetailsModal } from "@/features/dashboard/multi-currency/components/ShareAccountDetailsModal";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { formatFullAccount } from "@/features/dashboard/multi-currency/utils";
import { MCA_V2_REGIONS } from "@/features/dashboard/mca-v2/constants";
import { MCA_V2_SUMMARY, SETTLED_AMOUNT_BY_CURRENCY } from "@/features/dashboard/mca-v2/mock-data";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/** Module title — the step below the page's own h1, shared by both columns. */
const MODULE_TITLE = "text-base font-semibold text-foreground";

/** Supporting copy under a module title, and secondary text inside a module. */
const MODULE_SUBTITLE = "text-[13px] text-muted-foreground";

/**
 * MCA v2 — receiving account details, one client region at a time.
 *
 * Where the Virtual Accounts page fans every account out as a scrollable
 * carousel, v2 narrows to a single question: which region is your client
 * paying from? The region list on the left is the only control on the page,
 * and everything on the right (header, account card, share/copy targets) is
 * derived from the one selected account — no navigation, no reload.
 *
 * Nothing here is a new component. The region rows, the account details card
 * and the share modal are the same ones Multi Currency Accounts renders; this
 * file is only the two-column arrangement of them.
 */
export function McaV2Feature() {
  const accounts = MCA_V2_REGIONS;

  // Exactly one region is selected at all times — defaults to the first so
  // the right column is populated on load, not only after a click.
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? "");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  // Drives the settled-amount card's title, both amounts and its chart. Falls
  // back to the first region's figures rather than rendering an empty card if
  // a region ever carries a currency the summary data has no entry for.
  const currency = selectedAccount?.currency ?? "";
  const settled = SETTLED_AMOUNT_BY_CURRENCY[currency] ?? SETTLED_AMOUNT_BY_CURRENCY.USD;

  // Unique per mount so the settled-amount chart's fill gradient doesn't
  // collide with another <linearGradient> id elsewhere on the page.
  const settledGradientId = useId().replace(/:/g, "");

  const [shareModalOpen, setShareModalOpen] = useState(false);

  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const handleCopyAccount = (account: VirtualAccount) =>
    copyToClipboard(formatFullAccount(account), `${account.countryName} account details copied`);

  /**
   * Uses the OS share sheet where the browser exposes one, and falls back to
   * putting the same text on the clipboard elsewhere — identical to the
   * Virtual Accounts page's own fallback.
   */
  const handleShareAccount = async (account: VirtualAccount) => {
    const text = formatFullAccount(account);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${account.countryName} Account`, text });
        return;
      } catch {
        // User dismissed the sheet, or the browser refused — fall through to copy.
      }
    }
    await copyToClipboard(text, "Account details copied — ready to send to your client");
  };

  return (
    <div className="mx-auto max-w-[1400px] page-enter">
      {/* The page's spacing scale, tightest to loosest — no two of these steps
          are the same size, so proximity alone says what belongs to what:
            4px   title → its own supporting description
            12px  section title → the container it introduces
            24px  page header → the first content container
            32px  one section → the next
          PageHeader's own mb-6 is already that 24px step, so it needs no
          override; its internal title → subtitle gap is the 4px one. */}
      <PageHeader
        title="Virtual Accounts"
        subtitle="Receive international payments using your virtual accounts."
      />

      {selectedAccount && (
        <ShareAccountDetailsModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          account={selectedAccount}
          accounts={accounts}
          onCopyLink={(url) => copyToClipboard(url, "Link copied")}
          onCopyFullAccount={handleCopyAccount}
          onShareFullAccount={(account) => void handleShareAccount(account)}
        />
      )}

      {/* Both columns are titled modules of the same shape: a title block, then
          the content it introduces.

          Explicit col-start/row-start rather than one wrapper div per column —
          the same placement technique TransactionDetailsPage's own two-column
          grid uses. Row 1 carries only the left column's title, so row 2 is
          where the region Card and the right column both begin, putting the
          summary row's top edge exactly on the region Card's whatever height
          that title resolves to. Two column wrappers could only match those
          edges by hard-coding a header height.

          DOM order stays left title → left content → right content, so the
          stacked single-column layout below `lg` (where every explicit
          placement drops out) still reads in the right order. gap-x-10 is the
          shared gutter, gap-y-3 the 12px title → container step. */}
      <div className="grid gap-x-10 gap-y-3 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start">
        <div className="lg:col-start-1 lg:row-start-1">
          <h2 className={MODULE_TITLE}>Select Client Region</h2>
        </div>

        {/* p-3 rather than Card's own 28px inset: the rows carry their own
            px-5, so the card's padding only has to keep them clear of its
            edge — anything more and the region names sit adrift of the title
            above the card. */}
        <Card size="sm" className="gap-0 p-3 lg:col-start-1 lg:row-start-2">
          <RegionSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onSelect={(account) => setSelectedAccountId(account.id)}
            label="Select client region"
            size="md"
          />
        </Card>

        {/* space-y-8 is the 32px section → section step, the loosest on the
            page. mt-5 restores that separation below `lg`, where this column
            stacks under the region Card and would otherwise inherit the grid's
            own 12px title → container gap; on `lg` and up it must be zero or
            the column would no longer start level with that Card. */}
        <div className="mt-5 space-y-8 lg:col-start-2 lg:row-start-2 lg:mt-0">
          {/* Summary row: the first thing in this column, so its top edge
              lands on the region Card's. items-start lets each card keep its
              own height — stretching the short Outstanding card to the settled
              card's chart height would leave a block of dead space inside it. */}
          <div className="grid items-start gap-4 md:grid-cols-2">
            {/* Not MetricSparklineCard: that renders its sparkline as a tiny
            borderless corner overlay with no axes, which can't carry this
            card's monthly X axis and settled-amount Y axis. Built on the same
            flux-ui Card as every other module here, with the recharts
            primitives and styling flux-ui itself uses in
            DashboardAreaChartTemplate, so it stays consistent with Outstanding
            beside it without introducing a chart abstraction of its own.
            Mirrors the settled-amount card on the Multi Currency Accounts
            page, with every figure keyed off the selected region's currency
            rather than fixed to USD. */}
            <Card className="gap-0 p-5">
              <span className="truncate text-sm font-semibold text-foreground">
                Settled amount in {currency}
              </span>

              <div className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
                {settled.value}
              </div>

              {/* Secondary to the figure above it: smaller size, muted colour,
              same left edge — supporting context, not a second headline. */}
              <div className="mt-1 text-sm tabular-nums text-muted-foreground">
                {settled.valueInr}
              </div>

              {/* Own row below the INR line (not sharing its baseline) so the
              indicator reads as a distinct, lower-priority step. */}
              <div className="mt-2 flex items-center justify-end gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Icon name="trending-up" className="h-3.5 w-3.5 shrink-0" />
                <span>{settled.trendLabel}</span>
              </div>

              <div className="mt-6 h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={settled.trend}
                    margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id={settledGradientId} x1="0" y1="0" x2="0" y2="1">
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
                    {/* Axis and tooltip both read in the selected currency, so the
                    chart never contradicts the headline figure above it. */}
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      tickFormatter={(v: number) =>
                        v >= 1000
                          ? `${currencySymbol(currency)}${(v / 1000).toFixed(0)}K`
                          : `${currencySymbol(currency)}${v}`
                      }
                      width={52}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        background: "var(--popover)",
                        color: "var(--popover-foreground)",
                      }}
                      formatter={(v) => [formatCurrency(Number(v), currency, "en-US"), "Settled"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="y"
                      stroke="var(--chart-4)"
                      strokeWidth={2}
                      fill={`url(#${settledGradientId})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <MetricSparklineCard
              title="Outstanding"
              icon={<Icon name="clock" />}
              value={MCA_V2_SUMMARY.outstanding.value}
              // "flat" is what keeps this note at muted body colour — it is
              // supporting context, not a movement against a prior period.
              trend={{ direction: "flat", label: MCA_V2_SUMMARY.outstanding.note }}
              data={[]}
              onInfoClick={() => toast.info(MCA_V2_SUMMARY.outstanding.info)}
            />
          </div>

          {selectedAccount && (
            // key remounts the section on every region change so the fade
            // replays on each switch, not just the first render.
            <section key={selectedAccount.id} className="page-enter">
              {/* mb-3 is the 12px title → container step, deliberately much
                  tighter than the 32px between this section and its
                  neighbours: the heading belongs to the card beneath it, not
                  to the summary row above it. */}
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h2 className={MODULE_TITLE}>
                  Receive payments from {selectedAccount.countryName}
                </h2>
                {/* Tertiary action: the link variant carries no fill or
                    border, so it reads as one step below the module title it
                    sits beside. -mr-2 cancels the variant's own horizontal
                    padding so the label's right edge lines up with the card
                    edge below it, and -mt-1 pulls it back onto the title's own
                    line after items-start has top-aligned the row. */}
                <Button
                  variant="link"
                  className="-mr-2 -mt-1 text-[13px] underline"
                  onClick={() => toast.info("Help article coming soon")}
                >
                  How it works?
                </Button>
              </div>

              {/* Same Account Details card the Multi Currency Accounts page
                  and the share modal render — `inside` moves the
                  flag/name/subtitle into the card (there's no carousel here
                  naming the account), and the width override drops its default
                  shrink-wrapping so it fills this column. */}
              <VirtualAccountDetails
                account={selectedAccount}
                onCopy={handleCopyAccount}
                onShare={() => setShareModalOpen(true)}
                headerPlacement="inside"
                className="w-full max-w-none"
              />
            </section>
          )}

          <section>
            <h2 className={cn(MODULE_TITLE, "mb-3")}>Documents you might need</h2>

            {/* Secondary module: same surface and padding as the account card
                above it, but its copy sits at supporting weight rather than
                the section-title weight, so it reads as the lesser of the
                two. */}
            <Card size="sm" className="flex-row flex-wrap items-center justify-between gap-4 py-6">
              <div className="min-w-0 space-y-1">
                <p className="text-[13px] font-medium text-foreground">
                  Need proof of account ownership?
                </p>
                <p className={MODULE_SUBTITLE}>
                  Download an official document confirming ownership of this receiving account.
                </p>
              </div>
              {/* Placeholder until the proof-of-account document endpoint
                  exists — same stand-in treatment as How it works? above. */}
              <Button
                variant="outline"
                className="shrink-0"
                rightIcon={<Icon name="download" className="h-4 w-4" />}
                onClick={() => toast.info("Proof of account ownership will be available soon")}
              >
                Download proof of account ownership
              </Button>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}
