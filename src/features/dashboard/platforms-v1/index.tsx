"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
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
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  SUPPORTED_PLATFORMS,
  accountsForPlatform,
} from "@/features/dashboard/platforms/constants";

/** Module title — the step below the page's own h1, shared by every module
 *  here. Same tokens MCA v2 and Platforms use, so the three read as one
 *  product. */
const MODULE_TITLE = "text-base font-semibold text-foreground";

/** Supporting copy under a module title, and secondary text inside a module. */
const MODULE_SUBTITLE = "text-[13px] text-muted-foreground";

/**
 * Footprint every step's screenshot frame holds, art or no art.
 *
 * 5:3 — taller than a wide banner crop, so a screenshot of a real settings
 * page has room for its vertical content, and still short enough that a step
 * and its art read as one unit on screen. Reserving the ratio now is what lets
 * a real screenshot drop into `constants.ts` later without the step sequence
 * reflowing.
 */
const STEP_SCREENSHOT_ASPECT_CLASS = "aspect-[5/3] w-full";

/**
 * Platforms v1 — the walkthrough for pointing a PayGlocal receiving account at
 * the marketplace or freelancing platform that pays you.
 *
 * The page reads as one funnel: pick a platform, pick the currency you're being
 * paid in where the platform lets you choose, then work down the numbered
 * steps. Documents sit beside the walkthrough as the one supporting aside,
 * because that is where a merchant reaches for them — mid-setup, not before it.
 *
 * Nothing here is a new component. The platform row is a list of flux-ui Cards
 * in the selected treatment the Virtual Accounts carousel uses, the currency
 * control is flux-ui's Select, and every screenshot frame is a Card. Content
 * lives in `@/features/dashboard/platforms/constants`, shared with the
 * Platforms page, so a new platform or a new screenshot is one data change that
 * lands on both pages at once.
 */
export function PlatformsV1Feature() {
  const platforms = SUPPORTED_PLATFORMS;

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
  const accounts = selectedPlatform ? accountsForPlatform(selectedPlatform) : [];
  const selectedAccount =
    (selectedPlatform?.offersCurrencyChoice
      ? accounts.find((a) => a.id === selectedAccountId)
      : undefined) ??
    accounts[0] ??
    null;

  if (!selectedPlatform) return null;

  return (
    <div className="mx-auto max-w-[1400px] page-enter">
      {/* No margin override: PageHeader's own mb-6 is the step this page wants
          between the description and the platform cards. The 32px other pages
          add on top of it opens a gap wide enough that the cards read as their
          own block rather than as the header's answer. Title → subtitle stays
          the component's own mt-0.5, the tightest step on the page. */}
      <PageHeader
        title="Platforms v1"
        subtitle="Connect your PayGlocal receiving account to the platforms that pay you."
      />

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
          <div className="grid gap-x-8 gap-y-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
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

              {/* Only on platforms that actually let the merchant choose which
                  account they're paid into — Amazon, today, where the
                  walkthrough is per marketplace. Elsewhere there's a single
                  account behind the steps, and a dropdown that can't change
                  anything would read as a decision the merchant still has to
                  make. */}
              {selectedPlatform.offersCurrencyChoice && selectedAccount && (
                <Select value={selectedAccount.id} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-[140px] shrink-0" aria-label="Receiving currency">
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
                          {account.currency}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Step number → instruction → screenshot, in that order, every
                step the same shape so the sequence scans as one column.

                space-y-8 between steps against the 12px that holds an
                instruction to its own screenshot: a step and its art sit
                closer to each other than any step does to the next one, which
                is what gives the sequence its rhythm rather than reading as
                six evenly spaced blocks. No top margin — the grid's row gap
                above already places this against the title block. */}
            <ol className="space-y-8 lg:col-start-1 lg:row-start-2">
              {selectedPlatform.steps.map((step, index) => (
                <li key={step.instruction}>
                  <p className="text-[12px] font-medium text-muted-foreground">Step {index + 1}</p>
                  <p className="mt-1 text-[15px] font-medium text-foreground">
                    {step.instruction}
                  </p>

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
                    className={cn(
                      STEP_SCREENSHOT_ASPECT_CLASS,
                      "mt-3 gap-0 overflow-hidden p-0"
                    )}
                  >
                    {step.screenshotSrc && (
                      <Image
                        src={step.screenshotSrc}
                        alt={step.screenshotAlt ?? ""}
                        width={1280}
                        height={768}
                        className="h-full w-full object-contain"
                      />
                    )}
                  </Card>
                </li>
              ))}
            </ol>

            {/* mt-6 only below `lg`, where the grid has collapsed to one
                column and this heading follows the last screenshot: on top of
                the 16px row gap it makes the same 40px section break the
                platform row gets, so the documents don't read as a seventh
                step. At `lg` the two columns are side by side and the row
                placement handles it. */}
            <div className="mt-6 lg:col-start-2 lg:row-start-1 lg:mt-0">
              <h2 className={MODULE_TITLE}>Documents you might need</h2>
              <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                Statements {selectedPlatform.name} may ask you for.
              </p>
            </div>

            {/* One card per document rather than rows inside a single card:
                each is its own action target. space-y-2 is the tightest step
                on the page: each card already carries its own border, so 8px
                is enough to separate them, and holding the pair that close is
                what makes the documents read as one compact aside rather than
                as a second column of content competing with the steps. */}
            <div className="space-y-2 lg:col-start-2 lg:row-start-2">
              {selectedPlatform.documents.map((doc) => (
                <Card
                  key={doc.title}
                  size="sm"
                  className="flex-row items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-muted-foreground">{doc.caption}</p>
                    <p className="truncate text-[13px] font-medium text-foreground">{doc.title}</p>
                  </div>
                  {/* Placeholder until the document endpoints exist — the same
                      stand-in treatment MCA v2 gives its proof-of-ownership
                      download. */}
                  <IconButton
                    aria-label={doc.actionLabel}
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => toast.info(`${doc.title} will be available soon`)}
                  >
                    <Icon name={doc.actionIcon} className="h-4 w-4" />
                  </IconButton>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
