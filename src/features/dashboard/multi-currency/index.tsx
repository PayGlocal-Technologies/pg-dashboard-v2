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
import { Button, Card, PageHeader, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { OutstandingAmountCard } from "@/features/dashboard/mca-transactions/components/OutstandingAmountCard";
import { useSettlementOverview } from "@/features/dashboard/settlement-reports/hooks";
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
// Side-panel variant, kept for reference — superseded below by the modal.
// import { HowItWorksPanel } from "@/features/dashboard/multi-currency/components/HowItWorksPanel";
import { HowItWorksDialog } from "@/features/dashboard/multi-currency/components/HowItWorksDialog";
import {
  useAccountDocumentDownload,
  useMcaMerchantId,
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

/** The last `count` months (including the current one) as month-key + short
 *  label — the fixed axis the settled chart plots against, so it always shows a
 *  run of months even when the API only returns the ones that had settlements.
 *  Computed once on mount (no `new Date()` in render — React Compiler rule). */
function buildRecentMonths(count: number): { key: string; label: string }[] {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: d.toLocaleString("en-US", { month: "short" }) });
  }
  return months;
}

export function MultiCurrencyFeature() {
  // A multi-MID merchant has to say which account they mean before anything is
  // fetched: these endpoints put one MID in the path, so guessing shows the
  // wrong merchant's accounts. Mirrors pg-dashboard, which gates the whole page
  // the same way.
  const needsMidSelection = useNeedsMidSelection();

  if (needsMidSelection) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
        <PageHeader title="International accounts" />
        <SelectMidView midType="PACB" />
      </div>
    );
  }

  return <MultiCurrencyContent />;
}

/**
 * Virtual Accounts — receiving account details, one client region at a time.
 *
 * Where this page used to fan every account out as a scrollable carousel above
 * the details, it now narrows to a single question: which region is your client
 * paying from? The region list on the left is the only navigation on the page,
 * and everything on the right (the settled-amount figures, the account card,
 * its currency caveat, the share/copy targets) is derived from the one selected
 * account — no route change, no reload.
 *
 * Nothing here is a new component. The region rows, the account details card,
 * the share modal, the FX calculator, the currency notice and the outstanding
 * card are all the ones the product already renders; this file is only the
 * two-column arrangement of them.
 */
function MultiCurrencyContent() {
  // The merchant's own receiving accounts. The response also carries an
  // `amazon` bucket, which this page deliberately ignores — those are Amazon
  // payout accounts and belong to the Platforms page, which reads the same
  // query with bucket "amazon".
  //
  // These drive the region list directly, in the order the API returns them:
  // the list is "the accounts you hold", not a fixed roster, so a merchant
  // never sees a region they can't actually receive into.
  const { accounts, isLoading } = useVirtualAccounts("general");

  // Exactly one account is selected at all times — defaults to the first so
  // the right column is populated on load, not only after an explicit click.
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id ?? "");
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  const selectAccount = (account: VirtualAccount) => setSelectedAccountId(account.id);

  // Settled amount + its monthly trend, from the settlement-overview endpoint
  // (the same one the Settlement Reports page's Total settled card charts). Year
  // to date, so the series is a month-by-month breakdown. This is the merchant's
  // overall settled figure, spanning every account rather than the selected
  // region — matching OutstandingAmountCard beside it, which is aggregate too;
  // there's no per-currency monthly series to plot, so both metrics read across
  // all accounts.
  // Same endpoint, and now the same scope, as the settlement report page.
  const settlementMid = useMcaMerchantId();
  const { overview: settlementOverview, isLoading: isSettledLoading } = useSettlementOverview(
    settlementMid,
    "ytd"
  );
  const settledAmount = settlementOverview?.totalSettled ?? 0;
  const settledTxnCount = settlementOverview?.transactionCount ?? 0;
  // A fixed six-month axis (five prior + current), computed once on mount. The
  // API only returns months that had settlements, so its points are bucketed by
  // month onto this axis and every other month renders as zero — the chart then
  // always shows a run of months rather than collapsing to the single one with
  // data.
  const [recentMonths] = useState(() => buildRecentMonths(6));
  const settledByMonth = new Map<string, number>();
  for (const point of settlementOverview?.series ?? []) {
    const monthKey = (point.periodStart ?? "").slice(0, 7);
    if (monthKey) settledByMonth.set(monthKey, (settledByMonth.get(monthKey) ?? 0) + point.value);
  }
  const settledSeries = recentMonths.map((month) => ({
    x: month.label,
    y: settledByMonth.get(month.key) ?? 0,
  }));
  // Unique per mount so the chart's fill gradient id can't collide with another
  // <linearGradient> elsewhere on the page.
  const settledGradientId = useId().replace(/:/g, "");

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [fxModalOpen, setFxModalOpen] = useState(false);

  // "Forex calculator" picked from the header search lands here as
  // ?action=fx-calculator. Set inside MultiCurrencyContent rather than the
  // exported feature above, so it only fires once the page has cleared its own
  // MID guard and is actually showing the accounts view.
  useUrlAction("fx-calculator", () => setFxModalOpen(true));
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const { download: downloadProofOfOwnership, isDownloading: isDownloadingProof } =
    useAccountDocumentDownload();

  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  // The details section shows every field, not just the compact two the region
  // rows carry — its copy/share actions need the fuller text block to match.
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

  const handleShareFullAccount = (account: VirtualAccount) => {
    void share(`${account.countryName} Account`, formatFullAccount(account));
  };

  /**
   * Proof of account ownership for the selected region — the official document
   * confirming the merchant holds this receiving account.
   *
   * The endpoint keys the account by the SHA-256 of its number, never the
   * number itself. Neither value is logged. Same two-leg download the Platforms
   * page runs for its bank settlement statement.
   */
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
    <div className="mx-auto max-w-[1400px] page-enter">
      {/* The page's spacing scale, tightest to loosest — no two of these steps
          are the same size, so proximity alone says what belongs to what:
            4px   title → its own supporting description
            12px  section title → the container it introduces
            24px  page header → the first content container
            32px  one section → the next
          PageHeader's own mb-6 is already that 24px step, so it needs no
          override; its internal title → subtitle gap is the 4px one.

          The FX calculator goes through PageHeader's own actions slot: it
          answers what a foreign-currency invoice becomes in INR, which is about
          the page's subject as a whole rather than any one region, so it stays
          with the title rather than moving into the region-scoped column below.
          "How it works?" used to sit beside it and now sits on the account
          card's own heading row instead — that dialog is per-currency, so it
          belongs to the selection, not to the page. */}
      <PageHeader
        title="International accounts"
        subtitle="Receive international payments using your virtual accounts."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Icon name="calculator" className="h-4 w-4" />}
            onClick={() => setFxModalOpen(true)}
          >
            Forex calculator
          </Button>
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

      {/* Both columns are titled modules of the same shape: a title block, then
          the content it introduces — and both put their title in row 1 and
          their content in row 2, so the two titles share one grid row (and
          therefore one top edge) and the two content boxes (the region Card,
          the account-details card) share the next one, regardless of how each
          title's own text happens to wrap.

          Explicit col-start/row-start rather than one wrapper div per column —
          the same placement technique the Platforms page's own two-column grid
          uses — is what lets row 1 and row 2 each size to the taller of their
          two occupants without hard-coding either height.

          DOM order stays left title → left content → right title → right
          content, so the stacked single-column layout below `lg` (where
          every explicit placement drops out) still reads in that order.
          gap-x-5 is the shared gutter, gap-y-3 the 12px title → container
          step. Region and Account Details keep this same 288px/flexible-1fr
          shape whether or not How it works is open — that panel is a flex
          child *inside* the Account Details column below, not a third track
          here, so it never resizes these two things. */}
      <div className="grid gap-x-5 gap-y-6 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start">
        {/* Title and region list are one sticky unit, not two independently
            placed grid items: the heading names the control directly below it,
            so pinning the list while the heading scrolls away would leave an
            unlabelled column of flags. Spanning both rows with `self-start`
            keeps the wrapper content-height (so it has room to travel inside
            its two-row area) and keeps its top edge on row 1 — level with the
            right column's own title, the alignment this grid exists for.
            space-y-3 reproduces the grid's own 12px title → container step
            now that the two are no longer separated by gap-y-3. */}
        {/* min-w-0 is load-bearing below `lg`, where this stack holds the
            horizontally scrolling region tiles (RegionSelector's `cards`
            variant). A grid item's default `min-width: auto` floors the track at
            the item's min-content width, and a nowrap flex row of tiles would
            otherwise grow the implicit column past the viewport, scrolling the
            whole page sideways instead of the tile row inside its own box. */}
        <div className="min-w-0 space-y-6">
          <div className="space-y-3">
            <h2 className={MODULE_TITLE}>Select client region</h2>

            {isLoading ? (
            // The region list is this page's only navigation, so its loading
            // state has to hold the column's footprint — otherwise the right
            // column snaps sideways when the accounts land. Six rows is the
            // typical account count; the Card and its p-3 are the same ones the
            // loaded list sits in, so nothing moves but the row contents.
            <Card size="sm" aria-busy className="hidden gap-0 p-3 lg:flex">
              <div className="space-y-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-2.5">
                    <Shimmer className="h-6 w-6 shrink-0 rounded-full" />
                    <Shimmer className="h-3.5 w-28" />
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <>
              {/* Below `lg` the two columns collapse into one stack, where a full
                  vertical list of regions would push the account details most of
                  a screen down. The tiles scroll horizontally instead, so the
                  details stay near the fold. Each tile is its own surface, so
                  this variant needs no Card around it — unlike the list below.

                  Two renderings toggled by `hidden`, not one set of rows bent
                  into both shapes with responsive classes: the layouts differ in
                  direction, in what the selected state looks like, and in whether
                  there's a chevron at all. `display: none` also keeps whichever
                  one is inactive out of the tab order and the accessibility tree,
                  so there is never a second, invisible copy of these controls to
                  land on. */}
              <div data-guide="mca-region-selector" className="-mx-1 lg:hidden">
                <RegionSelector
                  accounts={accounts}
                  selectedAccountId={selectedAccount?.id ?? ""}
                  onSelect={selectAccount}
                  label="Select client region"
                  variant="cards"
                />
              </div>

              {/* p-3 rather than Card's own 28px inset: the rows carry their own
                  px-5, so the card's padding only has to keep them clear of its
                  edge — anything more and the region names sit adrift of the
                  title above the card. */}
              <Card size="sm" className="hidden gap-0 p-3 lg:flex" data-guide="mca-region-selector">
                <RegionSelector
                  accounts={accounts}
                  selectedAccountId={selectedAccount?.id ?? ""}
                  onSelect={selectAccount}
                  label="Select client region"
                  size="md"
                />
              </Card>
            </>
          )}
          </div>

          {/* Currency caveat for the selected region — a pre-payment briefing
              (e.g. "don't convert to GBP"), so it sits directly under the
              region choice it belongs to rather than beside the account card.
              Renders nothing for a currency that carries no caveat. */}
          {selectedAccount && <AccountCurrencyNotice currency={selectedAccount.currency} />}

          {/* Documents for the selected region, under the region + warning. */}
          {selectedAccount && (
            <section>
              <h2 className={cn(MODULE_TITLE, "mb-3")}>Documents you might need</h2>

              {/* Stacked (flex-col) rather than the wide row it used to be — this
                  now lives in the narrow 288px left column, so the label and its
                  download action sit one above the other. */}
              <Card size="sm" className="flex-col items-start gap-4 py-6">
                <div className="min-w-0 space-y-1">
                  <p className="text-[14px] font-medium text-foreground">
                    Need proof of account ownership?
                  </p>
                  <p className={MODULE_SUBTITLE}>
                    An official document confirming this receiving account belongs to you — for
                    clients or banks that ask.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full shrink-0"
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

        {/* Right column: heading, then account details + metrics — one grid
            item so `items-start` aligns its top edge with the left column's,
            rather than relying on explicit row placement. space-y-3 is the 12px
            title → content step; the content block below keeps its own 32px
            section spacing. min-w-0 lets the account-details/metrics content
            shrink instead of forcing the column past the viewport. */}
        <div className="min-w-0 space-y-3">
          {selectedAccount && (
            // h2 as a plain block (not a flex item), so its top edge renders
            // identically to the left column's plain-block heading and the two
            // line up. "How it works?" is positioned absolutely to the top-right
            // rather than sharing a flex line, which was nudging the heading
            // down; pr-28 keeps a long region name clear of it.
            <div className="relative pr-28">
              <h2 className={MODULE_TITLE}>Receive payments from {selectedAccount.countryName}</h2>
              <Button
                variant="link"
                className="absolute right-0 top-0 -mr-2 text-[13px] underline"
                onClick={() => setHowItWorksOpen(true)}
              >
                How it works?
              </Button>
            </div>
          )}

          {/* space-y-8 is the 32px section → section step, the loosest on the
              page. */}
          <div className="space-y-8">
          {selectedAccount && (
            // Account details come before the Metrics section below: a
            // merchant opens this page to find the numbers to hand a client,
            // and that has to be the first thing they see, not the
            // settled/outstanding figures. key remounts the section on every
            // region change so the fade replays on each switch, not just the
            // first render.
            //
            <div className="flex flex-wrap items-start gap-x-5 gap-y-8">
              <section key={selectedAccount.id} className="flex-1 page-enter">
                {/* Details and their currency's caveat as one stack: the notice is
                    about the account whose details sit beside it, so it travels
                    with them. Renders nothing for a currency that carries no
                    caveat. space-y-3 keeps it bound to the card rather than
                    reading as the section below it.

                    The notice goes *before* the account details — every one of
                    them is a pre-payment briefing (don't convert to GBP, expect
                    your bank's verification prompt), so the client has to read it
                    before, not after, the account number they're about to send a
                    payment to.

                    `inside` moves the flag/name/subtitle into the card — there's
                    no carousel here naming the account any more — and the width
                    override drops the card's default shrink-wrapping so it fills
                    this column. */}
                <VirtualAccountDetails
                  account={selectedAccount}
                  onCopy={handleCopyFullAccount}
                  onShare={() => setShareModalOpen(true)}
                  headerPlacement="inside"
                  className="w-full max-w-none"
                />
              </section>

              {/* Side-panel variant, kept for reference — superseded below
                  by the modal.
              {howItWorksOpen && (
                <HowItWorksPanel
                  currency={selectedAccount.currency}
                  onClose={() => setHowItWorksOpen(false)}
                  className="w-full shrink-0 sm:w-[340px]"
                />
              )}
              */}
            </div>
          )}

          {selectedAccount && (
            <HowItWorksDialog
              open={howItWorksOpen}
              onOpenChange={setHowItWorksOpen}
              currency={selectedAccount.currency}
            />
          )}

          <section>
            {/* "Metrics", not "Analytics" — settled/outstanding figures, sitting
                after account details for the reason noted above. Same heading
                treatment (MODULE_TITLE, mb-3) as Documents below it, so all
                three modules in this column read as peers. */}
            <h2 className={cn(MODULE_TITLE, "mb-3")}>Metrics</h2>

            {/* flex-wrap rather than a grid, because grid tracks cannot wrap.
                Flexbox decides line breaks from each item's hypothetical main
                size, which for `flex-1`-style items is their min-width — so the
                row holds both cards while 470 + 300 + the gap fits, and drops
                Outstanding onto its own full-width line the moment the settled
                card would be squeezed below its 470px floor. Neither card ever
                shrinks past the width its content needs.

                No items-* override, so the default stretch gives both cards the
                same height on a shared line, and therefore a shared top and
                bottom edge. */}
            <div className="flex flex-wrap gap-4">
              {/* Settled amount: the KPI on the left, a month-by-month area
                  chart on the right — the same shape and recharts styling as the
                  Settlement Reports "Total settled" card and the dashboard's
                  revenue chart, so the graphs across the product read as a set.
                  Figure + series both come from the settlement-overview endpoint
                  (year to date). flex-[1.6] gives the card with the chart the
                  extra width; Outstanding beside it stays flex-1. */}
              <Card size="sm" className="min-w-[min(470px,100%)] flex-[1.6] gap-0">
                <div className="flex flex-1 flex-col gap-6 sm:flex-row sm:items-stretch">
                  <div className="flex-1 sm:basis-2/5">
                    <p className="text-sm font-semibold text-foreground">Settled amount</p>

                    {isSettledLoading ? (
                      <Shimmer className="mt-4 h-9 w-40" />
                    ) : (
                      <>
                        {/* Same size/weight as OutstandingAmountCard's figure so
                            the pair carries equal visual weight. */}
                        <p className="mt-4 whitespace-nowrap text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                          {formatCurrency(settledAmount, "INR", "en-IN")}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {settledTxnCount.toLocaleString("en-IN")} settled transaction
                          {settledTxnCount === 1 ? "" : "s"} · Year to date
                        </p>
                      </>
                    )}
                  </div>

                  <div className="min-h-36 min-w-0 flex-1 sm:basis-3/5">
                    {isSettledLoading ? (
                      <Shimmer className="h-full min-h-36 w-full" />
                    ) : settledSeries.every((point) => point.y === 0) ? (
                      <div className="flex h-full min-h-36 items-center justify-center text-sm text-muted-foreground">
                        No settlements yet
                      </div>
                    ) : (
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
                              v >= 100_000
                                ? `₹${(v / 100_000).toFixed(0)}L`
                                : v >= 1_000
                                  ? `₹${(v / 1_000).toFixed(0)}K`
                                  : `₹${v}`
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
                            formatter={(v) => [formatCurrency(Number(v), "INR", "en-IN"), "Settled"]}
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
                    )}
                  </div>
                </div>
              </Card>

              {/* The same Outstanding card the MCA Transactions page renders, not
                a second take on it: title, amount, pending-count badge, INR
                conversion, one-line explanation, all off the real MCA overview
                endpoint. It takes no props — the figure spans every account
                rather than the selected region, so it doesn't change as regions
                are picked.

                Its own min-width is the other half of the wrap rule: it's what
                the flex line adds to the settled card's 470px to decide whether
                both still fit. 300px is roughly what this card's content — the
                amount beside its pending-count chip — needs before it starts
                looking cramped, so the row breaks rather than letting it get
                there. */}
              <OutstandingAmountCard className="min-w-[min(300px,100%)] flex-1" />
            </div>
          </section>
          </div>
        </div>
      </div>

      {/* Guide launcher for International Accounts. */}
      <GuideLauncher
        steps={MCA_INTL_ACCOUNTS_GUIDE_STEPS}
        storageKey={MCA_INTL_ACCOUNTS_GUIDE_KEY}
      />
    </div>
  );
}
