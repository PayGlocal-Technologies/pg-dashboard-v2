"use client";

import { useMemo, useState } from "react";
import { AppImage as Image } from "@/components/common/AppImage";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  IconButton,
  PageHeader,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CopyableText } from "@/components/common/CopyableText";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  accountDocumentId,
  accountNumberOf,
  buildFullAccountDetails,
  canadianRoutingParts,
} from "@/features/dashboard/multi-currency/utils";
import {
  useAccountDocumentDownload,
  useNeedsMidSelection,
  useVirtualAccounts,
} from "@/features/dashboard/multi-currency/hooks";
import { SelectMidView } from "@/components/common/SelectMidView";
import { SettlementStatementDrawer } from "@/features/dashboard/platforms/components/SettlementStatementDrawer";
import { RequestPlatformDialog } from "@/features/dashboard/platforms/components/RequestPlatformDialog";
import type { PlatformDocument } from "@/features/dashboard/platforms/types";
import {
  SUPPORTED_PLATFORMS,
  accountsForPlatform,
  groupMarketplaces,
  marketplaceForAccount,
  marketplacesForPlatform,
} from "@/features/dashboard/platforms/constants";

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
 * collect the documents you'll be asked for, then work down the numbered steps.
 *
 * Nothing here is a new component. The platform rows are flux-ui Buttons in the
 * same ghost/secondary selected treatment RegionSelector uses, the mobile
 * platform control and the currency control are its Select, the account panel
 * its Accordion, the document and screenshot surfaces its Card, and the
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
  const { accounts: amazonAccounts, isLoading: isLoadingAmazon } = useVirtualAccounts("amazon");
  const { accounts: generalAccounts } = useVirtualAccounts("general");

  // Amazon is offered only to merchants who actually hold Amazon payout
  // accounts — the same `isAmazonAccountsPresent` gate pg-dashboard applies to
  // its own platform list. Held back until the query resolves, so the row
  // doesn't appear and then vanish while loading.
  const platforms = useMemo(
    () =>
      isLoadingAmazon || amazonAccounts.length > 0
        ? SUPPORTED_PLATFORMS
        : SUPPORTED_PLATFORMS.filter((platform) => platform.id !== "amazon"),
    [isLoadingAmazon, amazonAccounts.length]
  );

  // Exactly one platform is selected at all times — defaults to Amazon (the
  // first entry) so the steps and documents are populated on load, not only
  // after a click.
  const [selectedPlatformId, setSelectedPlatformId] = useState(platforms[0]?.id ?? "");
  const selectedPlatform =
    platforms.find((p) => p.id === selectedPlatformId) ?? platforms[0] ?? null;

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
  const accountById = accounts.find((a) => a.id === selectedAccountId) ?? null;

  // Which Amazon storefront the walkthrough is scoped to.
  //
  // Payout setup differs per marketplace, not per country in the abstract, so
  // on a platform that declares storefronts the merchant picks one of those and
  // the receiving account is *derived* from it — five euro storefronts resolve
  // to the one euro account. Platforms without storefronts keep the plain
  // currency control, and `accountById` above is what drives them.
  //
  // Resolved rather than reset by an effect (see CLAUDE.md's
  // no-setState-in-effect rule): a domain the selected platform doesn't run
  // falls out of the lookup, and marketplaceForAccount is the fallback for a
  // currency chosen on another platform before switching here — the same
  // mapping a saved legacy country value would land on.
  const [selectedDomain, setSelectedDomain] = useState("");
  const marketplaces = selectedPlatform
    ? marketplacesForPlatform(selectedPlatform, accounts)
    : [];
  const selectedMarketplace =
    marketplaces.find((m) => m.domain === selectedDomain) ??
    marketplaceForAccount(marketplaces, accountById) ??
    marketplaces[0] ??
    null;

  // One account feeds everything below — Account Details, Quick Access and the
  // settlement drawer all read it — so pointing the storefront at it here is
  // the only wiring the change needs; nothing downstream knows or cares which
  // control chose it.
  const selectedAccount =
    (selectedMarketplace
      ? accounts.find((a) => a.currency === selectedMarketplace.currency)
      : accountById) ??
    accounts[0] ??
    null;

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
  const [requestPlatformOpen, setRequestPlatformOpen] = useState(false);

  const { download: downloadBankStatement, isDownloading: isDownloadingStatement } =
    useAccountDocumentDownload("bank-statement");

  /**
   * What a document card does when it's activated — from the card, from its icon
   * button, or from the keyboard. Which cards open the settlement form is data
   * (`opensSettlementForm`), not a title match; every other card is the bank
   * settlement statement download.
   *
   * The endpoint keys the account by the SHA-256 of its number, never the
   * number itself. Neither value is logged.
   */
  const handleDocumentAction = async (doc: PlatformDocument) => {
    if (doc.opensSettlementForm) {
      setSettlementDrawerOpen(true);
      return;
    }

    if (!selectedAccount) return;
    const accountId = await accountDocumentId(accountNumberOf(selectedAccount));
    if (!accountId) {
      toast.error("This account has no account number to generate a statement for.");
      return;
    }
    await downloadBankStatement(accountId);
  };

  if (!selectedPlatform) return null;

  /**
   * The last row of the platform list: same height, padding and hover as a
   * platform row, but deliberately not one of them.
   *
   * It is never `secondary`, never `aria-current`, and never passed to
   * setSelectedPlatformId — it opens the request dialog instead — so no state
   * on this page can come to hold it as the selected platform. It also sits
   * outside the `role="list"` above rather than inside it as a sixth
   * `listitem`, which is what stops a screen reader announcing it as another
   * platform to choose. A "+" in place of a brand mark, in the same 36x24 box
   * every logo occupies, is what carries that difference visually.
   *
   * Rendered at both widths — inside the Card on desktop, under the Select
   * below `lg` — because a Select option would be exactly the selectable value
   * this must not become.
   */
  const requestPlatformRow = (
    <Button
      type="button"
      variant="ghost"
      size="md"
      // The dashed outline is what marks it as the odd row out: every platform
      // above sits on a solid surface or none at all, so a border that is
      // visibly neither says "this adds a platform" rather than "this is a
      // platform".
      //
      // Three deliberate departures from the platform rows, measured off the
      // design: border-2 for the chunkier dash pattern a hairline can't produce
      // (a browser scales dash length off border width, so `border` gives a
      // dotted hairline, not this); h-12 against their h-10, the ~1.2x that
      // gives the row its drop-zone weight; and rounded-xl for the softer
      // corner that reads on a dashed edge where rounded-lg looks clipped.
      // ghost already carries `border border-transparent`, so only the width,
      // style and colour change here — the outline costs no extra height.
      //
      // Everything that governs alignment is untouched: same w-full, same
      // gap-2.5, same px-5 from size="md", so the label still starts on exactly
      // the platform names' line.
      className="h-12 min-h-12 w-full justify-start gap-2.5 rounded-xl border-2 border-dashed border-border text-muted-foreground [&>span]:flex-1 [&>span]:text-left"
      // The same 36x24 box the platform logos occupy, centred within it: every
      // logo is 3:2 and fills that box, so centring the "+" puts it on their
      // shared vertical axis, and the identical box width is what lands the
      // label on exactly the platform names' line.
      //
      // A div, not a span, and that matters: flux renders leftIcon as a direct
      // child of the button (only `children` gets wrapped), so the
      // `[&>span]:flex-1` above — which exists to grow that children wrapper —
      // would match a span here too and stretch this box off its 36px. The
      // logos dodge it by being <img>; this dodges it by not being a span.
      leftIcon={
        <div className="flex h-6 w-9 shrink-0 items-center justify-center">
          <Icon name="plus" className="h-4 w-4" />
        </div>
      }
      onClick={() => setRequestPlatformOpen(true)}
    >
      <span className="truncate">Request a platform</span>
    </Button>
  );

  return (
    <div className="mx-auto max-w-[1400px] page-enter">
      {/* mb-8 widens PageHeader's own mb-6 to the 32px this page puts between
          the page header and the two columns — same step as Virtual Accounts.

          No action in the header any more: "Request a platform" now sits at the
          foot of the platform list itself, which is where a merchant discovers
          theirs is missing — while scanning that list, not while reading the
          page title. See requestPlatformRow below. */}
      <PageHeader
        title="Platforms"
        subtitle="Connect your PayGlocal receiving account to the platforms that pay you."
        className="mb-8"
      />

      <RequestPlatformDialog open={requestPlatformOpen} onOpenChange={setRequestPlatformOpen} />

      {/* Opened by the Generate Settlement Statement document card. The key
          remounts it whenever the platform or the currency changes, so the form
          always opens on the account the page is showing rather than on
          whatever it was last left holding. Closing it leaves the page exactly
          as it was — nothing out here reads back out of the drawer. */}
      {selectedAccount && (
        <SettlementStatementDrawer
          key={`${selectedPlatform.id}-${selectedAccount.id}`}
          platformName={selectedPlatform.name}
          accounts={accounts}
          defaultAccountId={selectedAccount.id}
          open={settlementDrawerOpen}
          onOpenChange={setSettlementDrawerOpen}
        />
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
            connect steps, account fields and documents run well past one
            screen. Sticks inside <main> (the dashboard's scroll container), and
            top-6 matches that container's own md:p-6 inset so the column pins
            level with where it started rather than flush against the header.
            Works only because the grid sets lg:items-start — a stretched grid
            item is as tall as its row and has nothing to slide within. The
            caption sticks with the list, since both live in this one item. */}
        <div className="lg:sticky lg:top-6 lg:col-start-1">
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

            {/* mt-1 matches the desktop list's own row gap, so the request row
                trails the platform choices at both widths. */}
            <div className="mt-1">{requestPlatformRow}</div>
          </div>

          {/* At `lg` and up, the vertical tab list. Wrapped rather than hiding
              the Card itself, so the Card keeps its own flex-column layout
              instead of having it overridden by a display utility.

              p-3 rather than Card's own 28px inset: the rows carry their own
              horizontal padding, so the card only has to keep them clear of its
              edge. Same treatment as the Virtual Accounts region card. */}
          <div className="hidden lg:block">
            <Card size="sm" className="mt-2 gap-0 p-3">
              <div className="space-y-1" role="list" aria-label="Select a platform">
                {platforms.map((platform) => {
                  const isSelected = platform.id === selectedPlatform.id;
                  return (
                    <Button
                      key={platform.id}
                      type="button"
                      role="listitem"
                      aria-current={isSelected}
                      variant={isSelected ? "secondary" : "ghost"}
                      size="md"
                      className={cn(
                        // flux renders leftIcon and rightIcon as direct
                        // children and wraps only `children` in a bare span, so
                        // `> span` is that wrapper and nothing else. Growing it
                        // is what pushes the chevron to the row's trailing edge
                        // instead of leaving it against the platform name.
                        "w-full justify-start gap-2.5 [&>span]:flex-1 [&>span]:text-left",
                        // The selected row is the only one at full emphasis:
                        // `secondary` carries the design system's own selected
                        // surface, and the primary tint on top is its accent.
                        // Unselected rows drop to the muted token, which is
                        // what keeps the whole column from out-weighing the
                        // workflow beside it.
                        isSelected ? "font-semibold text-primary" : "text-muted-foreground"
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
              </div>

              {/* Outside the list above, so it is a row in the same card rather
                  than a sixth option in the same list. mt-1 is that list's own
                  row gap, which is what makes it read as the next row down. */}
              <div className="mt-1">{requestPlatformRow}</div>
            </Card>
          </div>
        </div>

        {/* ─── Workflow ────────────────────────────────────────────────── */}
        {/* key remounts the column on every platform change so the fade
            replays on each switch, not just the first render. Every heading,
            the currency control, the account fields, the documents and the
            steps below all read off the selected platform, so switching tabs
            reprints the whole column in place.

            max-w-4xl caps the measure: past about 900px an instruction line
            runs longer than is comfortable to read and a screenshot frame grows
            taller than the step it belongs to, so the column stops there rather
            than taking every pixel a wide viewport offers.

            space-y-10 is the section step — the largest on the page, and wider
            than the 32px between two steps inside the Steps section. No rules
            anywhere: space alone separates the sections. */}
        <div key={selectedPlatform.id} className="page-enter max-w-4xl space-y-10 lg:col-start-2">
          {/* ─── 1. Connect your account ──────────────────────────────── */}
          {/* Title block and the currency control share one row, the control
              aligned right: the dropdown scopes everything below it, and sitting
              on the workflow title's own line is what says so. The supporting
              copy stays under the title rather than between them, so the pair
              reads as one titled row with its own description beneath.

              items-start keeps the trigger on the title's line instead of
              centring it against a two-line text block. flex-wrap plus gap-y-3
              is the narrow case, where the control takes a line of its own. */}
          <section>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="min-w-0">
                <h2 className={MODULE_TITLE}>Connect your account to {selectedPlatform.name}</h2>
                {/* mt-1 binds the description to the title it explains: the
                    tightest step on the page, against the 40px that separates
                    this whole section from the next. */}
                <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                  Follow these steps in {selectedPlatform.name} to start receiving payouts.
                </p>
              </div>

              {/* On a platform that runs storefronts, the control names the
                  storefront rather than a country in the abstract, because
                  that is what payout setup actually varies by: the merchant
                  picks the Amazon domain they sell on, and the receiving
                  account follows from it. Two levels — the four storefronts with a
                  currency of their own, then a non-selectable "Europe" header
                  over the five that all settle into the euro account — built
                  from flux-ui's own SelectGroup/SelectLabel, which is the
                  design system's grouped-option pattern. */}
              {marketplaces.length > 0 && selectedMarketplace ? (
                <Select value={selectedMarketplace.domain} onValueChange={setSelectedDomain}>
                  {/* Back to the same width as the plain currency trigger
                      below, now that a row is a domain alone — "amazon.com.au"
                      is the longest one and clears it comfortably. */}
                  <SelectTrigger
                    className="w-full shrink-0 sm:w-[190px]"
                    aria-label={`${selectedPlatform.name} marketplace`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const { flat, groups } = groupMarketplaces(marketplaces);
                      // The domain alone — it is both what the option carries
                      // in code and what a merchant recognises the storefront
                      // by, so naming the country beside it only restated it.
                      // The flag stays: it is the same affordance every other
                      // option list in the product leads with, and it is what
                      // keeps the five euro domains apart at a glance.
                      const row = (marketplace: (typeof marketplaces)[number]) => (
                        <span className="flex items-center gap-2">
                          <CountryFlag iso2={marketplace.iso2} />
                          {marketplace.domain}
                        </span>
                      );
                      return (
                        <>
                          {flat.map((marketplace) => (
                            <SelectItem key={marketplace.domain} value={marketplace.domain}>
                              {row(marketplace)}
                            </SelectItem>
                          ))}
                          {groups.map((group) => (
                            <SelectGroup key={group.label}>
                              <SelectLabel>{group.label}</SelectLabel>
                              {group.items.map((marketplace) => (
                                <SelectItem
                                  key={marketplace.domain}
                                  value={marketplace.domain}
                                  // Indented under its header, so the nesting
                                  // is visible in the list and not only in the
                                  // header's own presence.
                                  className="pl-8"
                                >
                                  {row(marketplace)}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </>
                      );
                    })()}
                  </SelectContent>
                </Select>
              ) : accounts.length > 0 && selectedAccount ? (
                <Select value={selectedAccount.id} onValueChange={setSelectedAccountId}>
                  {/* A secondary control beside a primary title: the Select's
                      own default (outlined, not filled) is already that step
                      down, so nothing is added on top of it. Wide enough for the
                      longest option ("Rest of the World") beside its flag, so no
                      row is truncated in the trigger. */}
                  <SelectTrigger
                    className="w-full shrink-0 sm:w-[190px]"
                    aria-label="Receiving currency"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <span className="flex items-center gap-2">
                          {/* A SWIFT-rail catch-all account has no single
                              country behind it, so it shows a globe instead of
                              a flag — same fallback the MCA link builder's
                              currency select uses. */}
                          {account.iso2 === "ROW" ? (
                            <Icon
                              name="globe"
                              className="h-3.5 w-5 shrink-0 text-muted-foreground"
                            />
                          ) : (
                            <CountryFlag iso2={account.iso2} />
                          )}
                          {/* The currency, named the way pg-dashboard names it
                              (CURRENCY_COUNTRY_MAP — "United States" for USD,
                              "Rest of the World" for the SWIFT account), which
                              is already this account's countryName.
                              Deliberately not the platform's marketplace domain:
                              production shows the currency alone, on Amazon as
                              much as anywhere. */}
                          {account.countryName || account.currency}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          </section>

          {/* ─── 2. Account details ───────────────────────────────────── */}
          {/* Supporting preparation, not a step: collapsed by default so it
              costs a header's height until it's wanted. flux-ui's Accordion
              supplies the disclosure, the chevron and their alignment — the
              trigger is already `items-center justify-between`, so the title and
              chevron sit on one line without anything added here. `collapsible`
              is what lets the only item be closed, which is the state it opens
              in. Its trigger is the section's own title, so there's no separate
              heading above it saying the same thing twice.

              Read-only by design: no Share or Copy actions, so it stays
              subordinate to the walkthrough rather than becoming a second thing
              to act on. The values are `buildFullAccountDetails` — the same
              builder the Virtual Accounts card and the share modal render, so
              these fields can't drift from the ones the rest of the product
              shows, and they follow the platform and currency selections above.

              px-7 py-0 keeps Card's own horizontal inset — the value every other
              card on the page uses — while handing the vertical to the trigger's
              py-4 and the content's pb-4, which are the component's own. Card's
              default py-7 on top of those would double the padding around a
              collapsed row. */}
          {selectedAccount && (
            <Card size="sm" className="gap-0 px-7 py-0">
              <Accordion type="single" collapsible>
                <AccordionItem value="account-details" className="border-b-0">
                  {/* Sized on the trigger rather than by wrapping the label in a
                      heading element: leaving the colour to the component is
                      what keeps its hover-to-primary state working — an inner
                      element setting text-foreground would block it. */}
                  <AccordionTrigger className="text-base font-semibold">
                    Account Details
                  </AccordionTrigger>
                  <AccordionContent>
                    {/* Proximity does the grouping, not rules: 4px holds a label
                        to its own value, the grid's own gaps separate one field
                        from the next, and no field carries padding of its own.
                        Three columns where the old 320px sidebar could only have
                        carried one — this column is wide enough to lay the
                        fields out the way the account card itself does, so the
                        two read as the same module. */}
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                      {accountFields.map((field) => (
                        <div key={field.label} className="min-w-0 space-y-1">
                          <dt className={FIELD_LABEL}>{field.label}</dt>
                          <dd className={FIELD_VALUE}>{field.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Card>
          )}

          {/* ─── 3. Documents you might need ──────────────────────────── */}
          {/* The other half of the preparation, and the last thing before the
              instructions begin — this is where a merchant reaches for them,
              mid-setup rather than after it. Separated from the account panel
              above by space only, no rule. Only Amazon carries documents, so on
              every other platform this section doesn't exist and the steps
              follow the account panel directly. */}
          {documents.length > 0 && (
            <section>
              {/* A step below the workflow title and a step above the card
                  metadata beneath it — the middle of the page's three type
                  levels. */}
              <h2 className={MODULE_TITLE}>Documents you might need</h2>
              <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                Statements {selectedPlatform.name} may ask you for.
              </p>

              {/* One card per document rather than rows inside a single card:
                  each is its own action target. Side by side in equal columns
                  from `sm` up — they shrink together on a tablet rather than one
                  dropping under the other — and stacked below it, where two
                  cards on one line would truncate their own titles. mt-3 binds
                  the pair to the heading that names them. */}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
                    onClick={() => void handleDocumentAction(doc)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void handleDocumentAction(doc);
                      }
                    }}
                    className="min-w-0 cursor-pointer flex-row items-center justify-between gap-3 p-4 transition-[box-shadow,border-color] duration-150 hover:shadow-md"
                  >
                    <div className="min-w-0">
                      {/* Metadata above, title below — the caption qualifies the
                          title, so it sits muted and a size smaller. */}
                      <p className="truncate text-[12px] text-muted-foreground">{doc.caption}</p>
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
                      disabled={!doc.opensSettlementForm && isDownloadingStatement}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDocumentAction(doc);
                      }}
                    >
                      <Icon name={doc.actionIcon} className="h-4 w-4" />
                    </IconButton>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* ─── 4. Steps ────────────────────────────────────────────── */}
          {/* The page's primary instructional content, and the only section
              carrying full-width art, which is what gives it the weight the two
              compact sections above it deliberately don't have. */}
          <section>
            <h2 className={MODULE_TITLE}>Steps</h2>

            {/* Step number → instruction → screenshot, in that order, every step
                the same shape so the sequence scans as one column.

                space-y-8 between steps against the 4px and 12px inside one: a
                step's own parts sit far closer to each other than any step does
                to the next, which is what gives the sequence its rhythm rather
                than reading as six evenly spaced blocks. */}
            <ol className="mt-4 space-y-8">
              {selectedPlatform.steps.map((step, index) => (
                <li key={step.instruction}>
                  {/* The number is a marker, not a title: smallest size, muted,
                      medium weight so it still reads as a label. The instruction
                      above it in both size and colour is what makes the
                      instruction the step's own strongest element. */}
                  <p className="text-[12px] font-medium text-muted-foreground">Step {index + 1}</p>
                  <p className="mt-1 text-[15px] font-medium text-foreground">{step.instruction}</p>

                  {/* Caveat, not instruction: muted and a size down so it reads
                      as an aside rather than another thing to do. Same "Note:"
                      prefix pg-dashboard's own step timeline uses. */}
                  {step.note && (
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      <span className="font-medium">Note:</span> {step.note}
                    </p>
                  )}

                  {/* Quick Access — the identifiers this step asks the merchant
                      to type into the platform, sat between the instruction that
                      names them and the screenshot showing where they go, so
                      they're on screen at the moment they're needed rather than
                      in a panel elsewhere on the page.

                      Which step carries it is data (`quickAccess` on the step),
                      not a step index, so moving it is a constants change.

                      The fields are the account's own `details` — the same two
                      rows the account card shows, keeping their rail-specific
                      labels ("Account Number"/"ACH Routing" on a US account,
                      "IBAN"/"SEPA BIC" in Europe) rather than being flattened
                      into generic ones that would be wrong on half the rails.
                      They follow the currency selector above, so switching
                      currency reprints these values. */}
                  {step.quickAccess && selectedAccount && (
                    <Card
                      size="sm"
                      className="mt-3 flex-row flex-wrap items-center justify-between gap-x-8 gap-y-4 p-6"
                    >
                      <p className="text-[15px] font-semibold text-foreground">Quick access</p>

                      <dl className="flex flex-wrap items-start gap-x-6 gap-y-4">
                        {selectedAccount.details.map((field) => (
                          <div key={field.label} className="min-w-0 space-y-1.5">
                            <dt className="text-[12px] text-muted-foreground">{field.label}:</dt>
                            <dd>
                              {/* The product's own copyable field, sat on a
                                  bordered surface so it reads as an input-shaped
                                  chip. */}
                              <CopyableText
                                value={field.value}
                                className="rounded-lg border border-border px-3 py-1.5"
                                valueClassName="font-medium"
                              />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </Card>
                  )}

                  {/* pg-dashboard's own frame for these (StyledImageCard in its
                      platform-withdrawals styles) minus the border: a fixed
                      515x265 box with a 10px radius, clipped content and no
                      padding, with the image filling it edge to edge.

                      The fixed ratio is what makes the sequence read evenly —
                      every asset is natively ~1.94 (516x265 for the SVGs,
                      1562x808 for the JPGs), so filling this box costs no
                      visible distortion. No border of our own, because eleven of
                      these captures carry a frame in the artwork itself and one
                      added here would double up on exactly those. overflow-hidden
                      stays: it is what clips the image to the rounded corners. */}
                  {step.screenshotSrc && (
                    <div className="mt-3 aspect-[515/265] w-full overflow-hidden rounded-[10px]">
                      <Image
                        src={step.screenshotSrc}
                        alt={step.screenshotAlt ?? ""}
                        width={515}
                        height={265}
                        className="h-full w-full"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
