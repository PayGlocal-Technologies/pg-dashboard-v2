"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { Button, Card, PageHeader, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCurrencyShort } from "@/lib/utils/format";
import { CompactAmount } from "@/components/common/CompactAmount";
import { OutstandingAmountCard } from "@/features/dashboard/mca-transactions/components/OutstandingAmountCard";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { useSettledCurrencyTrend } from "@/features/dashboard/mca-transactions/hooks";
import { InternationalAccountsAurora } from "@/features/dashboard/multi-currency/components/InternationalAccountsAurora";
import { RegionSelector } from "@/features/dashboard/multi-currency/components/RegionSelector";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { ShareAccountDetailsModal } from "@/features/dashboard/multi-currency/components/ShareAccountDetailsModal";
import { GuideLauncher } from "@/components/common/guide/GuideLauncher";
import {
  MCA_INTL_ACCOUNTS_GUIDE_KEY,
  MCA_INTL_ACCOUNTS_GUIDE_STEPS,
} from "@/features/dashboard/multi-currency/guide";
import { FxCalculatorModal } from "@/features/dashboard/multi-currency/components/FxCalculatorModal";
import { useUrlAction } from "@/lib/hooks/useUrlAction";
import { AccountCurrencyNotice } from "@/features/dashboard/multi-currency/components/AccountCurrencyNotice";
import { HowItWorksDialog } from "@/features/dashboard/multi-currency/components/HowItWorksDialog";
import {
  useAccountDocumentDownload,
  useNeedsMidSelection,
  useVirtualAccounts,
} from "@/features/dashboard/multi-currency/hooks";
import { SelectMidView } from "@/components/common/SelectMidView";
import {
  accountDocumentId,
  accountNumberOf,
  formatFullAccount,
} from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/** Module title — the step below the page's own h1, shared by both columns.
 *  Same tokens the Platforms page uses, so the two read as one product. */
const MODULE_TITLE = "text-base font-semibold text-foreground";

/** Supporting copy under a module title, and secondary text inside a module. */
const MODULE_SUBTITLE = "text-[13px] text-muted-foreground";

/** Account currencies the settled-currency-trend endpoint groups under its
 *  REST_OF_WORLD row — the two folded rails (AED/SGD) plus the dollar/global
 *  buckets the Rest of the World virtual account can carry. */
const REST_OF_WORLD_CURRENCIES = new Set(["AED", "SGD", "REST_OF_WORLD", "Dollar", "GLOBAL"]);

export function InternationalAccounts2Feature() {
  // Same MID gate as /multi-currency — these endpoints put one MID in the
  // path, so a multi-MID merchant has to say which account they mean first.
  const needsMidSelection = useNeedsMidSelection();

  if (needsMidSelection) {
    return (
      <InternationalAccountsAurora contentClassName="space-y-4">
        <PageHeader title="International accounts" />
        <SelectMidView midType="PACB" />
      </InternationalAccountsAurora>
    );
  }

  return <InternationalAccounts2Content />;
}

/**
 * International Accounts 2 — a layout experiment on the same data and the
 * same components as /multi-currency (MultiCurrencyContent), not a second
 * implementation of it.
 *
 * The region picker is a horizontal row of cards spanning the full page
 * width at the top (RegionSelector's `variant="cards"`, the same tiles
 * /multi-currency only shows below `lg` as a narrow-viewport fallback) —
 * not the vertical 288px list column that used to sit on the left at every
 * width. Everything below it is two columns instead of three: the account
 * details column (with Share/Copy promoted directly under the header, ahead
 * of the field grid, via VirtualAccountDetails' `actionsPlacement="top"`)
 * and a Metrics column with its cards stacked one above the other instead
 * of wrapping in a flex row beside the account card. The account/Metrics
 * split is 60/40 — the narrower account column, plus its field grid now
 * forced to `collapsed` (2 columns instead of 3), is what brings its card
 * closer to Metrics' own height instead of dwarfing it. Documents you might
 * need spans both columns in its own full-width row below them.
 *
 * Everything else — the region data, the currency notice, the FX
 * calculator, the share modal, the guide — is identical to /multi-currency
 * and reads off the same hooks, so the two pages can never disagree about
 * what a given account's details or figures are.
 */
function InternationalAccounts2Content() {
  const { accounts, isLoading } = useVirtualAccounts("general");

  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? "");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  const selectAccount = (account: VirtualAccount) => setSelectedAccountId(account.id);

  const { currencies: settledCurrencies, isLoading: isSettledLoading } = useSettledCurrencyTrend();
  const selectedCurrencyKey = REST_OF_WORLD_CURRENCIES.has(selectedAccount?.currency ?? "")
    ? "REST_OF_WORLD"
    : (selectedAccount?.currency ?? "");
  const selectedTrend = (settledCurrencies ?? []).find((c) => c.currency === selectedCurrencyKey);
  const settledAmount = selectedTrend?.totalInrAmount ?? 0;
  const settledTxnCount = selectedTrend?.totalCount ?? 0;
  const settledSeries = (selectedTrend?.points ?? []).map((p) => ({ x: p.month, y: p.inrAmount }));
  const settledGradientId = useId().replace(/:/g, "");

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [fxModalOpen, setFxModalOpen] = useState(false);

  useUrlAction("fx-calculator", () => setFxModalOpen(true));
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const { download: downloadProofOfOwnership, isDownloading: isDownloadingProof } =
    useAccountDocumentDownload();

  // Floors the account details card at the Metrics column's own height
  // (Settled amount + Documents pending, stacked), so their bottoms always
  // line up — one-directional (only the account card grows, per the
  // request), so unlike the Platforms page's mutual height match this only
  // ever measures the Metrics side, never the element min-height is applied
  // to, so there's no self-reinforcing risk of a stale floor sticking around.
  const metricsCardsRef = useRef<HTMLDivElement>(null);
  const [metricsHeight, setMetricsHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = metricsCardsRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      setMetricsHeight(el.offsetHeight);
    });
    observer.observe(el);

    return () => observer.disconnect();
  }, [selectedAccount]);

  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const handleCopyFullAccount = (account: VirtualAccount) =>
    copyToClipboard(formatFullAccount(account), `${account.accountName} details copied`);

  const share = async (title: string, text: string) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text });
        return;
      } catch {
        // User dismissed the sheet, or the browser refused — fall through to copy.
      }
    }
    await copyToClipboard(text, "Account details copied, ready to send to your client");
  };

  const handleShareFullAccount = (account: VirtualAccount) => {
    void share(`${account.countryName} Account`, formatFullAccount(account));
  };

  const handleDownloadProof = async () => {
    if (!selectedAccount) return;
    const accountId = await accountDocumentId(accountNumberOf(selectedAccount));
    if (!accountId) {
      toast.error("This account has no account number to generate a document for.");
      return;
    }
    downloadProofOfOwnership(accountId);
  };

  return (
    <InternationalAccountsAurora>
      <PageHeader
        title="International accounts"
        subtitle="Receive international payments using your virtual accounts."
        actions={
          <>
            {/* Was a link on the account card's own heading row; promoted to
                a header button, left of Forex calculator, so both of this
                page's modals are reachable from the one action row instead
                of one living beside the page title and the other beside a
                heading further down. Only renders once there's an account to
                explain — same account/currency the dialog itself needs. */}
            {selectedAccount && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="info" className="h-4 w-4" />}
                onClick={() => setHowItWorksOpen(true)}
              >
                How it works
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
          </>
        }
      />

      <FxCalculatorModal open={fxModalOpen} onOpenChange={setFxModalOpen} />

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

      {selectedAccount && (
        <HowItWorksDialog
          open={howItWorksOpen}
          onOpenChange={setHowItWorksOpen}
          currency={selectedAccount.currency}
        />
      )}

      {/* Select client region — horizontal cards, full page width, above
          everything else. `variant="cards"` is RegionSelector's tile
          layout, reused as-is rather than reimplemented: flag over name,
          horizontally scrolling if the row ever runs out of width (it
          won't in practice — 6-8 tiles fit a 1400px page before scrolling
          would ever kick in). No more `lg:hidden`/`hidden lg:flex` split
          between this and a vertical list: cards are now the only variant
          this page renders, at every width, so there's nothing to toggle. */}
      <div className="space-y-3">
        <h2 className={MODULE_TITLE}>Select client region</h2>

        {isLoading ? (
          <div className="flex gap-3 p-1" aria-busy>
            {Array.from({ length: 6 }).map((_, i) => (
              <Shimmer key={i} className="h-24 w-36 shrink-0 rounded-xl" />
            ))}
          </div>
        ) : (
          <div data-guide="mca-region-selector" className="-mx-1">
            <RegionSelector
              accounts={accounts}
              selectedAccountId={selectedAccount?.id ?? ""}
              onSelect={selectAccount}
              label="Select client region"
              variant="cards"
            />
          </div>
        )}
      </div>

      {/* Two columns now, not three — the region rail moved above (see the
          horizontal card row) so there's nothing to its left any more.
          minmax(0,3fr)/minmax(0,2fr) (60/40): the account details card was
          overpowering Metrics both in width and, since VirtualAccountDetails'
          field grid is now forced to `collapsed` two columns instead of
          three (see below), in height too, so the two columns' cards end
          much closer to the same bottom edge than an even split would. */}
      <div className="grid gap-x-5 gap-y-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        {/* Left column: account details. Documents you might need moved out
            to its own full-width row below both this column and Metrics
            (see after the grid's two columns). */}
        <div className="min-w-0">
          {/* mode="wait": switching regions used to swap the heading and
              the whole card instantly, with no acknowledgment that a
              different account's data just replaced the last one — jarring
              given how much detail (an entirely different bank name,
              account number, address…) changes at once. `wait` makes the
              outgoing account's card fade+lift out FIRST, and only once
              that finishes does the incoming one fade+rise in — that
              hand-off is the "delay" itself, not an artificial timer, and
              it reads as the page acknowledging a real switch happened
              rather than the DOM just overwriting text. Same
              easing/duration convention as the settlement detail page and
              the dashboard's Today/analytics tab switch (see
              SettlementDetailFeature.tsx / TodaysAnalyticsSection.tsx) so
              this doesn't introduce a fourth motion feel to the app. */}
          <AnimatePresence mode="wait">
            {selectedAccount && (
              <motion.div
                key={selectedAccount.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-3"
              >
                {/* A pre-payment briefing (e.g. "don't convert to GBP"), so
                    it's read before the account number a client is about to
                    send a payment to, not after. Renders nothing for a
                    currency that carries no caveat. */}
                <AccountCurrencyNotice currency={selectedAccount.currency} />

                <h2 className={MODULE_TITLE}>
                  Receive payments from {selectedAccount.countryName}
                </h2>

                {/* `--io-account-h`, published on this wrapper, is what
                    actually stretches the account details CARD's own
                    visible box down to Metrics' bottom edge — not just a
                    min-height on an invisible wrapper around a shorter
                    card. A custom property inherits through the DOM
                    (unlike a percentage height, which needs a *definite*,
                    not min-, height on every ancestor to resolve at all),
                    so `h-(--io-account-h)` on VirtualAccountDetails' Card
                    several levels down can read the exact pixel figure
                    this wrapper publishes. flux's Card is itself `flex
                    flex-col` (see VirtualAccountDetails' own doc comment),
                    so once it has a real height, the extra space becomes
                    blank room after its last child rather than stretching
                    any one field — which is the "increase the height of
                    the card" the request asked for, not a redistribution
                    of its content. Falls back to the card's own natural
                    content height (unset custom property → invalid
                    `height` value → ignored) before the ResizeObserver has
                    fired. */}
                <div
                  style={
                    {
                      "--io-account-h": metricsHeight ? `${metricsHeight}px` : undefined,
                    } as CSSProperties
                  }
                >
                  {/* actionsPlacement="top": Share/Copy sit directly under
                      the header, ahead of the field grid — the layout this
                      page exists to try, versus /multi-currency's actions-
                      after-fields order. collapsed: forces the field grid
                      to 2 columns instead of 3 — at this column's own 60%-
                      of-the-remaining-width share, 3 columns read cramped,
                      and the extra row it adds also helps close the gap to
                      Metrics' own height before the height match above
                      even applies. */}
                  <VirtualAccountDetails
                    account={selectedAccount}
                    onCopy={handleCopyFullAccount}
                    onShare={() => setShareModalOpen(true)}
                    headerPlacement="inside"
                    actionsPlacement="top"
                    collapsed
                    className="h-(--io-account-h) w-full max-w-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right column: Metrics, the remaining 30%. Its own heading is now
            this column's first child, same as "Select client region" and
            "Receive payments from X" are for theirs — see this grid's own
            comment above for why that's what keeps all three aligned. */}
        <div className="min-w-0 space-y-3">
          <h2 className={MODULE_TITLE}>Metrics</h2>

          {/* Stacked (flex-col), not the flex-wrap row /multi-currency uses
              — at 30% of the page this is too narrow for the settled-amount
              card's chart to sit beside its KPI as a wide row anyway, so
              one-above-the-other is both the requested layout and the one
              that actually fits.

              ref: measured by the account details column's own height
              match (see metricsCardsRef/metricsHeight above) — this exact
              element, not the column wrapper, so the measurement is
              Settled + gap + Documents pending only, not this column's own
              "Metrics" heading too (the two headings already align on
              their own via the 2-column grid, so including the heading
              here would double count that shared row).

              AnimatePresence/mode="wait", same as the account details
              column beside it: these figures are scoped to the selected
              account too, so they cross-fade on the same timing as that
              column rather than snapping to the new region's numbers
              while the card next to them is still mid-transition. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedAccount?.id ?? "none"}
              ref={metricsCardsRef}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-4"
            >
              <Card size="sm" className="gap-0">
                {/* min-h-56 (224px): the loaded branch's own natural height
                  (label + amount + caption + gap + h-32 chart), applied
                  around all three branches so loading/empty/loaded never
                  change this card's height — and, since this card's height
                  is what the account details column matches (see
                  metricsCardsRef above), that instability used to reach all
                  the way over there too: switching to a region with no
                  settlements, or refetching, could resize BOTH columns.
                  flex flex-col so the empty branch's own flex-1 centering
                  still has a flex parent to fill. */}
                <div className="flex min-h-56 flex-col">
                  {isSettledLoading ? (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm font-semibold text-foreground">Settled amount</p>
                      <Shimmer className="h-9 w-32" />
                      <Shimmer className="h-24 w-full" />
                    </div>
                  ) : settledTxnCount === 0 ? (
                    <div className="flex flex-1 items-center justify-center">
                      <PlaceholderState
                        variant="no-settlements"
                        size="xs"
                        title="No settlements yet"
                        description="Settlement reports will appear here once transactions are processed."
                        className="gap-2 py-2"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Settled amount</p>
                        <CompactAmount
                          amount={settledAmount}
                          currency="INR"
                          className="mt-2 block whitespace-nowrap text-2xl font-semibold tabular-nums tracking-tight text-foreground"
                        />
                        {/* text-xs (was text-sm): a caption qualifying the KPI
                        above it, not a peer figure, so it reads a size down
                        the way every other card's supporting line on this
                        page does. */}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {settledTxnCount.toLocaleString("en-IN")} settled transaction
                          {settledTxnCount === 1 ? "" : "s"} · Year to date
                        </p>
                      </div>

                      <div className="h-32 min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={settledSeries}
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
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                              tickFormatter={(v: number) =>
                                v === 0 ? "₹0" : formatCurrencyShort(v, "INR")
                              }
                              width={48}
                            />
                            <Tooltip
                              contentStyle={{
                                borderRadius: 10,
                                border: "1px solid var(--border)",
                                fontSize: 12,
                                background: "var(--popover)",
                                color: "var(--popover-foreground)",
                              }}
                              formatter={(v) => [
                                formatCurrency(Number(v), "INR", "en-IN"),
                                "Settled",
                              ]}
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
                    </div>
                  )}
                </div>
              </Card>

              {/* hideIcon + badgePlacement="below-amount" + tint: the
                lighter, chip-under-the-amount, no-icon, blue-tinted card
                this page asks for — every other placement of this shared
                component keeps its own defaults. min-h-40: the pending-count
                badge only renders when a region actually has pending
                documents, so without a floor a zero-pending region rendered
                this card visibly shorter than one with a badge — the same
                "empty state changes the card's size" problem the Settled
                amount card above just got fixed for. */}
              <OutstandingAmountCard
                className="min-h-40 w-full"
                hideIcon
                badgePlacement="below-amount"
                tint
                currency={
                  selectedAccount
                    ? selectedAccount.iso2 === "ROW"
                      ? "REST_OF_WORLD"
                      : selectedAccount.currency
                    : undefined
                }
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Documents you might need — its own full-width row, spanning both
            columns (this grid only has two now that the region rail moved
            above it, so a plain col-span-2 is enough — no explicit
            col-start needed the way the old 3-column version required). */}
        {selectedAccount && (
          <section className="lg:col-span-2">
            <h2 className={cn(MODULE_TITLE, "mb-3")}>Documents you might need</h2>

            <Card size="sm" className="flex-col items-start gap-4 py-6 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[14px] font-medium text-foreground">
                  Need proof of account ownership?
                </p>
                <p className={MODULE_SUBTITLE}>
                  An official document confirming this receiving account belongs to you, for clients
                  or banks that ask.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full shrink-0 sm:w-auto"
                disabled={isDownloadingProof}
                leftIcon={<Icon name="download" className="h-4 w-4" />}
                onClick={() => void handleDownloadProof()}
              >
                Download document
              </Button>
            </Card>
          </section>
        )}
      </div>

      <GuideLauncher
        steps={MCA_INTL_ACCOUNTS_GUIDE_STEPS}
        storageKey={MCA_INTL_ACCOUNTS_GUIDE_KEY}
      />
    </InternationalAccountsAurora>
  );
}
