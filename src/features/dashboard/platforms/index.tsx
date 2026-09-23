"use client";

import { useEffect, useRef, useState } from "react";
import { AppImage as Image } from "@/components/common/AppImage";
import {
  Button,
  Card,
  IconButton,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CopyableText } from "@/components/common/CopyableText";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  buildFullAccountDetails,
  canadianRoutingParts,
} from "@/features/dashboard/multi-currency/utils";
import {
  useNeedsMidSelection,
  useProvisionAmazonAccount,
  useVirtualAccounts,
} from "@/features/dashboard/multi-currency/hooks";
import { SelectMidView } from "@/components/common/SelectMidView";
import { SettlementStatementDrawer } from "@/features/dashboard/platforms/components/SettlementStatementDrawer";
import { TransactionReportDrawer } from "@/features/dashboard/platforms/components/TransactionReportDrawer";
import { RequestPlatformDialog } from "@/features/dashboard/platforms/components/RequestPlatformDialog";
import { AmazonProvisionCard } from "@/features/dashboard/platforms/components/AmazonProvisionCard";
import { ConnectStepsPage } from "@/features/dashboard/platforms/components/ConnectStepsPage";
import type { PlatformDocument } from "@/features/dashboard/platforms/types";
import { SUPPORTED_PLATFORMS, accountsForPlatform } from "@/features/dashboard/platforms/constants";
import { GuideLauncher } from "@/components/common/guide/GuideLauncher";
import {
  MCA_PLATFORMS_GUIDE_KEY,
  MCA_PLATFORMS_GUIDE_STEPS,
} from "@/features/dashboard/platforms/guide";

/** Module title — the step below the page's own h1, shared by every module
 *  here. Same tokens the Virtual Accounts page uses, so the two read as one
 *  product. */
const MODULE_TITLE = "text-base font-semibold text-foreground";

/** Supporting copy under a module title, and secondary text inside a module. */
const MODULE_SUBTITLE = "text-[13px] text-muted-foreground";

/**
 * Account field label and value inside the collapsed details panel. Carried as
 * classes rather than components because these belong in a `dl` as `dt`/`dd`,
 * and they are the same tokens the Virtual Accounts details card uses so the
 * two modules can't drift apart.
 */
const FIELD_LABEL = "text-[12px] text-muted-foreground";
const FIELD_VALUE = "break-words text-[13px] font-medium text-foreground";

export function PlatformsFeature() {
  // Same gate as Virtual Accounts: this page reads the very same
  // virtual-accounts endpoint, which is scoped to a single MID in its path, so
  // a multi-MID merchant has to choose one before it can show the right
  // accounts.
  const needsMidSelection = useNeedsMidSelection();

  if (needsMidSelection) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
        <PageHeader title="Platforms" />
        <SelectMidView midType="PACB" />
      </div>
    );
  }

  return <PlatformsContent />;
}

/**
 * Platforms — how to point a PayGlocal receiving account at the marketplace or
 * freelancing platform that pays you.
 *
 * Two columns: the platform navigation on the left, and that platform's whole
 * connection workflow on the right. Where the platforms used to fan out as a
 * row of cards above the workflow, they are now a vertical tab list in a fixed
 * column, so the workflow starts at the top of the page rather than below a
 * band of logos. The workflow itself reads top-down as one funnel — name the
 * platform and the currency you're paid in, check the account those resolve to,
 * gather the documents the platform may ask you for, then work down the
 * numbered steps — each a stop on the same funnel, in the workflow column.
 *
 * Nothing here is a new component. The platform rows are flux-ui Buttons in the
 * same ghost/secondary selected treatment RegionSelector uses, the mobile
 * platform control and the currency control are its Select, the account panel
 * its Card, the document and screenshot surfaces its Card, and the
 * settlement form is the Drawer this page already opens. Content lives in
 * `constants.ts`, so adding a platform, a step or a screenshot is a data change
 * that never touches this file.
 */
function PlatformsContent() {
  // Which bucket a platform pays into depends on the platform, exactly as in
  // pg-dashboard (`resolvedSelectedPlatform === "amazon" ? amazonCurrencyList :
  // generalCurrencyList`, Platforms.tsx): Amazon pays into the accounts issued
  // for Amazon payouts, every other platform into the merchant's own receiving
  // accounts. Wiring them all to the Amazon bucket showed no accounts at all
  // for the other four whenever a merchant had no Amazon accounts.
  //
  // Both calls share one query key, so this is a single request read twice, not
  // two fetches.
  const {
    accounts: amazonAccounts,
    isFetched: isAmazonFetched,
    refetch: refetchAccounts,
  } = useVirtualAccounts("amazon");
  const { accounts: generalAccounts } = useVirtualAccounts("general");

  // Every platform is always listed, Amazon included. Production used to drop
  // the Amazon row for a merchant with no Amazon payout accounts, which is
  // exactly the merchant most likely to be looking for it; pg-dashboard's
  // Amazon-provisioning change removed that filter and answers the state with a
  // card instead (see isAmazonProvisionable below).
  const platforms = SUPPORTED_PLATFORMS;

  // Exactly one platform is selected at all times — defaults to Amazon (the
  // first entry) so the steps and documents are populated on load, not only
  // after a click.
  const [selectedPlatformId, setSelectedPlatformId] = useState(platforms[0]?.id ?? "");
  const selectedPlatform =
    platforms.find((p) => p.id === selectedPlatformId) ?? platforms[0] ?? null;

  const { provisionAmazonAccount, isProvisioning } = useProvisionAmazonAccount();

  // Amazon, selected, and the response carried no `amazon` bucket: the merchant
  // has never been issued Amazon payout accounts, so the whole workflow is
  // replaced by the offer to issue them. Gated on isFetched, so an in-flight
  // request doesn't flash the provisioning card at a merchant who does hold
  // accounts — and so a guest, whose query never runs at all, never sees it.
  const isAmazonProvisionable =
    selectedPlatform?.id === "amazon" && amazonAccounts.length === 0 && isAmazonFetched;

  // Which of the platform's receiving accounts the walkthrough is scoped to.
  //
  // Stored as an account id and *resolved* against whichever platform is
  // selected, rather than being reset by an effect when the platform changes
  // (see CLAUDE.md's no-setState-in-effect rule). On a platform that offers
  // the choice, a currency it also supports survives the switch and one it
  // can't pay out in falls back to its first account. On a platform that
  // offers no choice the first account simply wins outright.
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const platformAccounts = selectedPlatform?.id === "amazon" ? amazonAccounts : generalAccounts;
  const accounts = selectedPlatform ? accountsForPlatform(selectedPlatform, platformAccounts) : [];
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  // Amazon is the only platform with documents (see the Platform type), so on
  // every other one this section doesn't render at all.
  const documents = selectedPlatform?.documents ?? [];

  // Amazon's CAD payout form asks for the institution and transit numbers
  // separately, so those rows are appended for that combination only — see
  // canadianRoutingParts.
  const accountFields = selectedAccount
    ? [
        ...buildFullAccountDetails(selectedAccount),
        ...canadianRoutingParts(selectedAccount, selectedPlatform?.id === "amazon"),
      ]
    : [];

  const [settlementDrawerOpen, setSettlementDrawerOpen] = useState(false);
  const [transactionReportOpen, setTransactionReportOpen] = useState(false);
  const [requestPlatformOpen, setRequestPlatformOpen] = useState(false);
  const [connectStepsOpen, setConnectStepsOpen] = useState(false);

  // Keeps the platform-selector card and the Account details card the same
  // height, whichever one actually has more content. A fixed min-height
  // (what this used to be) only ever floors the account card at the
  // platform card's own ~240px — it does nothing once a country/platform's
  // field list (e.g. UK/Europe's SEPA fields plus a 3-line address) genuinely
  // needs more than that, so the account card kept ending up taller than the
  // platform card, and everything below it (the divider, "Connect your
  // account") drifted out of line with the platform column's own divider.
  // Measuring both and applying the larger as min-height on both fixes it in
  // either direction, not just the one case a hardcoded number happened to
  // cover.
  //
  // ResizeObserver, not a one-time measurement: field counts (and therefore
  // height) change with the platform/country selection, and the account
  // column remounts on every platform switch (see its `key` below).
  const platformGroupRef = useRef<HTMLDivElement>(null);
  const accountGroupRef = useRef<HTMLDListElement>(null);
  const [matchedGroupHeight, setMatchedGroupHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const platformEl = platformGroupRef.current;
    const accountEl = accountGroupRef.current;
    if (!platformEl && !accountEl) return;

    // The callback, not the effect body, is what calls setState — this is
    // the same "async callback" shape CLAUDE.md's purity rules carve out for
    // setInterval, just driven by layout instead of a timer.
    const observer = new ResizeObserver(() => {
      const heights = [platformEl?.offsetHeight, accountEl?.offsetHeight].filter(
        (h): h is number => typeof h === "number" && h > 0
      );
      if (heights.length === 0) return;
      setMatchedGroupHeight(Math.max(...heights));
    });

    if (platformEl) observer.observe(platformEl);
    if (accountEl) observer.observe(accountEl);

    return () => observer.disconnect();
  }, [selectedPlatform?.id, selectedAccount]);

  /**
   * What a document card does when it's activated — from the card, from its
   * icon button, or from the keyboard. Which drawer it opens is data
   * (`opens`), not a title match.
   *
   * Neither document downloads straight from the card any more: both are
   * generated from details the merchant has to confirm first, which is the
   * flow pg-dashboard's two PwDrawers implement.
   */
  const handleDocumentAction = (doc: PlatformDocument) => {
    if (doc.opens === "transaction-report") {
      setTransactionReportOpen(true);
      return;
    }
    setSettlementDrawerOpen(true);
  };

  if (!selectedPlatform) return null;

  /**
   * The walkthrough takes over the whole screen rather than opening beside the
   * page, the same handoff the Transactions table makes to its own details
   * page. Rendered here instead of behind a route of its own so the selected
   * platform AND the header's chosen currency survive the transition — the
   * Quick Access panel inside quotes that currency's identifiers, so a
   * separate route would have to thread both through the URL and re-resolve
   * the account just to show what was already on screen.
   */
  if (connectStepsOpen) {
    return (
      <div className="mx-auto max-w-[1400px] page-enter">
        <ConnectStepsPage
          platform={selectedPlatform}
          account={selectedAccount}
          onBack={() => setConnectStepsOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] page-enter">
      {/* PageHeader's own default mb-6 (24px) between the page header and the
          two columns below — no override needed, tightened from the
          wider 32px this page used to add on top of it.

          The action goes through PageHeader's own actions slot rather than a
          wrapper row, so the alignment and the header's spacing stay the
          component's business. It answers "mine isn't here", which a merchant
          asks while scanning the platform column below — not after working
          through a walkthrough for a platform they don't use. */}
      <PageHeader
        title="Platforms"
        subtitle="Connect your PayGlocal receiving account to the platforms that pay you."
        actions={
          <>
            {/* Which of the platform's receiving accounts the workflow below
                is about. The page header is what's on screen whatever step of
                the workflow you've scrolled to, so the control that scopes
                everything below it belongs up here, not buried mid-page.
                "Request a platform" used to sit beside this too, now reachable
                inline at the bottom of the platform list itself instead (see
                that list's own "+ Request a platform" row) — no need for it
                to live in both places. */}
            {accounts.length > 0 && selectedAccount && (
              <Select value={selectedAccount.id} onValueChange={setSelectedAccountId}>
                {/* h-9/text-xs match Request a platform's own Button
                    size="sm" exactly (flux's default SelectTrigger is
                    h-11/text-[15px], visibly larger than the button beside
                    it). truncate on the value span is what stops a long
                    option ("United Kingdom", "Rest of the World") from
                    wrapping the trigger onto a second line — the trigger's
                    own height stays fixed at h-9 either way. */}
                <SelectTrigger
                  className="h-9 min-h-9 w-47.5 shrink-0 px-3.5 text-xs"
                  aria-label="Receiving currency"
                >
                  <SelectValue className="min-w-0 truncate" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {/* min-w-0 lets this flex row shrink below its content
                          width — without it a flex item's default min-width
                          (auto) floors it at the label's full text width, so
                          nothing downstream could ever truncate it. */}
                      <span className="flex min-w-0 items-center gap-2">
                        {/* A SWIFT-rail catch-all account has no single
                            country behind it, so it shows a globe instead of
                            a flag — same fallback the MCA link builder's
                            currency select uses. */}
                        {account.iso2 === "ROW" ? (
                          <Icon name="globe" className="h-3.5 w-5 shrink-0 text-muted-foreground" />
                        ) : (
                          <CountryFlag iso2={account.iso2} />
                        )}
                        {/* The currency, named the way pg-dashboard names it
                            (CURRENCY_COUNTRY_MAP — "United States" for USD,
                            "Rest of the World" for the SWIFT account), which
                            is already this account's countryName.
                            Deliberately not the platform's marketplace domain:
                            production shows the currency alone, on Amazon as
                            much as anywhere. truncate (+ the min-w-0 above)
                            is what keeps a long name ("United Kingdom",
                            "Rest of the World") on one line inside the
                            narrow trigger instead of wrapping it to two. */}
                        <span className="truncate">{account.countryName || account.currency}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* The walkthrough is one click away rather than laid out down the
                page: it's followed once per platform, while the account
                details beside it are read every time. Sits right of the
                currency select because the steps quote that currency's own
                identifiers in their Quick Access panel. */}
            {!isAmazonProvisionable && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                leftIcon={<Icon name="list-checks" className="h-3.5 w-3.5" />}
                onClick={() => setConnectStepsOpen(true)}
              >
                Steps to connect
              </Button>
            )}
          </>
        }
      />

      <RequestPlatformDialog open={requestPlatformOpen} onOpenChange={setRequestPlatformOpen} />

      {/* Opened by the two document cards. The key remounts each whenever the
          platform or the currency changes, so a form always opens on the
          account the page is showing rather than on whatever it was last left
          holding. Closing one leaves the page exactly as it was — nothing out
          here reads back out of a drawer. */}
      {selectedAccount && (
        <>
          <SettlementStatementDrawer
            key={`settlement-${selectedPlatform.id}-${selectedAccount.id}`}
            platformName={selectedPlatform.name}
            accounts={accounts}
            defaultAccountId={selectedAccount.id}
            open={settlementDrawerOpen}
            onOpenChange={setSettlementDrawerOpen}
          />
          <TransactionReportDrawer
            key={`transaction-report-${selectedPlatform.id}-${selectedAccount.id}`}
            accounts={accounts}
            defaultAccountId={selectedAccount.id}
            open={transactionReportOpen}
            onOpenChange={setTransactionReportOpen}
          />
        </>
      )}

      {/* Fixed 288px navigation column, matching Virtual Accounts', with the
          workflow taking whatever width is left. minmax(0,1fr) rather than 1fr
          so a long instruction or a wide screenshot can't push the column past
          the viewport — which is what keeps the page free of horizontal scroll
          at every width. gap-x-8 at `lg`, where the two columns first appear and
          the width is tightest, widening to gap-x-10 above it. Below `lg` the
          template drops out entirely and the two stack in DOM order: platform
          control first, then the workflow. */}
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start xl:gap-x-10">
        {/* ─── Platform navigation ─────────────────────────────────────── */}
        {/* lg:sticky, so the platform list stays on screen while the workflow
            beside it scrolls: it is this page's only navigation, and the
            connect steps, account fields and screenshots run well past one
            screen. Sticks inside <main> (the dashboard's scroll container), and
            top-6 matches that container's own md:p-6 inset so the column pins
            level with where it started rather than flush against the header.
            Works only because the grid sets lg:items-start — a stretched grid
            item is as tall as its row and has nothing to slide within. */}
        <div className="lg:sticky lg:top-6 lg:col-start-1">
          {/* The selector itself — caption plus whichever of the two
              controls the width calls for — as one element, so the guide
              spotlights the platform choice rather than the workflow column
              beside it. */}
          <div data-guide="mca-platform-selector">
            {/* The smallest, muted, uppercase step: the navigation is how you
                reach the content rather than content itself, so its caption stays
                lighter than any title in the workflow beside it. The list's own
                aria-label is what a screen reader announces here. */}
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Select platform
            </div>

            {/* Below `lg` the same choice is a dropdown: a five-row vertical list
                above the workflow would push the content it selects off the first
                screen, where a collapsed trigger costs one row. Both controls are
                driven by the same state, so which one is on screen is purely a
                matter of width. */}
            <div className="mt-2 lg:hidden">
              <Select value={selectedPlatform.id} onValueChange={setSelectedPlatformId}>
                <SelectTrigger className="w-full" aria-label="Select platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id}>
                      <span className="flex items-center gap-2.5">
                        <Image
                          src={platform.logoSrc}
                          alt=""
                          width={90}
                          height={60}
                          className="h-5 w-8 shrink-0 object-contain"
                        />
                        {platform.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* At `lg` and up, the vertical tab list. Wrapped rather than hiding
                the Card itself, so the Card keeps its own flex-column layout
                instead of having it overridden by a display utility.

                p-3 rather than Card's own 28px inset: the rows carry their own
                horizontal padding, so the card only has to keep them clear of its
                edge. Same treatment as the Virtual Accounts region card. */}
            <div className="hidden lg:block">
              {/* Plain light-grey surface (was the .platform-select-aurora
                  blue wash) — the selected row's own solid white/bg-card
                  chip is still the thing carrying the emphasis here, so it
                  doesn't need a tinted backdrop to stand apart from the
                  rest of the list. */}
              {/* style + the ref that measures for it live on different
                    elements: `style` is here, directly on the Card, since
                    that's the box whose own visible border actually has to
                    grow for the two columns to align — a min-height on some
                    ancestor wrapping the Card only ever pads blank space
                    below the Card, never touching its border, which was the
                    original bug this replaced. `ref` sits one level down,
                    on the rows themselves (not this Card) so the
                    measurement stays immune to whatever height this Card's
                    OWN min-height currently holds it open to — a taller Card
                    doesn't change its child rows' natural rendered height,
                    so switching to a shorter platform/account pair can still
                    shrink the match back down instead of only ever growing. */}
              <Card
                size="sm"
                className="mt-2 gap-0 overflow-hidden bg-muted/40 p-3"
                style={{ minHeight: matchedGroupHeight }}
              >
                <div
                  ref={platformGroupRef}
                  className="space-y-1"
                  role="list"
                  aria-label="Select a platform"
                >
                  {platforms.map((platform) => {
                    const isSelected = platform.id === selectedPlatform.id;
                    return (
                      <Button
                        key={platform.id}
                        type="button"
                        role="listitem"
                        aria-current={isSelected}
                        // "outline" (flux's solid bg-card fill), not
                        // "secondary" (bg-muted): against this card's own
                        // aurora tint, a muted-gray selected state blended
                        // right into the wash instead of standing apart from
                        // it. A solid white/card chip pops the same way the
                        // Virtual Accounts region list's selected row does.
                        variant={isSelected ? "outline" : "ghost"}
                        size="md"
                        // flux-ui's Button lays leftIcon / label / rightIcon out
                        // as three direct flex children, so the chevron would
                        // otherwise sit immediately after the platform name.
                        // Letting the label span take the free space pushes it to
                        // the far right of the row instead.
                        className={cn(
                          "w-full justify-start gap-2.5 [&>span]:flex-1 [&>span]:text-left",
                          // The selected row is the only one at full emphasis:
                          // the primary-tinted text on top of its solid white
                          // fill is its accent. Unselected rows drop to the
                          // muted token, which is what keeps the whole column
                          // from out-weighing the workflow beside it.
                          //
                          // Explicit bg-white rather than relying on
                          // "outline"'s own bg-card: a flat, unambiguous white
                          // chip regardless of anything else in the cascade.
                          // dark:bg-card keeps dark mode on its own real
                          // surface token instead of forcing literal white
                          // into a dark UI.
                          isSelected
                            ? "bg-white font-semibold text-primary dark:bg-card"
                            : "text-muted-foreground"
                        )}
                        // The platform's own brand mark, sized by the box rather
                        // than by the file so all five sit on the same optical
                        // line whatever padding each PNG carries. object-contain
                        // keeps every mark inside its footprint uncropped.
                        leftIcon={
                          <Image
                            src={platform.logoSrc}
                            alt=""
                            width={90}
                            height={60}
                            className="h-6 w-9 shrink-0 object-contain"
                          />
                        }
                        // Only on the selected row: it points at the workflow
                        // that row is currently driving, so showing it on every
                        // row would read as five affordances instead of one
                        // pointer.
                        rightIcon={
                          isSelected ? (
                            <Icon name="chevron-right" className="h-3.5 w-3.5" />
                          ) : undefined
                        }
                        onClick={() => setSelectedPlatformId(platform.id)}
                      >
                        <span className="truncate">{platform.name}</span>
                      </Button>
                    );
                  })}

                  {/* Same row shape as a platform (leftIcon/label), but a
                        "+" glyph instead of a brand mark and no selected
                        state of its own — clicking it opens the exact same
                        dialog as the header's own "Request a platform"
                        button (setRequestPlatformOpen is already in scope
                        here), just reachable without scrolling back up. */}
                  <Button
                    type="button"
                    role="listitem"
                    variant="ghost"
                    size="md"
                    className="w-full justify-start gap-2.5 text-muted-foreground  [&>span]:text-left"
                    leftIcon={
                      // Same h-6 w-9 footprint as the platform rows' logo
                      // box, so this row's label starts in the same column
                      // as "Freelancer"/"Upwork"/etc. above it — sizing this
                      // to the glyph itself (narrower than that box) left the
                      // label starting further left than every row above it.
                      <span className="flex flex-0 h-6 w-9 shrink-0 items-center justify-center">
                        <Icon name="plus" className="h-4 w-4" />
                      </span>
                    }
                    onClick={() => setRequestPlatformOpen(true)}
                  >
                    <span className="truncate">Request a platform</span>
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
        {/* ─── Workflow ────────────────────────────────────────────────── */}
        {/* key remounts the column on every platform change so the fade
            replays on each switch, not just the first render. Every heading,
            the currency control, the account fields and the steps below all
            read off the selected platform, so switching tabs reprints the whole
            column in place.

            max-w-4xl caps the measure: past about 900px an instruction line
            runs longer than is comfortable to read and a screenshot frame grows
            taller than the step it belongs to, so the column stops there rather
            than taking every pixel a wide viewport offers.

            Not a plain space-y utility — the gaps between Account details,
            Documents you might need, and Connect your account are each a
            Separator (own margin, tightened from mt-8 to mt-6 to mt-4 for
            the one before Documents) rather than a bare margin, so none of
            them reads as out of place when the account details card above
            grows taller for a given country/platform. Only the gap before
            Steps keeps a wider mt-8 step. */}
        <div key={selectedPlatform.id} className="page-enter max-w-4xl lg:col-start-2">
          {isAmazonProvisionable ? (
            <AmazonProvisionCard
              onProvision={() => provisionAmazonAccount(refetchAccounts)}
              isProvisioning={isProvisioning}
            />
          ) : (
            <>
              {/* ─── 1. Account details ─────────────────────────────────────── */}
              {/* Always open, not a disclosure — this used to be a collapsed
              Accordion (see git history for the reasoning that no longer
              applies), but a merchant lands on this page specifically to
              read these fields, so hiding them behind a click just cost an
              extra step every time. Sits first now too: it's the thing the
              page exists to show, ahead of the walkthrough that explains
              where to paste it.

              Read-only by design: no Share or Copy actions, so it stays
              subordinate to the walkthrough beneath it rather than becoming a
              second thing to act on. The values are `buildFullAccountDetails`
              — the same builder the Virtual Accounts card and the share modal
              render, so these fields can't drift from the ones the rest of
              the product shows, and they follow the platform and currency
              selections in the page header above. */}
              {selectedAccount && (
                <div>
                  {/* Same caption treatment as the platform column's own "Select
                  platform" label (size, weight, uppercase, tracking, muted
                  colour) — not just for consistency, but because the two
                  columns are `lg:items-start` siblings in one grid row: without
                  a caption of its own here, this card started flush with the
                  grid's top edge while the platform card sat lower, under its
                  caption, so the two never lined up. Matching the caption
                  (and the same mt-2 gap before the card, plus the ResizeObserver
                  min-height set on this Card and the platform Card above —
                  see where platformGroupRef/accountGroupRef are declared) is
                  what keeps their cards starting AND ending at the same
                  height, not just aligned at the top. */}
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Account details
                  </div>
                  {/* min-h-60 floors this card at the platform card's own height
                  (5 rows × h-10 + space-y-1 gaps + p-3 padding = 240px, see
                  the platform list's own markup) so a country/platform with
                  fewer fields (e.g. SEPA's 8 short fields vs. ACH's 7 plus a
                  3-line address) never ends shorter than it before the
                  ResizeObserver's own min-height (below) has measured
                  anything yet — its `style` always wins once it has, min-h-60
                  is only the pre-JS/SSR fallback.

                  style + the ref that measures for it live on different
                  elements, same reasoning as the platform Card: `style` goes
                  directly on THIS Card, since that's the box whose own
                  border has to grow for the two columns to align (an
                  ancestor's min-height only pads blank space below the Card,
                  never touches its border). `ref` sits on the field grid
                  inside it instead, so measuring stays immune to whatever
                  height this Card's own min-height currently holds it open
                  to — a taller Card doesn't change its field grid's natural
                  rendered height, so a shorter field set can still shrink
                  the match back down. */}
                  <Card
                    size="sm"
                    className="mt-2 min-h-60 border-blue-100 bg-linear-to-br from-white via-white to-blue-100/70 dark:border-blue-900/40 dark:from-card dark:via-card dark:to-blue-950/40"
                    style={{ minHeight: matchedGroupHeight }}
                    data-guide="mca-account-details"
                  >
                    {/* Proximity does the grouping, not rules: 4px holds a label
                    to its own value, the grid's own gaps separate one field
                    from the next, and no field carries padding of its own.
                    Three columns where the old 320px sidebar could only have
                    carried one — this column is wide enough to lay the fields
                    out the way the account card itself does, so the two read
                    as the same module. */}
                    <dl
                      ref={accountGroupRef}
                      className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {accountFields.map((field) => (
                        <div key={field.label} className="min-w-0 space-y-1">
                          <dt className={FIELD_LABEL}>{field.label}</dt>
                          <dd className={FIELD_VALUE}>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </Card>
                </div>
              )}

              {/* ─── 2. Documents you might need ────────────────────────────── */}
              {/* Moved here from the platform column (where it used to sit under
              the platform card) — the walkthrough right below is exactly
              where these get used, so gathering them belongs immediately
              before it rather than off in the sidebar. Only Amazon carries
              documents, so on every other platform this section doesn't
              render at all. */}
              {documents.length > 0 && (
                <>
                  <Separator className="mt-4" />
                  <section className="mt-4">
                    <h2 className={MODULE_TITLE}>Documents you might need</h2>
                    <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                      Statements {selectedPlatform.name} may ask you for.
                    </p>

                    {/* Side by side now that this sits in the wide workflow
                    column rather than the narrow 288px sidebar — two short
                    cards in a row reads better here than the sidebar's own
                    stacked treatment did. sm:grid-cols-2 rather than a fixed
                    two, in case a platform ever carries a third document:
                    it wraps to a new row instead of forcing a third narrow
                    column. */}
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {documents.map((doc) => (
                        // The whole card is the target, not just the icon: the card
                        // carries one action, so anywhere on it should trigger it
                        // rather than asking for a hit on a 32px button.
                        // role/tabIndex and the Enter/Space handler are what make that
                        // reachable by keyboard too; the accessible name comes from
                        // the card's own caption and title text.
                        //
                        // No preventDefault on mousedown: the card should keep browser
                        // focus after a click, so that closing the drawer returns
                        // focus to the card that opened it.
                        <Card
                          key={doc.title}
                          size="sm"
                          role="button"
                          tabIndex={0}
                          onClick={() => handleDocumentAction(doc)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleDocumentAction(doc);
                            }
                          }}
                          className="min-w-0 cursor-pointer flex-row items-center justify-between gap-3 p-4 transition-[box-shadow,border-color] duration-150 hover:shadow-md"
                        >
                          <div className="min-w-0">
                            {/* Metadata above, title below — the caption qualifies the
                          title, so it sits muted and a size smaller. */}
                            <p className="truncate text-[12px] text-muted-foreground">
                              {doc.caption}
                            </p>
                            <p className="truncate text-[13px] font-medium text-foreground">
                              {doc.title}
                            </p>
                          </div>
                          {/* Kept as an affordance — it says the card does something —
                        but it runs the same handler the card does.
                        stopPropagation so a click on the icon fires that handler
                        once, not twice. */}
                          <IconButton
                            aria-label={doc.actionLabel}
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDocumentAction(doc);
                            }}
                          >
                            <Icon name={doc.actionIcon} className="h-4 w-4" />
                          </IconButton>
                        </Card>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {/* The connect walkthrough used to run inline from here down: a
              "Connect your account" heading followed by every numbered step
              and its full-width screenshot. It now lives behind the header's
              "Steps to connect" button (see ConnectStepsPage), because it is
              read once per platform while the account details above are read
              every time — leaving the page's own subject as the shortest thing
              on it and pushing everything else past the fold. */}
            </>
          )}
        </div>
      </div>

      {/* Guide launcher for Connect Platforms. */}
      <GuideLauncher steps={MCA_PLATFORMS_GUIDE_STEPS} storageKey={MCA_PLATFORMS_GUIDE_KEY} />
    </div>
  );
}
