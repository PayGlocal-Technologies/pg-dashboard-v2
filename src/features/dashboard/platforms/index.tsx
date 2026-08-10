"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
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
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, truncateMiddle } from "@/lib/utils";
import { CopyableText } from "@/components/common/CopyableText";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  SCREENSHOT_ASPECT_CLASS,
  SUPPORTED_PLATFORMS,
  accountsForPlatform,
  quickAccessFields,
} from "@/features/dashboard/platforms/constants";

/** Module title — the step below the page's own h1, shared by both columns.
 *  Same tokens the MCA v2 page uses, so the two read as one product. */
const MODULE_TITLE = "text-base font-semibold text-foreground";

/** Supporting copy under a module title, and secondary text inside a module. */
const MODULE_SUBTITLE = "text-[13px] text-muted-foreground";

/**
 * Platforms — how to point a PayGlocal virtual account at the marketplace or
 * freelancing platform that pays you.
 *
 * The page answers one question at a time: which platform, and in which
 * currency. The left column carries both the platform list and the documents a
 * merchant tends to need mid-setup; everything on the right — header, Quick
 * Access fields, the numbered walkthrough — is derived from the selected
 * platform and account, with no navigation between them.
 *
 * Nothing here is a new component. The rows are flux-ui Buttons in the same
 * ghost/secondary selected treatment RegionSelector uses, the copyable fields
 * are the product's own CopyableText, and the screenshot placeholders are
 * Cards. Content lives in `constants.ts`, so adding a platform or a screenshot
 * never touches this file.
 */
export function PlatformsFeature() {
  const platforms = SUPPORTED_PLATFORMS;

  // Exactly one platform is selected at all times — defaults to the first so
  // the tutorial column is populated on load, not only after a click.
  const [selectedPlatformId, setSelectedPlatformId] = useState(platforms[0]?.id ?? "");
  const selectedPlatform =
    platforms.find((p) => p.id === selectedPlatformId) ?? platforms[0] ?? null;

  // The currency selection is stored as an account id and *resolved* against
  // whichever platform is selected, rather than being reset by an effect when
  // the platform changes (see CLAUDE.md's no-setState-in-effect rule). A
  // currency both platforms support survives the switch; one the new platform
  // can't pay out in falls back to its first account instead of rendering
  // details for an account that isn't on offer.
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const accounts = selectedPlatform ? accountsForPlatform(selectedPlatform) : [];
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0] ?? null;

  if (!selectedPlatform) return null;

  return (
    <div className="mx-auto max-w-[1400px] page-enter">
      {/* mb-8 widens PageHeader's own mb-6 to the 32px this page puts between
          the page header and the first module — same step as MCA v2. */}
      <PageHeader
        title="Platforms"
        subtitle="Set up your PayGlocal virtual account on the platforms that pay you."
        className="mb-8"
      />

      {/* Fixed 288px sidebar, matching MCA v2's, with the tutorial taking
          whatever width is left. minmax(0,1fr) rather than 1fr so a long step
          instruction or a wide screenshot can't push the column past the
          viewport. Below `lg` the template drops out entirely and the two
          stack in DOM order: sidebar first, then the tutorial. */}
      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[288px_minmax(0,1fr)] lg:items-start">
        {/* ─── Sidebar ─────────────────────────────────────────────────── */}
        <div className="space-y-8">
          <div>
            <h2 className={MODULE_TITLE}>Select to view tutorial</h2>

            {/* p-3 rather than Card's own 28px inset: the rows carry their own
                horizontal padding, so the card only has to keep them clear of
                its edge. Same treatment as MCA v2's region card. */}
            <Card size="sm" className="mt-3 gap-0 p-3">
              <div
                className="space-y-1"
                role="list"
                aria-label="Select a platform to view its tutorial"
              >
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
                      // keeps every mark inside its footprint uncropped. Same
                      // treatment the Platforms v1 platform cards give it.
                      leftIcon={
                        <Image
                          src={platform.logoSrc}
                          alt=""
                          width={90}
                          height={60}
                          className="h-6 w-9 shrink-0 object-contain"
                        />
                      }
                      // Only on the selected row: it points at the tutorial
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

          <div>
            <h2 className={MODULE_TITLE}>Documents you might need</h2>

            {/* One card per document rather than rows inside a single card:
                each is its own action target, and the list is short enough that
                the extra separation reads as clarity, not clutter. */}
            <div className="mt-3 space-y-3">
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

        {/* ─── Tutorial ────────────────────────────────────────────────── */}
        {/* key remounts the column on every platform change so the fade
            replays on each switch, not just the first render. */}
        <section key={selectedPlatform.id} className="page-enter space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className={MODULE_TITLE}>Receive payments from {selectedPlatform.name}</h2>
              <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                Learn how to add your virtual account to {selectedPlatform.name}.
              </p>
            </div>

            {/* Picks which receiving account the whole column describes — Quick
                Access below reads straight off it. Only the currencies this
                platform can actually pay out in are offered. */}
            {selectedAccount && (
              <Select
                value={selectedAccount.id}
                onValueChange={(value) => setSelectedAccountId(value)}
              >
                <SelectTrigger className="w-[130px] shrink-0" aria-label="Receiving currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      <span className="flex items-center gap-2">
                        {/* A SWIFT-rail catch-all account has no single country
                            behind it, so it shows a globe instead of a flag —
                            same fallback the MCA link builder's currency
                            select uses. */}
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

          {selectedAccount && (
            <>
              {/* Quick Access — the three fields a merchant has to paste into
                  the platform, lifted out of the full account details so they
                  don't have to leave this page to find them.

                  Its own module: a Card carrying its title, its supporting
                  copy and its fields, on the same default surface the sidebar's
                  platform list and document cards use. That makes it the one
                  bounded object in this column — the steps below it are bare
                  instructions beside bare screenshot frames — so the page reads
                  as "here are your details, now here is what to do with them"
                  rather than as one undifferentiated run of content. */}
              <Card size="sm" className="gap-0 p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-0">
                  <div className="min-w-0 xl:w-[210px] xl:shrink-0">
                    <p className="text-[15px] font-semibold text-foreground">Quick Access</p>
                    <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                      Copy these details to set up PayGlocal on {selectedPlatform.name}.
                    </p>
                  </div>

                  <dl className="grid min-w-0 flex-1 gap-x-6 gap-y-4 sm:grid-cols-3">
                    {quickAccessFields(selectedAccount).map((field) => (
                      <div key={field.label} className="min-w-0 space-y-1.5">
                        <dt className="text-[12px] text-muted-foreground">{field.label}</dt>
                        <dd>
                          {/* The product's own copyable field. Tinted rather
                              than card-coloured now that a card sits behind it
                              — a white chip on a white surface would rely on
                              its border alone to read as something you act on.

                              Long identifiers are elided from the middle rather
                              than the end: the head says which bank and rail the
                              account is on, the tail is what a merchant checks
                              against the details they already hold, and the
                              middle carries neither. The full value is what gets
                              copied, what the tooltip names, and what a hover
                              reveals — see CopyableText's `displayValue`. */}
                          <CopyableText
                            value={field.value}
                            displayValue={truncateMiddle(field.value)}
                            className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 dark:bg-muted/20"
                            valueClassName="min-w-0 flex-1 truncate font-medium text-primary"
                          />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </Card>

              {/* The walkthrough itself. Instruction left, screenshot right,
                  every step the same shape so the sequence scans as one column
                  of art with a caption beside each frame. */}
              <ol className="space-y-8 pt-2">
                {selectedPlatform.steps.map((step, index) => (
                  <li
                    key={step.instruction}
                    className="grid gap-4 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:gap-8"
                  >
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-muted-foreground">
                        Step {index + 1}
                      </p>
                      <p className="mt-1.5 text-[15px] text-foreground">{step.instruction}</p>
                    </div>

                    {/* The screenshot frame — one Card, sized to the art, with
                        no tinted container wrapped around it. The frame is the
                        placeholder rather than something sitting inside a
                        placeholder, so a step is an instruction beside a single
                        surface, not a box within a box.

                        It holds its 16:10 footprint whether or not there's art
                        in it, so dropping a real screenshot into `constants.ts`
                        later swaps the contents without moving a single step.
                        p-0 hands the whole surface to the image; overflow-hidden
                        is what keeps it clipped to the Card's own radius.
                        object-contain rather than cover so a screenshot of any
                        ratio is letterboxed inside the frame instead of being
                        cropped. */}
                    <Card
                      size="sm"
                      className={cn(SCREENSHOT_ASPECT_CLASS, "gap-0 overflow-hidden p-0")}
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
            </>
          )}
        </section>
      </div>
    </div>
  );
}
