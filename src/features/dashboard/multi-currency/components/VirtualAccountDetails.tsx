"use client";

import { useState } from "react";
import { Button, Card, CardContent, IconButton, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { GlobalCurrenciesDialog } from "@/features/dashboard/multi-currency/components/GlobalCurrenciesDialog";
import {
  PaymentMethodInfoDialog,
  hasPaymentMethodInfo,
} from "@/features/dashboard/multi-currency/components/PaymentMethodInfoDialog";
import { buildFullAccountDetails } from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

interface VirtualAccountDetailsProps {
  account: VirtualAccount;
  onCopy: (account: VirtualAccount) => Promise<void> | void;
  onShare: (account: VirtualAccount) => void;
  /**
   * Where the account is named.
   *
   * - `"above"` (default) — a small uppercase caption above the card, for the
   *   Virtual Accounts page and the share modal, where the carousel/region
   *   list already carries the flag and the card is one of several stacked
   *   elements.
   * - `"inside"` — flag, account name and a "For clients in …" subtitle as the
   *   card's own first row, for MCA v2, where the card is the only thing in
   *   its column and has to identify itself.
   */
  headerPlacement?: "above" | "inside";
  /**
   * Whether the Share button (and its "Share a link or copy all fields for
   * your client" helper line) renders alongside Copy. Off for the
   * customer-facing embedded preview inside ShareAccountDetailsModal — a
   * customer receiving these details has nothing of their own to share, so
   * that copy/action would be talking to the wrong audience; Copy account
   * details becomes the sole, full-width action instead.
   */
  showShare?: boolean;
  /**
   * Reflows the field grid from three columns to two — every field still
   * shown, just regrouped into two columns instead of three. For the Virtual
   * Accounts page while the How it works panel is open beside this card:
   * `sm:` breakpoints key off the viewport, not this card's own shrunken
   * share of it, so without this the 3-column grid would still try to render
   * at full width and clip against the panel next to it.
   */
  collapsed?: boolean;
  /**
   * Where the Share/Copy button row sits relative to the field grid.
   *
   * - `"bottom"` (default) — after the fields, behind a divider and the
   *   "Share a link or copy all fields…" helper line. The original layout.
   * - `"top"` — right after the header, before the fields, with no helper
   *   line (the actions are already the first thing under the account name,
   *   nothing needs to introduce them). For a layout where the actions are
   *   meant to read as an immediate response to "which account is this",
   *   ahead of the fields a merchant copies individually only when the two
   *   buttons don't cover what they need.
   * - `"header"` — inline on the SAME row as the header, pushed to its right
   *   edge (`justify-between`), sized to their own content rather than
   *   stretched. Only meaningful with `headerPlacement="inside"` (there's no
   *   header row to share with otherwise); wraps onto its own row below the
   *   header once the card gets too narrow for both.
   */
  actionsPlacement?: "top" | "bottom" | "header";
  /**
   * Tightens the Card's own padding and internal gaps (header → fields step,
   * the field grid's row gap) for a layout where this card sits beside
   * something shorter it's meant to read close in height to. Off by default —
   * every other placement wants the roomier original rhythm.
   */
  dense?: boolean;
  /**
   * Grows the Card to fill whatever height its parent flex column makes
   * available, instead of sizing to its own content. For a layout where this
   * card is a CSS Grid item stretched to match a sibling column's height
   * (`items-stretch`) — without this, that stretch would only inflate the
   * invisible wrapper around the card, not the card's own visible border,
   * since a block child doesn't grow to fill a taller ancestor on its own.
   * The immediate parent must itself be `flex flex-col` for this to have
   * anywhere to grow into. Off by default — every other placement sizes to
   * its own content.
   */
  fillHeight?: boolean;
  /** Merged onto the Card — e.g. to override its default shrink-wrapped width. */
  className?: string;
}

/**
 * "See supported currencies", for the SWIFT catch-all only.
 *
 * Shared by both header placements rather than living in one of them: the
 * accounts page renders the header *above* the card and the shared page renders
 * it *inside*, and the link has to exist in both — it was originally attached to
 * the subtitle, which only the "inside" variant draws, so on the accounts page
 * there was no way to open the dialog at all.
 */
function SupportedCurrenciesLink({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-auto min-h-0 p-0 align-baseline text-[13px] font-medium text-primary hover:bg-transparent hover:underline"
      onClick={onClick}
    >
      See supported currencies
    </Button>
  );
}

/** "For clients in United States". Regions whose name is already the account
 *  name (Rest of the World) would read as "For clients in Rest of the World",
 *  so they get the region-neutral wording instead. */
function accountSubtitle(account: VirtualAccount) {
  return account.countryName === account.accountName
    ? "For clients in all other regions"
    : `For clients in ${account.countryName}`;
}

/**
 * Full details for whichever account is selected in the carousel above.
 * Sits directly on the page (no drawer/modal) so switching accounts reads as
 * this section updating in place, not navigating elsewhere.
 *
 * `w-fit` on the Card is deliberate: the three-column grid's columns size to
 * their own content (grid-cols-3 inside a shrink-wrapped container resolves
 * `fr` tracks by content, not by the page), so the card — and the action
 * buttons below it, which share its width — never stretch to the full page
 * width the way a plain `w-full` card would. `max-w-[730px]` caps how far
 * that natural sizing can grow.
 *
 * flux-ui's Card is itself a `flex flex-col` with a gap between its direct
 * children — CardContent, Separator, the helper text, and the button row all
 * sit directly inside it, so that gap is what sets the vertical rhythm here,
 * not per-element margins. `size="sm"` supplies the 28px padding every module
 * on the Transaction Details page uses; `gap-4` narrows its 24px default to
 * the 16px this card wants between divider → helper text → actions. The one
 * step that needs to be wider than that rhythm (header → metadata) adds its
 * own margin on top of the gap rather than fighting it.
 */
export function VirtualAccountDetails({
  account,
  onCopy,
  onShare,
  headerPlacement = "above",
  showShare = true,
  collapsed = false,
  actionsPlacement = "bottom",
  dense = false,
  fillHeight = false,
  className,
}: VirtualAccountDetailsProps) {
  const fields = buildFullAccountDetails(account);

  const [currenciesOpen, setCurrenciesOpen] = useState(false);
  const [methodInfoOpen, setMethodInfoOpen] = useState(false);

  // Header placement sizes both buttons to their own content instead of
  // stretching to fill the row — they're sharing that row with the header,
  // not taking the whole card's width the way "top"/"bottom" do.
  const inHeader = actionsPlacement === "header";

  const actionsRow = (
    <div
      className={cn(
        "flex gap-3",
        inHeader ? "shrink-0 flex-wrap justify-end" : cn("flex-col", showShare && "sm:flex-row")
      )}
      data-guide="mca-share-copy"
    >
      {showShare && (
        <Button
          variant="outline"
          className={cn(!inHeader && "flex-1")}
          leftIcon={<Icon name="share" className="h-4 w-4" />}
          onClick={() => onShare(account)}
        >
          Share
        </Button>
      )}
      <Button
        variant="primary"
        className={cn(!inHeader && (showShare ? "flex-1" : "w-full"))}
        leftIcon={<Icon name="copy" className="h-4 w-4" />}
        onClick={() => onCopy(account)}
      >
        Copy account details
      </Button>
    </div>
  );

  return (
    <section aria-live="polite" className={cn(fillHeight && "flex flex-1 flex-col")}>
      {headerPlacement === "above" && (
        <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {account.countryName} Account
          </h3>
          {/* The catch-all account's whole point is the 32 currencies it
              accepts, which is too many to name in the caption itself. */}
          {account.isGlobal && <SupportedCurrenciesLink onClick={() => setCurrenciesOpen(true)} />}
        </div>
      )}

      <Card
        size="sm"
        className={cn(
          "w-fit max-w-[730px]",
          dense ? "gap-3 py-6" : "gap-4",
          fillHeight && "flex-1",
          className
        )}
      >
        {headerPlacement === "inside" && (
          <div className={cn("flex flex-wrap items-center gap-3", inHeader && "justify-between")}>
            <div className="flex items-center gap-3">
              {/* Rectangular, matching RegionSelector and every table cell in
                  the product. CountryFlagAvatar (not CountryFlag) for its globe
                  fallback on regions with no flag on the CDN. */}
              <CountryFlagAvatar
                iso2={account.iso2}
                countryName={account.countryName}
                className="h-8 w-11 rounded-md"
              />
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground">
                  {account.accountName}
                </p>
                <p className="text-[13px] text-muted-foreground">
                  {accountSubtitle(account)}
                  {account.isGlobal && (
                    <>
                      {" "}
                      <SupportedCurrenciesLink onClick={() => setCurrenciesOpen(true)} />
                    </>
                  )}
                </p>
              </div>
            </div>

            {inHeader && actionsRow}
          </div>
        )}

        {actionsPlacement === "top" && (
          <>
            {actionsRow}
            <Separator />
          </>
        )}

        {/* mt-2 on top of the Card's own gap opens the header → metadata step
            to 24px (20px dense), a clear grouping break above a block whose
            internal rows are close together, without widening every other
            step in the card. Only needed where there is a header inside to
            separate. */}
        <CardContent className={cn(headerPlacement === "inside" && (dense ? "mt-1" : "mt-2"))}>
          {/* Label and value carry the same tokens the Transaction Details
              page's own detail fields use: the label sits a size down and
              muted, the value a size up at medium weight, so the value leads
              without the two competing. */}
          {/* Collapsed: forced 2 columns rather than the usual 3 — every
              field still renders, CSS grid auto-placement just regroups them
              two-per-row instead of three, so nothing here needs to change
              per field, only the track count. */}
          <dl
            className={cn(
              "grid grid-cols-1 gap-x-5 gap-y-3",
              collapsed ? "grid-cols-2" : "sm:grid-cols-3"
            )}
          >
            {fields.map((field) => (
              <div key={field.label} className="min-w-[160px] space-y-1">
                <dt className="text-[12px] text-muted-foreground">{field.label}</dt>
                <dd className="flex items-center gap-1.5 break-words text-[13px] font-medium text-foreground">
                  {field.value}
                  {/* Only the rail has an explainer behind it, and only for the
                      rails production wrote one for — so the affordance appears
                      exactly where there is something to open. */}
                  {field.label === "Payment Method" && hasPaymentMethodInfo(field.value) && (
                    <IconButton
                      aria-label={`What is ${field.value}?`}
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={() => setMethodInfoOpen(true)}
                    >
                      <Icon name="info" className="h-3.5 w-3.5" />
                    </IconButton>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>

        {actionsPlacement === "bottom" && (
          <>
            <Separator />

            {showShare && (
              <p className="text-[13px] text-muted-foreground">
                Share a link or copy all fields for your client.
              </p>
            )}

            {actionsRow}
          </>
        )}
      </Card>
      {account.isGlobal && (
        <GlobalCurrenciesDialog open={currenciesOpen} onOpenChange={setCurrenciesOpen} />
      )}

      <PaymentMethodInfoDialog
        paymentMethod={account.paymentMethod}
        open={methodInfoOpen}
        onOpenChange={setMethodInfoOpen}
      />
    </section>
  );
}
