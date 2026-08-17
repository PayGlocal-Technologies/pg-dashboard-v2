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
 * The workflow's own title — one step above the section titles beneath it, so
 * the right column reads as a named workflow containing three parts rather than
 * four peers.
 */
const WORKFLOW_TITLE = "text-lg font-semibold text-foreground";

/** Section title inside the workflow: Documents, Steps, and the account
 *  accordion's own trigger. Same tokens MCA v2 and Platforms v1 use for a
 *  module title, so the three pages read as one product. */
const MODULE_TITLE = "text-base font-semibold text-foreground";

/** Supporting copy under a title, and secondary text inside a section. */
const MODULE_SUBTITLE = "text-[13px] text-muted-foreground";

/**
 * Caption over the platform navigation. Deliberately a size below the workflow
 * titles and muted: the navigation is how you get to the content, not content
 * itself, and this is the same treatment the Virtual Accounts details card gives
 * its own above-card caption.
 */
const SIDEBAR_LABEL = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground";

/**
 * Platforms — how to point a PayGlocal receiving account at the marketplace or
 * freelancing platform that pays you.
 *
 * Two columns: the platform navigation on the left, and that platform's whole
 * connection workflow on the right. The workflow itself reads top-down as one
 * funnel — name the platform and storefront, check the account those resolve
 * to, collect the documents you'll be asked for, then work down the numbered
 * steps. Sections are separated by space rather than rules, and each sits
 * closer to the parts it owns than to the section next to it, so the steps stay
 * the page's subject and everything above them reads as their preparation.
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
          every width. Below `lg` the template drops out entirely and the two
          stack in DOM order: platform control first, then the workflow. */}
      <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start">
        {/* ─── Platform navigation ─────────────────────────────────────── */}
        <div className="lg:col-start-1">
          <h2 className={SIDEBAR_LABEL}>Select platform</h2>

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
                        // `secondary` already carries the selected surface; the
                        // primary tint on top is what makes the selected
                        // platform readable at a glance in a list where every
                        // row shares the same shape.
                        isSelected && "text-primary font-semibold"
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

            space-y-10 is the section step — the largest on the page, and wider
            than the 32px between two steps inside the Steps section, which is
            what §8's "larger between sections, tighter within" resolves to. No
            rules anywhere: space alone separates the four sections. */}
        <div key={selectedPlatform.id} className="page-enter space-y-10 lg:col-start-2">
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
                <h2 className={WORKFLOW_TITLE}>
                  Connect your account to {selectedPlatform.name}
                </h2>
                <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                  Follow these steps in {selectedPlatform.name} to start receiving payouts.
                </p>
              </div>

              {/* Only on platforms that run more than one storefront — Amazon,
                  today. Elsewhere there's a single account behind the steps,
                  and a dropdown that can't change anything would read as a
                  decision the merchant still has to make. */}
              {selectedMarketplace && marketplaces.length > 1 && (
                <Select value={selectedMarketplace.id} onValueChange={setSelectedMarketplaceId}>
                  {/* Wide enough for the longest storefront the options carry
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
              supplies the disclosure and the rotating chevron; `collapsible` is
              what lets the only item be closed, which is the state it opens in.
              Its trigger is the section's own title, so there's no separate
              heading above it to say the same thing twice.

              Read-only by design: no Share or Copy actions, so it stays
              subordinate to the walkthrough rather than becoming a second thing
              to act on. The values are `buildFullAccountDetails` — the same
              builder the Virtual Accounts card, the share modal and Platforms
              v1's own panel render, so these fields can't drift from the ones
              the rest of the product shows, and they follow the platform and
              marketplace selections above.

              px-5 py-0 rather than Card's own inset: the trigger and content
              carry their own vertical padding, so the card only has to hold
              them clear of its side edges — anything more and the collapsed row
              sits adrift inside its own surface. */}
          {selectedAccount && (
            <Card size="sm" className="gap-0 px-5 py-0">
              <Accordion type="single" collapsible>
                <AccordionItem value="account-details" className="border-b-0">
                  {/* Named for the payer: these are the details someone in that
                      country pays into, and saying so is what confirms the
                      marketplace choice above landed. */}
                  <AccordionTrigger className={MODULE_TITLE}>
                    Account details for payers in {selectedAccount.countryName}
                  </AccordionTrigger>
                  <AccordionContent>
                    {/* Label above value, in the same tokens the Virtual
                        Accounts details card uses. space-y-1 inside a field
                        against the grid's own gaps is what keeps each label
                        bound to its own value. */}
                    <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                      {buildFullAccountDetails(selectedAccount).map((field) => (
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

          {/* ─── 3. Documents you might need ──────────────────────────── */}
          {/* The other half of the preparation, and the last thing before the
              instructions begin. Separated from the account panel above by
              space only — no rule. */}
          <section>
            <h2 className={MODULE_TITLE}>Documents you might need</h2>
            <p className={cn(MODULE_SUBTITLE, "mt-1")}>
              Statements {selectedPlatform.name} may ask you for.
            </p>

            {/* One card per document rather than rows inside a single card:
                each is its own action target. Side by side in equal columns
                from `sm` up — they shrink together on a tablet rather than one
                dropping under the other — and stacked below it, where two cards
                on one line would truncate their own titles. */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {selectedPlatform.documents.map((doc) => (
                // The whole card is the target, not just the icon: the card
                // carries one action, so anywhere on it should trigger it
                // rather than asking for a hit on a 32px button. role/tabIndex
                // and the Enter/Space handler are what make that reachable by
                // keyboard too; the accessible name comes from the card's own
                // caption and title text.
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
                    <p className="truncate text-[12px] text-muted-foreground">{doc.caption}</p>
                    <p className="truncate text-[13px] font-medium text-foreground">{doc.title}</p>
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
            <h2 className={MODULE_TITLE}>Steps</h2>

            {/* Step number → instruction → screenshot, in that order, every
                step the same shape so the sequence scans as one column.

                space-y-8 between steps against the 12px that holds an
                instruction to its own screenshot: a step and its art sit closer
                to each other than any step does to the next one, which is what
                gives the sequence its rhythm rather than reading as six evenly
                spaced blocks. */}
            <ol className="mt-4 space-y-8">
              {selectedPlatform.steps.map((step, index) => (
                <li key={step.instruction}>
                  <p className="text-[12px] font-medium text-muted-foreground">Step {index + 1}</p>
                  <p className="mt-1 text-[15px] font-medium text-foreground">{step.instruction}</p>

                  {/* The screenshot frame — a single Card, not a Card wrapped
                      around an inner surface: one border, one radius, nothing
                      matted around the art. It holds its footprint whether or
                      not there's a screenshot in it, so dropping one into
                      `constants.ts` later swaps the contents without moving a
                      single step. p-0 so the image meets the frame's own edge;
                      object-contain rather than cover so a screenshot of any
                      ratio is letterboxed inside it instead of being cropped. */}
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
