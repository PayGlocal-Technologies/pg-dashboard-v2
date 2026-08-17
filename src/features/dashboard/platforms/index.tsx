"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Card,
  Heading,
  IconButton,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Text,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { buildFullAccountDetails } from "@/features/dashboard/multi-currency/utils";
import { SettlementStatementDrawer } from "@/features/dashboard/platforms-v1/components/SettlementStatementDrawer";
import {
  SCREENSHOT_ASPECT_CLASS,
  SUPPORTED_PLATFORMS,
  accountForMarketplace,
  accountsForPlatform,
} from "@/features/dashboard/platforms/constants";
import type { PlatformDocument } from "@/features/dashboard/platforms/types";

/**
 * Account field label and value.
 *
 * These carry classes rather than being flux-ui `Text`, because `Text` only
 * renders p/span/div/label and these belong in a `dl` as `dt`/`dd` — dropping
 * the description-list semantics to gain the component would be the wrong
 * trade. The classes are exactly what `Text size="xs" color="subtle"` and
 * `Text size="sm" weight="medium"` emit, so they stay on the same scale and
 * the same colour tokens as every other string on the page.
 */
const FIELD_LABEL = "text-xs text-muted-foreground";
const FIELD_VALUE = "break-words text-sm font-medium text-foreground";

/**
 * Platforms — how to point a PayGlocal receiving account at the marketplace or
 * freelancing platform that pays you.
 *
 * Two columns: the platform navigation on the left, and that platform's whole
 * connection workflow on the right. The workflow reads top-down as one funnel —
 * name the platform and storefront, check the account those resolve to, collect
 * the documents you'll be asked for, then work down the numbered steps.
 *
 * The type scale is what carries the hierarchy, in three steps and no more: the
 * workflow title at `Heading size="md"`, its three section titles a step below
 * at `size="sm"`, and everything else `Text` — `weight="medium"` where an item
 * leads its own group (a step's instruction, a document's title, an account
 * value), `color="subtle"` where it supports one (descriptions, field labels,
 * step numbers, the navigation caption). Nothing on the page sets a font size,
 * weight or colour of its own, so the whole thing moves with the design system.
 *
 * Sections are separated by space, never rules: 40px between the four sections,
 * 32px between steps, and 4–16px binding each group's own parts together.
 *
 * Nothing here is a new component. The platform rows are flux-ui Buttons in the
 * same ghost/secondary selected treatment RegionSelector uses, the mobile
 * platform control and the storefront control are its Select, the account panel
 * its Accordion, the document and screenshot surfaces its Card, and the
 * settlement form is the Drawer Platforms v1 already opens. Content lives in
 * `constants.ts`, so adding a platform, a storefront or a screenshot is a data
 * change that never touches this file.
 */
export function PlatformsFeature() {
  const platforms = SUPPORTED_PLATFORMS;

  // Exactly one platform is selected at all times — defaults to Amazon (the
  // first entry) so the workflow is populated on load, not only after a click.
  const [selectedPlatformId, setSelectedPlatformId] = useState(platforms[0]?.id ?? "");
  const selectedPlatform =
    platforms.find((p) => p.id === selectedPlatformId) ?? platforms[0] ?? null;

  // Which storefront the workflow is scoped to.
  //
  // Stored as a marketplace id and *resolved* against whichever platform is
  // selected, rather than being reset by an effect when the platform changes
  // (see CLAUDE.md's no-setState-in-effect rule). A marketplace the newly
  // selected platform doesn't run simply falls out of the lookup and its first
  // storefront wins, so the panel below can never describe a storefront that
  // isn't on offer.
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState("");
  const marketplaces = selectedPlatform?.marketplaces ?? [];
  const selectedMarketplace =
    marketplaces.find((m) => m.id === selectedMarketplaceId) ?? marketplaces[0] ?? null;

  // Several storefronts can settle into one account, so the account is derived
  // from the marketplace rather than being a second thing to choose.
  const accounts = selectedPlatform ? accountsForPlatform(selectedPlatform) : [];
  const selectedAccount = accountForMarketplace(accounts, selectedMarketplace);

  const [settlementDrawerOpen, setSettlementDrawerOpen] = useState(false);

  /**
   * What a document card does when it's activated — from the card, from its
   * icon button, or from the keyboard. Which cards open the settlement form is
   * data (`opensSettlementForm`), not a title match; the rest stay placeholders
   * until their endpoints exist, the same stand-in treatment MCA v2 gives its
   * proof-of-ownership download.
   */
  const handleDocumentAction = (doc: PlatformDocument) => {
    if (doc.opensSettlementForm) {
      setSettlementDrawerOpen(true);
      return;
    }
    toast.info(`${doc.title} will be available soon`);
  };

  if (!selectedPlatform) return null;

  return (
    <div className="mx-auto max-w-[1400px] page-enter">
      {/* mb-8 widens PageHeader's own mb-6 to the 32px this page puts between
          the page header and the two columns — same step as MCA v2. */}
      <PageHeader
        title="Platforms"
        subtitle="Connect your PayGlocal receiving account to the platforms that pay you."
        className="mb-8"
      />

      {/* Opened by the Generate Settlement Statement document card. The key
          remounts it whenever the platform or the account changes, so the form
          always opens on the account the page is showing rather than on
          whatever it was last left holding. */}
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

      {/* Fixed 288px navigation column, matching MCA v2's, with the workflow
          taking whatever width is left. minmax(0,1fr) rather than 1fr so a long
          instruction or a wide screenshot can't push the column past the
          viewport — which is what keeps the page free of horizontal scroll at
          every width. gap-x-10 on desktop narrows to gap-x-8 at `lg`, where the
          two columns first appear and the width is tightest. Below `lg` the
          template drops out entirely and the two stack in DOM order: platform
          control first, then the workflow. */}
      <div className="grid gap-x-8 gap-y-6 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start xl:gap-x-10">
        {/* ─── Platform navigation ─────────────────────────────────────── */}
        <div className="lg:col-start-1">
          {/* Text, not Heading: the navigation is how you reach the content
              rather than content itself, so its caption sits on the supporting
              scale — the smallest size, muted — and stays lighter than any
              title in the workflow beside it. The list's own aria-label is what
              a screen reader announces here. */}
          <Text as="div" size="xs" weight="semibold" color="subtle" className="uppercase tracking-wide">
            Select platform
          </Text>

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
              edge. Same treatment as MCA v2's region card. */}
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
                      // flux-ui's Button lays leftIcon / label / rightIcon out
                      // as three direct flex children, so the chevron would
                      // otherwise sit immediately after the platform name.
                      // Letting the label span take the free space pushes it to
                      // the far right of the row instead.
                      className={cn(
                        "w-full justify-start gap-2.5 [&>span]:flex-1 [&>span]:text-left",
                        // The selected row is the only one at full emphasis:
                        // `secondary` carries the design system's own selected
                        // surface, and the primary tint on top is its accent.
                        // Unselected rows drop to the muted token, which is
                        // what keeps the whole column from out-weighing the
                        // workflow beside it.
                        isSelected ? "text-primary font-semibold" : "text-muted-foreground"
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
            </Card>
          </div>
        </div>

        {/* ─── Workflow ────────────────────────────────────────────────── */}
        {/* key remounts the column on every platform change so the fade
            replays on each switch, not just the first render. Every heading,
            the storefront control, the account fields, the documents and the
            steps below all read off the selected platform, so switching tabs
            reprints the whole column in place.

            max-w-4xl caps the measure: past about 900px an instruction line
            runs longer than is comfortable to read and a screenshot frame grows
            taller than the step it belongs to, so the column stops there rather
            than taking every pixel a wide viewport offers.

            space-y-10 is the section step — the largest on the page, and wider
            than the 32px between two steps inside the Steps section. No rules
            anywhere: space alone separates the four sections. */}
        <div
          key={selectedPlatform.id}
          className="page-enter max-w-4xl space-y-10 lg:col-start-2"
        >
          {/* ─── 1. Connect your account ──────────────────────────────── */}
          {/* Heading and storefront control share one row, the control aligned
              right: it scopes everything below it, and sitting on the workflow
              title's own line is what says so. The supporting copy stays under
              the heading rather than between them, so the pair reads as one
              titled row with its own description beneath.

              items-start keeps the trigger on the heading's line instead of
              centring it against a two-line text block. flex-wrap plus gap-y-3
              is the mobile case: `w-full` below `sm` gives the control a
              full-width line of its own, and the row gap becomes the step
              between the copy and it. */}
          <section>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
              <div className="min-w-0">
                {/* The page's strongest element — a full size above the three
                    section titles below it, so the workflow reads as one named
                    thing containing three parts rather than four peers. */}
                <Heading level={2} size="md">
                  Connect your account to {selectedPlatform.name}
                </Heading>
                {/* mt-1 binds the description to the title it explains: the
                    tightest step on the page, against the 40px that separates
                    this whole section from the next. */}
                <Text size="sm" color="subtle" className="mt-1">
                  Follow these steps in {selectedPlatform.name} to start receiving payouts.
                </Text>
              </div>

              {/* Only on platforms that run more than one storefront — Amazon,
                  today. Elsewhere there's a single account behind the steps,
                  and a dropdown that can't change anything would read as a
                  decision the merchant still has to make. */}
              {selectedMarketplace && marketplaces.length > 1 && (
                <Select value={selectedMarketplace.id} onValueChange={setSelectedMarketplaceId}>
                  {/* A secondary control beside a primary title: the Select's
                      own default (outlined, not filled) is already that step
                      down, so nothing is added on top of it. Wide enough for
                      the longest storefront the options carry
                      ("Amazon.com.au") beside its flag, so no row is truncated
                      in the trigger. */}
                  <SelectTrigger
                    className="w-full shrink-0 sm:w-[190px]"
                    aria-label={`${selectedPlatform.name} marketplace`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {marketplaces.map((marketplace) => (
                      <SelectItem key={marketplace.id} value={marketplace.id}>
                        <span className="flex items-center gap-2">
                          {/* The storefront's own country, not its account's —
                              the four euro-settling marketplaces would
                              otherwise show four identical flags. */}
                          <CountryFlag iso2={marketplace.iso2} />
                          {marketplace.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </section>

          {/* ─── 2. Account details ───────────────────────────────────── */}
          {/* Supporting preparation, not a step: collapsed by default so it
              costs a header's height until it's wanted. flux-ui's Accordion
              supplies the disclosure, the chevron and their alignment — the
              trigger is already `items-center justify-between`, so the title
              and chevron sit on one line without anything added here.
              `collapsible` is what lets the only item be closed, which is the
              state it opens in. Its trigger is the section's own title, so
              there's no separate heading above it saying the same thing twice.

              Read-only by design: no Share or Copy actions, so it stays
              subordinate to the walkthrough rather than becoming a second thing
              to act on. The values are `buildFullAccountDetails` — the same
              builder the Virtual Accounts card, the share modal and Platforms
              v1's own panel render, so these fields can't drift from the ones
              the rest of the product shows, and they follow the platform and
              marketplace selections above.

              px-7 py-0 keeps Card's own horizontal inset — the value every
              other card on the page uses — while handing the vertical to the
              trigger's py-4 and the content's pb-4, which are the component's
              own. Card's default py-7 on top of those would double the padding
              around a collapsed row. */}
          {selectedAccount && (
            <Card size="sm" className="gap-0 px-7 py-0">
              <Accordion type="single" collapsible>
                <AccordionItem value="account-details" className="border-b-0">
                  {/* Sized on the trigger rather than by wrapping the label in
                      a Heading: these are the exact classes `Heading size="sm"`
                      emits, and leaving the colour to the component is what
                      keeps its hover-to-primary state working — an inner
                      element setting text-foreground would block it.

                      Named for the payer: these are the details someone in that
                      country pays into, and saying so is what confirms the
                      marketplace choice above landed. */}
                  <AccordionTrigger className="text-base font-semibold">
                    Account details for payers in {selectedAccount.countryName}
                  </AccordionTrigger>
                  <AccordionContent>
                    {/* Proximity does the grouping, not rules: 4px holds a
                        label to its own value, 24px separates one field from
                        the next, and no field carries padding of its own. */}
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                      {buildFullAccountDetails(selectedAccount).map((field) => (
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
              instructions begin. Separated from the account panel above by
              space only — no rule. */}
          <section>
            {/* A step below the workflow title and a step above the card
                metadata beneath it — the middle of the page's three type
                levels. */}
            <Heading level={3} size="sm">
              Documents you might need
            </Heading>

            {/* One card per document rather than rows inside a single card:
                each is its own action target. Side by side in equal columns
                from `sm` up — they shrink together on a tablet rather than one
                dropping under the other — and stacked below it, where two cards
                on one line would truncate their own titles. mt-3 binds the pair
                to the heading that names them. */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {selectedPlatform.documents.map((doc) => (
                // Card's own surface, border and radius, with nothing added but
                // the hover shadow that says it's actionable. The whole card is
                // the target, not just the icon: it carries one action, so
                // anywhere on it should trigger it rather than asking for a hit
                // on a 32px button. role/tabIndex and the Enter/Space handler
                // are what make that reachable by keyboard too; the accessible
                // name comes from the card's own caption and title text.
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
                  className="min-w-0 flex-row items-center justify-between gap-3 p-4 cursor-pointer transition-[box-shadow,border-color] duration-150 hover:shadow-md"
                >
                  <div className="min-w-0">
                    {/* Metadata above, title below — the caption qualifies the
                        title, so it sits muted and a size smaller. */}
                    <Text size="xs" color="subtle" truncate>
                      {doc.caption}
                    </Text>
                    <Text size="sm" weight="medium" truncate>
                      {doc.title}
                    </Text>
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

          {/* ─── 4. Steps ────────────────────────────────────────────── */}
          {/* The page's primary instructional content, and the only section
              carrying full-width art, which is what gives it the weight the two
              compact sections above it deliberately don't have. */}
          <section>
            <Heading level={3} size="sm">
              Steps
            </Heading>

            {/* Step number → instruction → screenshot, in that order, every
                step the same shape so the sequence scans as one column.

                space-y-8 between steps against the 4px and 12px inside one: a
                step's own parts sit far closer to each other than any step does
                to the next, which is what gives the sequence its rhythm rather
                than reading as six evenly spaced blocks. */}
            <ol className="mt-4 space-y-8">
              {selectedPlatform.steps.map((step, index) => (
                <li key={step.instruction}>
                  {/* The number is a marker, not a title: smallest size, muted,
                      medium weight so it still reads as a label. The
                      instruction above it in both size and colour is what makes
                      the instruction the step's own strongest element. */}
                  <Text size="xs" weight="medium" color="subtle">
                    Step {index + 1}
                  </Text>
                  <Text size="md" weight="medium" className="mt-1">
                    {step.instruction}
                  </Text>

                  {/* The screenshot frame — a single Card, not a Card wrapped
                      around an inner surface: one border, one radius, nothing
                      matted around the art, and every one of those from the
                      design system's own surface and border tokens so the frame
                      stays neutral behind whatever lands in it. It holds its
                      footprint whether or not there's a screenshot in it, so
                      dropping one into `constants.ts` later swaps the contents
                      without moving a single step. p-0 so the image meets the
                      frame's own edge; object-contain rather than cover so a
                      screenshot of any ratio is letterboxed inside it instead
                      of being cropped. */}
                  <Card
                    size="sm"
                    className={cn(SCREENSHOT_ASPECT_CLASS, "mt-3 gap-0 overflow-hidden p-0")}
                  >
                    {step.screenshotSrc && (
                      <Image
                        src={step.screenshotSrc}
                        alt={step.screenshotAlt ?? ""}
                        width={1280}
                        height={800}
                        className="h-full w-full object-contain"
                      />
                    )}
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
