"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Accordion,
  Button,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Card,
  CardContent,
  IconButton,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
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
import { SUPPORTED_PLATFORMS, accountsForPlatform } from "@/features/dashboard/platforms/constants";

/** Module title — the step below the page's own h1, shared by every module
 *  here. Same tokens MCA v2 and Platforms use, so the three read as one
 *  product. */
const MODULE_TITLE = "text-base font-semibold text-foreground";

/** Supporting copy under a module title, and secondary text inside a module. */
const MODULE_SUBTITLE = "text-[13px] text-muted-foreground";

/**
 * Platforms — the walkthrough for pointing a PayGlocal receiving account at
 * the marketplace or freelancing platform that pays you. The only Platforms
 * surface; the earlier sidebar-layout variant this sat beside is gone.
 *
 * The page reads as one funnel: pick a platform, pick the currency you're being
 * paid in, then work down the numbered steps. Documents sit beside the walkthrough as the one supporting aside,
 * because that is where a merchant reaches for them — mid-setup, not before it.
 *
 * Nothing here is a new component. The platform row is a list of flux-ui Cards
 * in the selected treatment the Virtual Accounts carousel uses, and the currency
 * control is flux-ui's Select. Content
 * lives in `@/features/dashboard/platforms/constants`, so a new platform or
 * a new screenshot is one data change rather than a component edit.
 */
export function PlatformsFeature() {
  // Same gate as Multi-currency: this page reads the very same virtual-accounts
  // endpoint, which is scoped to a single MID in its path, so a multi-MID
  // merchant has to choose one before it can show the right accounts.
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
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  // Amazon is the only platform with documents (see the Platform type), so on
  // every other one the second grid column doesn't exist and the walkthrough
  // takes the full width rather than leaving a 320px gutter beside it.
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
   * What a document row does when it's activated — from the card, from its icon
   * button, or from the keyboard. Which rows open the settlement form is data
   * (`opensSettlementForm`), not a title match; every other row is the bank
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

  return (
    <div className="mx-auto max-w-[1400px] page-enter">
      {/* No margin override: PageHeader's own mb-6 is the step this page wants
          between the description and the platform cards. The 32px other pages
          add on top of it opens a gap wide enough that the cards read as their
          own block rather than as the header's answer. Title → subtitle stays
          the component's own mt-0.5, the tightest step on the page. */}
      {/* Through PageHeader's own actions slot rather than a wrapper row, so
          the alignment and the header's own mb-6 stay the component's business.
          The action answers "mine isn't here", which a merchant asks while
          scanning the platform row below — not after working through a
          walkthrough for a platform they don't use. */}
      <PageHeader
        title="Platforms"
        subtitle="Connect your PayGlocal receiving account to the platforms that pay you."
        actions={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Icon name="plus" className="h-4 w-4" />}
            onClick={() => setRequestPlatformOpen(true)}
          >
            Request a platform
          </Button>
        }
      />

      <RequestPlatformDialog open={requestPlatformOpen} onOpenChange={setRequestPlatformOpen} />

      {/* Opened by the Generate Settlement Statement document row. The key
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

      {/* 40px — the page's largest step, and the only place it appears. The
          platform row is one closed group; this is the break between choosing
          a platform and working through it, so it has to out-measure both the
          24px above it and the 32px between individual steps below. */}
      <div className="space-y-10">
        {/* ─── Platform selection ──────────────────────────────────────── */}
        {/* No module title above the row: the cards are the first thing under
            the page header and are self-evidently the choice being offered, so
            a heading would only restate them. The list keeps its aria-label,
            which is what a screen reader announces in place of that heading. */}
        <section>
          {/* All five platforms sit on one horizontal row spanning the content
              width, each card an equal share of it — no scrolling, nothing
              hidden past an edge, so the full set of choices is visible at a
              glance. The column count steps down on narrower viewports rather
              than letting five cards squeeze to an unreadable width. p-1 keeps
              the selected card's ring-2 clear of the row's own bounds.

              A `role="list"` of card-shaped buttons rather than a radio group:
              with no radio indicator drawn on the card, the brand mark and the
              selected ring are what carry the state, and this is the same
              treatment RegionSelector gives every other one-of-many list in
              the product. */}
          <div
            role="list"
            aria-label="Select a platform"
            className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3 lg:grid-cols-5"
          >
            {platforms.map((platform) => {
              const isSelected = platform.id === selectedPlatform.id;
              return (
                <Card
                  key={platform.id}
                  size="sm"
                  role="listitem"
                  tabIndex={0}
                  aria-current={isSelected}
                  onClick={() => setSelectedPlatformId(platform.id)}
                  // A mouse click would otherwise leave the card holding
                  // browser focus after selection, showing a focus ring nobody
                  // asked for. preventDefault suppresses only that mouse-click
                  // focus; Tab/Enter/Space are untouched.
                  onMouseDown={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPlatformId(platform.id);
                    }
                  }}
                  className={cn(
                    "min-w-0 cursor-pointer gap-0 p-4 transition-[box-shadow,border-color] duration-150 hover:shadow-md",
                    isSelected && "border-primary ring-2 ring-primary"
                  )}
                >
                  <CardContent className="flex min-w-0 items-center gap-3">
                    {/* The platform's own brand mark, sized by the box rather
                        than by the file so all five sit on the same optical
                        line whatever padding each PNG carries. object-contain
                        keeps every mark inside its 3:2 footprint uncropped. */}
                    <Image
                      src={platform.logoSrc}
                      alt=""
                      width={90}
                      height={60}
                      className="h-6 w-9 shrink-0 object-contain"
                    />
                    <span
                      className={cn(
                        "min-w-0 truncate text-[14px] text-foreground",
                        isSelected && "font-semibold text-primary"
                      )}
                    >
                      {platform.name}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Everything below is derived from the selected platform. key
            remounts it on every platform change so the fade replays on each
            switch, not just the first render. */}
        <div key={selectedPlatform.id} className="page-enter">
          {/* ─── Connection steps + documents ───────────────────────────── */}
          {/* The walkthrough leads and takes whatever width is left; documents
              sit in a fixed 320px column beside it, wide enough for a two-line
              card and narrow enough to read as the aside it is. Below `lg` the
              template drops out and the two stack in DOM order: steps first,
              documents under them.

              Explicit col-start/row-start rather than one wrapper div per
              column — the same placement technique MCA v2's two-column grid
              uses. Row 1 carries both module titles, so row 2 is where both
              columns' content begins: the first document card's top edge lands
              on Step 1's, whatever height the taller title block resolves to.

              items-start keeps the documents column at its own natural height
              instead of stretching it down the length of a six-step
              walkthrough.

              gap-y-4 is the row gap, and it is the only thing separating each
              column's title block from its content — 16px, the medium step of
              description → first item. Both columns inherit it from the same
              grid, which is what makes the walkthrough and the documents start
              on exactly the same line without either one carrying a margin of
              its own to be kept in sync. */}
          <div
            className={cn(
              "grid gap-x-8 gap-y-4 lg:items-start",
              documents.length > 0 && "lg:grid-cols-[minmax(0,1fr)_320px]"
            )}
          >
            {/* Title block and the currency control share one row: the
                dropdown scopes the steps beneath it, so sitting on their
                heading's line is what says so. flex-wrap drops it under the
                title on a narrow column rather than squeezing the heading, and
                items-start keeps the trigger aligned to the title's own line
                instead of centring against a two-line block. */}
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 lg:col-start-1 lg:row-start-1">
              <div className="min-w-0">
                <h2 className={MODULE_TITLE}>Connect your account to {selectedPlatform.name}</h2>
                <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                  Follow these steps in {selectedPlatform.name} to start receiving payouts.
                </p>
              </div>

              {/* Which of the platform's receiving accounts the steps below are
                  about. Shown wherever the platform has accounts — pg-dashboard
                  offers the same currency picker on every platform, not only on
                  Amazon. */}
              {accounts.length > 0 && selectedAccount && (
                <Select value={selectedAccount.id} onValueChange={setSelectedAccountId}>
                  {/* Wide enough for the longest option ("Rest of the World")
                      beside its flag, so no row is truncated in the trigger. */}
                  <SelectTrigger className="w-[190px] shrink-0" aria-label="Receiving currency">
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
                              "Rest of the World" for the SWIFT account), which is
                              already this account's countryName. Deliberately not
                              the platform's marketplace domain: production shows
                              the currency alone, on Amazon as much as anywhere. */}
                          {account.countryName || account.currency}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* The walkthrough column: the account panel, then the steps. No
                top margin on the wrapper — the grid's row gap above already
                places it against the title block.

                space-y-6 holds the account panel to Step 1 at 24px: closer
                than the 32px between two steps, so it reads as the reference
                the walkthrough opens with rather than as a step of its own,
                and further than anything inside a step. */}
            <div className="space-y-6 lg:col-start-1 lg:row-start-2">
              {/* Account Details — reference material for the steps directly
                  below it, collapsed by default so it costs a header's height
                  until it's wanted. flux-ui's Accordion supplies the disclosure
                  and the rotating chevron; `collapsible` is what lets the only
                  item be closed, which is the state it opens in.

                  Read-only by design: no Share or Copy actions, so it stays
                  subordinate to the walkthrough rather than becoming a second
                  thing to act on. The values are `buildFullAccountDetails` —
                  the same builder the Virtual Accounts card and the share modal
                  render, so these fields can't drift from the ones the rest of
                  the product shows, and they follow the platform and currency
                  selections above.

                  px-5 py-0 rather than Card's own inset: the trigger and
                  content carry their own vertical padding, so the card only has
                  to hold them clear of its side edges — anything more and the
                  collapsed row sits adrift inside its own surface. */}
              {selectedAccount && (
                <Card size="sm" className="gap-0 px-5 py-0">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="account-details" className="border-b-0">
                      <AccordionTrigger className="text-base font-semibold">
                        Account Details
                      </AccordionTrigger>
                      <AccordionContent>
                        {/* Label above value, in the same tokens the Virtual
                            Accounts details card uses. Three columns here where
                            the sidebar could only have carried one: this column
                            is wide enough to lay the fields out the way the
                            account card itself does, so the two read as the
                            same module. space-y-1 inside a field against the
                            grid's own gaps is what keeps each label bound to
                            its own value. */}
                        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                          {accountFields.map((field) => (
                            <div key={field.label} className="min-w-0 space-y-1">
                              <dt className="text-[12px] text-muted-foreground">{field.label}</dt>
                              <dd className="break-words text-[13px] font-medium text-foreground">
                                {field.value}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </Card>
              )}

              {/* Step number → instruction → screenshot, in that order, every
                  step the same shape so the sequence scans as one column.

                  space-y-8 between steps against the 12px that holds an
                  instruction to its own screenshot: a step and its art sit
                  closer to each other than any step does to the next one, which
                  is what gives the sequence its rhythm rather than reading as
                  six evenly spaced blocks. */}
              <ol className="space-y-8">
                {selectedPlatform.steps.map((step, index) => (
                  <li key={step.instruction}>
                    <p className="text-[12px] font-medium text-muted-foreground">
                      Step {index + 1}
                    </p>
                    <p className="mt-1 text-[15px] font-medium text-foreground">
                      {step.instruction}
                    </p>

                    {/* Caveat, not instruction: muted and a size down so it reads
                      as an aside rather than a seventh thing to do. Same "Note:"
                      prefix pg-dashboard's own step timeline uses. */}
                    {step.note && (
                      <p className="mt-1 text-[13px] text-muted-foreground">
                        <span className="font-medium">Note:</span> {step.note}
                      </p>
                    )}

                    {/* Quick Access — the identifiers this step asks the merchant
                      to type into the platform, sat between the instruction
                      that names them and the screenshot showing where they go,
                      so they're on screen at the moment they're needed rather
                      than in a panel elsewhere on the page.

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
                                  bordered surface so it reads as an
                                  input-shaped chip — the same treatment the
                                  Platforms page gives its Quick Access
                                  values. */}
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
                      1562x808 for the JPGs), so filling this box costs no visible
                      distortion. No border of our own, because eleven of these
                      captures carry a frame in the artwork itself and one added
                      here would double up on exactly those. overflow-hidden stays:
                      it is what clips the image to the rounded corners. */}
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
            </div>

            {/* ─── Sidebar: documents ───────────────────────────────────── */}
            {/* Placed on row 1 but spanning both of the grid's rows: it starts
                level with the walkthrough heading, and the span is what stops
                row 1 from being stretched to this column's full height, which
                would push Step 1 down the page to meet it.

                items-start on the grid keeps the column at its natural height
                rather than running the length of the walkthrough. mt-6 only
                below `lg`, where the grid has collapsed to one column and this
                follows the last screenshot: on top of the 16px row gap it makes
                the same 40px section break the platform row gets, so the
                documents don't read as a seventh step. */}
            {documents.length > 0 && (
              <div className="mt-6 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:mt-0">
                <h2 className={MODULE_TITLE}>Documents you might need</h2>
                <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                  Statements {selectedPlatform.name} may ask you for.
                </p>

                {/* One card per document rather than rows inside a single card:
                    each is its own action target. space-y-2 is the tightest step
                    on the page: each card already carries its own border, so 8px
                    is enough to separate them, and holding the pair that close is
                    what makes the documents read as one compact aside rather than
                    a second column of content competing with the steps. */}
                <div className="mt-3 space-y-2">
                  {documents.map((doc) => (
                    // The whole card is the target, not just the icon: the card
                    // carries one action, so anywhere on it should trigger it
                    // rather than asking for a hit on a 32px button. role/tabIndex
                    // and the Enter/Space handler are what make that reachable by
                    // keyboard too; the accessible name comes from the card's own
                    // caption and title text.
                    //
                    // No preventDefault on mousedown here (unlike the platform
                    // cards): the card should keep browser focus after a click, so
                    // that closing the drawer returns focus to the row that opened
                    // it.
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
                      className="flex-row items-center justify-between gap-3 p-4 cursor-pointer transition-[box-shadow,border-color] duration-150 hover:shadow-md"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[12px] text-muted-foreground">{doc.caption}</p>
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {doc.title}
                        </p>
                      </div>
                      {/* Kept as an affordance — it says the row does something —
                          but it now runs the same handler the card does.
                          stopPropagation so a click on the icon fires that
                          handler once, not twice. */}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
