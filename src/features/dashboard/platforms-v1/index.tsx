"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  IconButton,
  PageHeader,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { ShareAccountDetailsModal } from "@/features/dashboard/multi-currency/components/ShareAccountDetailsModal";
import { VirtualAccountDetails } from "@/features/dashboard/multi-currency/components/VirtualAccountDetails";
import { formatFullAccount } from "@/features/dashboard/multi-currency/utils";
import {
  SUPPORTED_PLATFORMS,
  accountsForPlatform,
} from "@/features/dashboard/platforms/constants";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

/** Module title — the step below the page's own h1, shared by every module
 *  here. Same tokens MCA v2 and Platforms use, so the three read as one
 *  product. */
const MODULE_TITLE = "text-base font-semibold text-foreground";

/** Supporting copy under a module title, and secondary text inside a module. */
const MODULE_SUBTITLE = "text-[13px] text-muted-foreground";

/**
 * Footprint every step's screenshot frame holds, art or no art.
 *
 * Wider than the 16:10 the sidebar-layout Platforms page reserves, because a
 * screenshot here spans the full content width rather than sharing a row with
 * its instruction — at 16:10 a single step would fill more than a viewport.
 * Reserving the ratio now is what lets a real screenshot drop into
 * `constants.ts` later without the step sequence reflowing.
 */
const STEP_SCREENSHOT_ASPECT_CLASS = "aspect-[16/7] w-full";

/**
 * Platforms v1 — the same walkthrough content as the Platforms page, laid out
 * top-down instead of side-by-side.
 *
 * The page reads as one funnel: pick a platform, pick the currency you want to
 * be paid in, read the receiving account those two resolve to, then follow the
 * numbered steps that put that account on the platform. Documents sit beside
 * the account details as the one supporting aside, because that is where a
 * merchant reaches for them — mid-setup, not before it.
 *
 * Nothing here is a new component. The platform row is a flux-ui RadioGroup of
 * Cards (the treatment the Virtual Accounts carousel uses), the account module
 * is Multi Currency Accounts' own VirtualAccountDetails, and every screenshot
 * frame is a Card. Content lives in `@/features/dashboard/platforms/constants`,
 * shared with the Platforms page, so a new platform or a new screenshot is one
 * data change that lands on both pages at once.
 */
export function PlatformsV1Feature() {
  const platforms = SUPPORTED_PLATFORMS;

  // Exactly one platform is selected at all times — defaults to Amazon (the
  // first entry) so the account, documents and steps are populated on load,
  // not only after a click.
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

  const [shareModalOpen, setShareModalOpen] = useState(false);

  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("Couldn't copy to clipboard");
    }
  };

  const handleCopyAccount = (account: VirtualAccount) =>
    copyToClipboard(formatFullAccount(account), `${account.countryName} account details copied`);

  /**
   * Uses the OS share sheet where the browser exposes one, and falls back to
   * putting the same text on the clipboard elsewhere — identical to the
   * Virtual Accounts page's own fallback.
   */
  const handleShareAccount = async (account: VirtualAccount) => {
    const text = formatFullAccount(account);
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: `${account.countryName} Account`, text });
        return;
      } catch {
        // User dismissed the sheet, or the browser refused — fall through to copy.
      }
    }
    await copyToClipboard(text, "Account details copied — ready to send to your client");
  };

  if (!selectedPlatform) return null;

  return (
    <div className="mx-auto max-w-[1400px] page-enter">
      {/* mb-8 widens PageHeader's own mb-6 to the 32px this page puts between
          the page header and the first module — same step as MCA v2. */}
      <PageHeader
        title="Platforms v1"
        subtitle="Connect your PayGlocal receiving account to the platforms that pay you."
        className="mb-8"
      />

      {selectedAccount && (
        <ShareAccountDetailsModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          account={selectedAccount}
          accounts={accounts}
          onCopyLink={(url) => copyToClipboard(url, "Link copied")}
          onCopyFullAccount={handleCopyAccount}
          onShareFullAccount={(account) => void handleShareAccount(account)}
        />
      )}

      {/* space-y-8 is the module → module step for the page's three bands:
          platform selection, the account/documents row, and the walkthrough. */}
      <div className="space-y-8">
        {/* ─── Platform selection ──────────────────────────────────────── */}
        <section>
          <h2 className={MODULE_TITLE}>Select a platform</h2>
          <p className={cn(MODULE_SUBTITLE, "mt-1")}>
            Choose the platform you want to receive payouts from.
          </p>

          {/* One horizontal row at any width: overflow-x-auto plus shrink-0
              cards keeps every platform on one line and lets the row scroll
              rather than wrap into a ragged grid on a narrow viewport — the
              same treatment the Virtual Accounts carousel uses. p-1 keeps
              overflow-x-auto (which per the CSS overflow spec also clips the
              vertical axis) from cutting the selected card's ring. */}
          <RadioGroup
            value={selectedPlatform.id}
            onValueChange={setSelectedPlatformId}
            aria-label="Select a platform"
            className="scrollbar-none mt-4 flex gap-3 overflow-x-auto p-1"
          >
            {platforms.map((platform) => {
              const isSelected = platform.id === selectedPlatform.id;
              return (
                <Card
                  key={platform.id}
                  size="sm"
                  role="button"
                  tabIndex={0}
                  aria-current={isSelected}
                  onClick={() => setSelectedPlatformId(platform.id)}
                  // A mouse click on the card — or on the RadioGroupItem
                  // nested inside it — would otherwise leave that element
                  // holding browser focus after selection, showing a focus
                  // ring nobody asked for. preventDefault suppresses only
                  // that mouse-click focus; Tab/Enter/Space are untouched.
                  onMouseDown={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedPlatformId(platform.id);
                    }
                  }}
                  className={cn(
                    "w-[200px] shrink-0 cursor-pointer gap-0 p-4 transition-[box-shadow,border-color] duration-150 hover:shadow-md",
                    isSelected && "border-primary ring-2 ring-primary"
                  )}
                >
                  <CardContent className="flex min-w-0 items-center gap-3">
                    {/* Radio indicator, not a separate control — the card
                        itself is the click target (onClick/role/tabIndex
                        above); this reflects that state and, because it sits
                        inside the RadioGroup, selects the same platform when
                        clicked directly. */}
                    <RadioGroupItem
                      value={platform.id}
                      aria-label={`Select ${platform.name}`}
                      className="shrink-0"
                    />
                    <Icon name={platform.logo} className="shrink-0 text-[22px]" />
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
          </RadioGroup>
        </section>

        {/* Everything below is derived from the selected platform. key
            remounts it on every platform change so the fade replays on each
            switch, not just the first render. */}
        <div key={selectedPlatform.id} className="page-enter space-y-8">
          {/* ─── Currency ───────────────────────────────────────────────── */}
          {selectedAccount && (
            <Select value={selectedAccount.id} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-[140px]" aria-label="Receiving currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <span className="flex items-center gap-2">
                      {/* A SWIFT-rail catch-all account has no single country
                          behind it, so it shows a globe instead of a flag —
                          same fallback the MCA link builder's currency select
                          uses. */}
                      {account.iso2 === "ROW" ? (
                        <Icon name="globe" className="h-3.5 w-5 shrink-0 text-muted-foreground" />
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

          {/* ─── Account details + documents ─────────────────────────────── */}
          {/* Account details lead and take whatever width is left; documents
              sit in a fixed 320px column beside them, wide enough for a
              two-line card and narrow enough to read as the aside it is.
              Below `lg` the template drops out and the two stack in DOM order:
              account details first, documents under them.

              Explicit col-start/row-start rather than one wrapper div per
              column — the same placement technique MCA v2's two-column grid
              uses. Row 1 carries both module titles, so row 2 is where both
              cards begin: their top edges land on each other whatever height
              the taller title block resolves to. */}
          <div className="grid gap-x-8 gap-y-3 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            {selectedAccount && (
              <>
                <div className="lg:col-start-1 lg:row-start-1">
                  <h2 className={MODULE_TITLE}>
                    Receive payments from {selectedPlatform.name}
                  </h2>
                  <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                    Use these details when {selectedPlatform.name} asks for your bank account.
                  </p>
                </div>

                {/* Same Account Details card Multi Currency Accounts, MCA v2
                    and the share modal render — `inside` moves the flag, name
                    and subtitle into the card (nothing else on this row names
                    the account), and the width override drops its default
                    shrink-wrapping so it fills the column. */}
                <VirtualAccountDetails
                  account={selectedAccount}
                  onCopy={handleCopyAccount}
                  onShare={() => setShareModalOpen(true)}
                  headerPlacement="inside"
                  className="w-full max-w-none lg:col-start-1 lg:row-start-2"
                />
              </>
            )}

            <div className="lg:col-start-2 lg:row-start-1">
              <h2 className={MODULE_TITLE}>Documents you might need</h2>
              <p className={cn(MODULE_SUBTITLE, "mt-1")}>
                Statements {selectedPlatform.name} may ask you for.
              </p>
            </div>

            {/* One card per document rather than rows inside a single card:
                each is its own action target, and the list is short enough
                that the extra separation reads as clarity, not clutter. */}
            <div className="space-y-3 lg:col-start-2 lg:row-start-2">
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

          {/* ─── Connection steps ───────────────────────────────────────── */}
          <section>
            <h2 className={MODULE_TITLE}>Connect your account to {selectedPlatform.name}</h2>
            <p className={cn(MODULE_SUBTITLE, "mt-1")}>
              Follow these steps in {selectedPlatform.name} to start receiving payouts.
            </p>

            {/* Step number → instruction → screenshot, in that order, every
                step the same shape so the sequence scans as one column. */}
            <ol className="mt-6 space-y-10">
              {selectedPlatform.steps.map((step, index) => (
                <li key={step.instruction}>
                  <p className="text-[12px] font-medium text-muted-foreground">Step {index + 1}</p>
                  <p className="mt-1 text-[15px] font-medium text-foreground">
                    {step.instruction}
                  </p>

                  {/* The screenshot frame. It holds its footprint whether or
                      not there's art in it, so dropping a real screenshot into
                      `constants.ts` later swaps the contents without moving a
                      single step. object-contain rather than cover so a
                      screenshot of any ratio is letterboxed inside the frame
                      instead of being cropped. */}
                  <Card
                    size="sm"
                    className="mt-4 gap-0 overflow-hidden border-transparent bg-muted/45 p-3 shadow-none dark:bg-muted/25"
                  >
                    <div
                      className={cn(
                        STEP_SCREENSHOT_ASPECT_CLASS,
                        "overflow-hidden rounded-lg border border-border bg-card"
                      )}
                    >
                      {step.screenshotSrc && (
                        <Image
                          src={step.screenshotSrc}
                          alt={step.screenshotAlt ?? ""}
                          width={1280}
                          height={560}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
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
