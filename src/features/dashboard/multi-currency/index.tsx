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
import { currencySymbol, formatCurrency } from "@/lib/utils/format";
import { OutstandingAmountCard } from "@/features/dashboard/mca-transactions/components/OutstandingAmountCard";
import { RegionSelector } from "@/features/dashboard/multi-currency/components/RegionSelector";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { ShareAccountDetailsModal } from "@/features/dashboard/multi-currency/components/ShareAccountDetailsModal";
import { FxCalculatorModal } from "@/features/dashboard/multi-currency/components/FxCalculatorModal";
import { AccountCurrencyNotice } from "@/features/dashboard/multi-currency/components/AccountCurrencyNotice";
import { HowItWorksPanel } from "@/features/dashboard/multi-currency/components/HowItWorksPanel";
import {
  DEFAULT_SETTLED_CURRENCY,
  SETTLED_AMOUNT_BY_CURRENCY,
} from "@/features/dashboard/multi-currency/mock-data";
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

  // The settled-amount card follows the selected region: its title names that
  // region's currency and its figures are in that currency, so picking a region
  // is the only thing that changes this card.
  const settledCurrency = selectedAccount?.currency ?? DEFAULT_SETTLED_CURRENCY;
  // Falls back rather than rendering an empty card if an account ever carries a
  // currency the summary data has no entry for.
  const settled =
    SETTLED_AMOUNT_BY_CURRENCY[settledCurrency] ??
    SETTLED_AMOUNT_BY_CURRENCY[DEFAULT_SETTLED_CURRENCY];

  // Every region names its currency in the title except Rest of the World,
  // which keeps the bare label: its `currency` is "GLOBAL" (see
  // mapAccounts.ts), the accounts endpoint's SWIFT-catch-all bucket key
  // renamed for display, and "Settled amount in GLOBAL" doesn't read as a
  // sentence the way "Settled amount in USD" does. The symbol on the figure
  // below still says which unit the amount is in either way.
  const settledTitle =
    selectedAccount?.iso2 === "ROW" ? "Settled amount" : `Settled amount in ${settledCurrency}`;

  // Unique per mount so the settled-amount chart's fill gradient doesn't
  // collide with another <linearGradient> id elsewhere on the page.
  const settledGradientId = useId().replace(/:/g, "");

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [fxModalOpen, setFxModalOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const { download: downloadProofOfOwnership, isDownloading: isDownloadingProof } =
    useAccountDocumentDownload("proof-of-ownership");

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
          here, so it never resizes these two. */}
      <div className="grid gap-x-5 gap-y-3 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start">
        <div className="lg:col-start-1 lg:row-start-1">
          <h2 className={MODULE_TITLE}>Select Client Region</h2>
        </div>

        {isLoading ? (
          // The region list is this page's only navigation, so its loading
          // state has to hold the column's footprint — otherwise the right
          // column snaps sideways when the accounts land. Six rows is the
          // typical account count; the Card and its p-3 are the same ones the
          // loaded list sits in, so nothing moves but the row contents.
          <Card
            size="sm"
            aria-busy
            className="hidden gap-0 p-3 lg:col-start-1 lg:row-start-2 lg:flex"
          >
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
            <RegionSelector
              accounts={accounts}
              selectedAccountId={selectedAccount?.id ?? ""}
              onSelect={selectAccount}
              label="Select client region"
              variant="cards"
              className="-mx-1 lg:hidden"
            />

            {/* p-3 rather than Card's own 28px inset: the rows carry their own
                px-5, so the card's padding only has to keep them clear of its
                edge — anything more and the region names sit adrift of the
                title above the card. */}
            <Card size="sm" className="hidden gap-0 p-3 lg:col-start-1 lg:row-start-2 lg:flex">
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

        {/* Right column's row-1 title, mirroring the left's: same grid row,
            so the two headings share a top edge no matter how each one wraps.
            Guarded on selectedAccount since the heading names its region. */}
        {selectedAccount && (
          <div className="flex flex-wrap items-start justify-between gap-2 lg:col-start-2 lg:row-start-1">
            <h2 className={MODULE_TITLE}>Receive payments from {selectedAccount.countryName}</h2>
            {/* Tertiary action: the link variant carries no fill or border,
                so it reads as one step below the module title it sits
                beside. -mr-2 cancels the variant's own horizontal padding so
                the label's right edge lines up with the card edge below it,
                and -mt-1 pulls it back onto the title's own line after
                items-start has top-aligned the row. Opens the per-currency
                guide, which is why it sits with the selection rather than in
                the page header. */}
            <Button
              variant="link"
              className="-mr-2 -mt-1 text-[13px] underline"
              onClick={() => setHowItWorksOpen(true)}
            >
              How it works?
            </Button>
          </div>
        )}

        {/* space-y-8 is the 32px section → section step, the loosest on the
            page. mt-5 restores that separation below `lg`, where this column
            stacks under its own title above (row 1 has already dropped out) and
            would otherwise inherit the grid's own 12px title → container gap;
            on `lg` and up it must be zero, or this row-2 content would no
            longer start level with the region Card. */}
        <div className="mt-5 space-y-8 lg:col-start-2 lg:row-start-2 lg:mt-0">
          {selectedAccount && (
            // Account details come before the Metrics section below: a
            // merchant opens this page to find the numbers to hand a client,
            // and that has to be the first thing they see, not the
            // settled/outstanding figures. key remounts the section on every
            // region change so the fade replays on each switch, not just the
            // first render.
            //
            // flex-wrap, not a fixed third grid column: How it works is a
            // plain card, not a modal or drawer, so there is never an overlay
            // behind it — it either sits beside the account-details card (when
            // there's room) or wraps onto its own line below it (when there
            // isn't), the same way the Metrics row further down wraps its own
            // two cards. The account-details <section> below has no min-w-0,
            // so this never squeezes its 3-column field grid narrower than its
            // own content needs (which would clip it) — instead the wrap
            // happens at the flex level, before that grid is ever threatened.
            <div className="flex flex-wrap items-start gap-x-5 gap-y-8">
              <section key={selectedAccount.id} className="flex-1 page-enter">
                {/* Details and their currency's caveat as one stack: the notice is
                    about the account whose details sit beside it, so it travels
                    with them. Renders nothing for a currency that carries no
                    caveat. space-y-3 keeps it bound to the card rather than
                    reading as the section below it.

                    Rest of the World's FX notice goes *before* the account
                    details — a client reading it needs the "don't convert to
                    GBP" instruction before, not after, the account number they're
                    about to send a payment to. Every other notice (currently just
                    AUD's) keeps its original placement after the details, since
                    only Rest of the World's is a pre-payment instruction the
                    client-facing hierarchy calls out specifically.

                    `inside` moves the flag/name/subtitle into the card — there's
                    no carousel here naming the account any more — and the width
                    override drops the card's default shrink-wrapping so it fills
                    this column. */}
                <div className="space-y-3">
                  {selectedAccount.isGlobal && (
                    <AccountCurrencyNotice currency={selectedAccount.currency} />
                  )}
                  <VirtualAccountDetails
                    account={selectedAccount}
                    onCopy={handleCopyFullAccount}
                    onShare={() => setShareModalOpen(true)}
                    headerPlacement="inside"
                    // How it works sits beside this card on the same flex
                    // row, so its available width shrinks well before the
                    // viewport itself crosses `sm` — collapsing to two
                    // columns (and offering the `»` to undo it) responds to
                    // that shrink directly instead of waiting on a media
                    // query that can't see how much room is actually left.
                    collapsed={howItWorksOpen}
                    onExpand={() => setHowItWorksOpen(false)}
                    className="w-full max-w-none"
                  />
                  {!selectedAccount.isGlobal && (
                    <AccountCurrencyNotice currency={selectedAccount.currency} />
                  )}
                </div>
              </section>

              {howItWorksOpen && (
                <HowItWorksPanel
                  currency={selectedAccount.currency}
                  onClose={() => setHowItWorksOpen(false)}
                  className="w-full shrink-0 sm:w-[340px]"
                />
              )}
            </div>
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
              {/* Not MetricSparklineCard: that renders its sparkline as a tiny
                borderless corner overlay with no axes, which can't carry this
                card's monthly X axis and settled-amount Y axis. Built on the
                same flux-ui Card as OutstandingAmountCard beside it — same
                size="sm" inset, border, radius and elevation — with the
                recharts primitives and styling flux-ui itself uses in
                DashboardAreaChartTemplate, so the two read as a deliberate
                pair without introducing a chart abstraction of its own. Every
                figure is keyed off the selected region's currency rather than
                fixed to USD.

                min() rather than a bare min-w-[470px]: 470px is the floor
                wherever there is room for it, but a min-width that large would
                otherwise push the card past the viewport on a narrow screen,
                and min-width beats max-width in the cascade so `max-w-full`
                could not rein it back in. 100% is measured against the flex
                line, so the card fills the row instead of overflowing it.

                flex-[1.6] against Outstanding's flex-1: while both share a
                line, the extra width goes to the card that has a chart to put
                it in. Once they wrap, each is alone on its line and grows to
                the full width regardless. */}
              <Card size="sm" className="min-w-[min(470px,100%)] flex-[1.6] gap-0">
                {/* KPI stack left, chart right, so the card spends the width it
                  has rather than stacking into extra height. flex-1 makes this
                  row fill the Card, which the grid above has already stretched
                  to the taller of the pair; items-stretch then hands that full
                  height down to the chart. Below `sm` the two stack, which is
                  the only width where there isn't room for both. */}
                <div className="flex flex-1 flex-col gap-6 sm:flex-row sm:items-stretch">
                  {/* No min-w-0 here, unlike the chart beside it: the default
                    `min-width: auto` floors this column at its own min-content
                    width, which the nowrap amount below now sets. That is what
                    makes the guarantee hold under pressure — when the card is
                    squeezed, the chart gives up width and the figure keeps
                    every pixel it needs. */}
                  <div className="flex-1 sm:basis-2/5">
                    {/* Names the region's currency everywhere but Rest of the
                      World — see settledTitle for why that one stays bare. */}
                    <p className="text-sm font-semibold text-foreground">{settledTitle}</p>

                    {/* Same size and weight as OutstandingAmountCard's own
                      figure — the two headline numbers have to carry equal
                      visual weight for the cards to read as a pair.
                      whitespace-nowrap keeps a grouped figure from ever
                      breaking mid-number. */}
                    <p className="mt-4 whitespace-nowrap text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                      {`${currencySymbol(settledCurrency)}${settled.amount.toLocaleString("en-US")}`}
                    </p>

                    {/* Secondary to the figure above it: smaller size, muted
                      colour, same left edge — supporting context, not a second
                      headline. mt-1 (tight) because it restates that same
                      figure, so it belongs to the amount rather than reading
                      as the next item down. nowrap costs nothing here: at
                      text-sm this line is narrower than the text-3xl amount,
                      so the amount still sets the column's floor. */}
                    <p className="mt-1 whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(settled.amountInr, "INR", "en-IN")}
                    </p>

                    {/* Supporting metric, the lowest step in this stack. Left
                      aligned with everything above it. */}
                    <p className="mt-4 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Icon name="trending-up" className="h-3.5 w-3.5 shrink-0" />
                      <span>{settled.trendLabel}</span>
                    </p>
                  </div>

                  {/* No fixed height: items-stretch on the row above sizes this
                    to the Card's full content height, so the chart runs from
                    the top of the title beside it to the bottom of the trend
                    line. min-h-36 is only a floor for the stacked layout below
                    `sm`, where there is no row height to stretch to and
                    ResponsiveContainer would otherwise collapse to nothing.
                    Because the height is inherited rather than set here, the
                    chart can never be what makes this card taller than
                    OutstandingAmountCard beside it.

                    3/5 against the KPI stack's 2/5, rather than the even split
                    the two flex-1s alone would give: the plot area loses a
                    fixed 64px to the Y axis, so the widest track is worth more
                    to the chart than to a stack of left-aligned text. */}
                  <div className="min-h-36 min-w-0 flex-1 sm:basis-3/5">
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
                        {/* Axis and tooltip both read in the selected currency,
                          so the chart never contradicts the headline figure
                          above it. width=64 leaves room for the widest label
                          this can produce: every region's symbol is a glyph or
                          two ("$140K", "A$140K"), but the width is sized past
                          that so a currency whose symbol falls back to its own
                          code still can't clip. */}
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                          tickFormatter={(v: number) =>
                            v >= 1000
                              ? `${currencySymbol(settledCurrency)}${(v / 1000).toFixed(0)}K`
                              : `${currencySymbol(settledCurrency)}${v}`
                          }
                          width={64}
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
                            formatCurrency(Number(v), settledCurrency, "en-US"),
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

          {selectedAccount && (
            <section>
              <h2 className={cn(MODULE_TITLE, "mb-3")}>Documents you might need</h2>

              {/* Secondary module: same surface and padding as the account card
                  above it, but its copy sits at supporting weight rather than
                  the section-title weight, so it reads as the lesser of the
                  two. */}
              <Card
                size="sm"
                className="flex-row flex-wrap items-center justify-between gap-4 py-6"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-[13px] font-medium text-foreground">
                    Need proof of account ownership?
                  </p>
                  <p className={MODULE_SUBTITLE}>
                    Download an official document confirming ownership of this receiving account.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="shrink-0"
                  disabled={isDownloadingProof}
                  rightIcon={<Icon name="download" className="h-4 w-4" />}
                  onClick={() => void handleDownloadProof()}
                >
                  Download proof of account ownership
                </Button>
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
