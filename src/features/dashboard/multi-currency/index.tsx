"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Button, Card, PageHeader, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CompactAmount } from "@/components/common/CompactAmount";
import { OutstandingAmountCard } from "@/features/dashboard/mca-transactions/components/OutstandingAmountCard";
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
// Side-panel variant, kept for reference — superseded below by the modal.
// import { HowItWorksPanel } from "@/features/dashboard/multi-currency/components/HowItWorksPanel";
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

export function MultiCurrencyFeature() {
  // A multi-MID merchant has to say which account they mean before anything is
  // fetched: these endpoints put one MID in the path, so guessing shows the
  // wrong merchant's accounts. Mirrors pg-dashboard, which gates the whole page
  // the same way.
  const needsMidSelection = useNeedsMidSelection();

  if (needsMidSelection) {
    return (
      <InternationalAccountsAurora contentClassName="space-y-4">
        <PageHeader title="International accounts" />
        <SelectMidView midType="PACB" />
      </InternationalAccountsAurora>
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

  // Settled amount for the selected region only, for the small "Settled
  // amount" card below the account details — the settled-currency-trend
  // endpoint returns one entry per account (currency), each with an INR
  // total; picking the row for the selected account's currency scopes the
  // figure to that region. AED/SGD and the dollar/global rest-of-world
  // buckets all resolve to the REST_OF_WORLD row the endpoint groups them
  // under.
  const { currencies: settledCurrencies, isLoading: isSettledLoading } = useSettledCurrencyTrend();
  const selectedCurrencyKey = REST_OF_WORLD_CURRENCIES.has(selectedAccount?.currency ?? "")
    ? "REST_OF_WORLD"
    : (selectedAccount?.currency ?? "");
  const selectedTrend = (settledCurrencies ?? []).find((c) => c.currency === selectedCurrencyKey);
  const settledAmount = selectedTrend?.totalInrAmount ?? 0;
  const settledTxnCount = selectedTrend?.totalCount ?? 0;

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
    await copyToClipboard(text, "Account details copied, ready to send to your client");
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
    <InternationalAccountsAurora>
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
          with the title. "How it works?" sits beside it now too (left of Forex
          calculator, same order/style as International Accounts 2), rather
          than on the account card's own heading row — still gated on
          selectedAccount since the dialog is per-currency. */}
      <PageHeader
        title="International accounts"
        subtitle="Receive international payments using your virtual accounts."
        actions={
          <>
            {selectedAccount && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="info" className="h-4 w-4" />}
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

      {/* Both columns are titled modules of the same shape: a title block, then
          the content it introduces. Four separately-placed grid items (both
          titles, both content blocks), not two wrapper divs each holding its
          own heading — that's what actually pins both titles to row 1 and
          both content blocks to row 2, so they share a top edge regardless of
          how either title's text happens to wrap. No `grid-template-rows` is
          declared: the grid still creates exactly two implicit rows, each
          sized to its own tallest occupant, so this needs no hard-coded
          height anywhere.

          `items-stretch` then makes row 2's shorter content block grow to
          match the taller one — "Select client region" opts back out via
          `lg:self-start` since its own height is what should set the row's
          height, not something to stretch further, leaving the account-
          details column (default stretch) to grow down and match it.

          DOM order stays left title → right title → left content → right
          content, so the stacked single-column layout below `lg` (where
          every explicit placement drops out) still reads in that order.
          gap-x-5 is the shared gutter, gap-y-3 the 12px title → container
          step; the left content block's own 32px section-to-section spacing
          lives directly on it (space-y-6), separate from this row gap. */}
      <div className="grid gap-x-5 gap-y-3 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-stretch">
        <h2 className={cn(MODULE_TITLE, "lg:col-start-1 lg:row-start-1")}>
          Select client region
        </h2>

        {selectedAccount && (
          <h2 className={cn(MODULE_TITLE, "lg:col-start-2 lg:row-start-1")}>
            Receive payments from {selectedAccount.countryName}
          </h2>
        )}

        {/* min-w-0 is load-bearing below `lg`, where this stack holds the
            horizontally scrolling region tiles (RegionSelector's `cards`
            variant). A grid item's default `min-width: auto` floors the track at
            the item's min-content width, and a nowrap flex row of tiles would
            otherwise grow the implicit column past the viewport, scrolling the
            whole page sideways instead of the tile row inside its own box. */}
        <div className="min-w-0 space-y-6 lg:col-start-1 lg:row-start-2 lg:self-start">
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
              <Card
                size="sm"
                className="hidden gap-0 p-3 lg:flex"
                data-guide="mca-region-selector"
              >
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
                    An official document confirming this receiving account belongs to you, for
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

        {/* Right column content: just the account-details card now (its own
            heading moved up to row 1, see above). min-w-0 lets it shrink
            instead of forcing the column past the viewport; lg:flex
            lg:flex-col carries the row's stretched height down to the card
            itself. */}
        <div className="min-w-0 lg:col-start-2 lg:row-start-2 lg:flex lg:flex-col">
          {/* AnimatePresence/mode="wait": switching regions used to swap the
              whole card instantly — jarring given how much detail changes at
              once (bank name, account number, address…). `wait` makes the
              outgoing account's content fade+lift out FIRST, and only once
              that finishes does the incoming one fade+rise in — that hand-off
              is the "delay" itself, not an artificial timer, and it reads as
              the page acknowledging a real switch happened. Same easing/
              duration convention as the settlement detail page and the
              dashboard's analytics tab switch (see SettlementDetailFeature.tsx
              / TodaysAnalyticsSection.tsx). flex-1/flex-col is what carries
              the column's stretched height down to the card itself. */}
          <AnimatePresence mode="wait">
            {selectedAccount && (
              <motion.div
                key={selectedAccount.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-1 flex-col"
              >
                {/* Details and their currency's caveat as one stack: the notice is
                    about the account whose details sit beside it, so it travels
                    with them. Renders nothing for a currency that carries no
                    caveat.

                    The notice goes *before* the account details — every one of
                    them is a pre-payment briefing (don't convert to GBP, expect
                    your bank's verification prompt), so the client has to read it
                    before, not after, the account number they're about to send a
                    payment to.

                    `inside` moves the flag/name/subtitle into the card — there's
                    no carousel here naming the account any more, and the width
                    override drops the card's default shrink-wrapping so it fills
                    this column. Kept at its own natural height now (no more
                    `h-full`) — the two small metric cards below absorb the
                    leftover height instead, see their own doc comment. */}
                <VirtualAccountDetails
                  account={selectedAccount}
                  onCopy={handleCopyFullAccount}
                  onShare={() => setShareModalOpen(true)}
                  headerPlacement="inside"
                  className="w-full max-w-none border-blue-100 bg-linear-to-br from-white via-white to-blue-100/70 dark:border-blue-900/40 dark:from-card dark:via-card dark:to-blue-950/40"
                />

                {/* Settled amount + Documents pending, side by side — the
                    Metrics cards from before, now small and placed in the
                    space this column has left over once account details
                    settles at its own natural height. `mt-auto` pushes this
                    row down to the column's own bottom edge (which the grid
                    above already stretches to match "Documents you might
                    need" on the left) rather than leaving it stranded right
                    under the account card with a gap below it — same
                    mt-auto-over-fixed-margin technique OutstandingAmountCard
                    itself already uses to ground its own optional content. */}
                <div className="mt-auto grid grid-cols-2 gap-4 pt-4">
                  {/* Slightly smaller than before (p-3 vs p-4, text-xl vs
                      text-2xl) — this and Documents pending beside it were
                      each a touch taller than "Documents you might need" in
                      the column opposite, which items-stretch on the outer
                      grid was matching by growing THIS row rather than
                      shrinking that one. Same diagonal wash treatment as the
                      reference: a white-to-tint gradient corner rather than a
                      flat tinted fill. */}
                  <Card
                    size="sm"
                    className="gap-0 border-emerald-100 bg-linear-to-br from-white via-white to-emerald-100/70 p-3 dark:border-emerald-900/40 dark:from-card dark:via-card dark:to-emerald-950/40"
                  >
                    <p className="text-sm font-normal text-muted-foreground">Settled amount</p>
                    {isSettledLoading ? (
                      <Shimmer className="mt-1 h-7 w-24" />
                    ) : (
                      <CompactAmount
                        amount={settledAmount}
                        currency="INR"
                        className="mt-1 block whitespace-nowrap text-xl font-semibold tabular-nums tracking-tight text-foreground"
                      />
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {settledTxnCount.toLocaleString("en-IN")} settled transaction
                      {settledTxnCount === 1 ? "" : "s"} · Year to date
                    </p>
                  </Card>

                  <OutstandingAmountCard
                    className="w-full p-3"
                    hideIcon
                    badgePlacement="below-amount"
                    dangerTint
                    currency={
                      selectedAccount.iso2 === "ROW" ? "REST_OF_WORLD" : selectedAccount.currency
                    }
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedAccount && (
            <HowItWorksDialog
              open={howItWorksOpen}
              onOpenChange={setHowItWorksOpen}
              currency={selectedAccount.currency}
            />
          )}
        </div>
      </div>

      {/* Guide launcher for International Accounts. */}
      <GuideLauncher
        steps={MCA_INTL_ACCOUNTS_GUIDE_STEPS}
        storageKey={MCA_INTL_ACCOUNTS_GUIDE_KEY}
      />
    </InternationalAccountsAurora>
  );
}
