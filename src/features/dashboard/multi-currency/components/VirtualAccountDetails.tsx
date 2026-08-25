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
   * Collapses the field grid from three columns to two (hiding the third —
   * Bank Name / Beneficiary Address on most accounts) and shows a `»` icon
   * beside the header that restores the full layout. For the Virtual
   * Accounts page while the How it works panel is open beside this card:
   * `sm:` breakpoints key off the viewport, not this card's own shrunken
   * share of it, so without this the 3-column grid would still try to render
   * at full width and clip against the panel next to it. Has no effect
   * unless `onExpand` is also given, since collapsing without a way back out
   * would strand the merchant on a narrower card forever.
   */
  collapsed?: boolean;
  /** Called when the `»` restore icon is clicked. Only rendered while
   *  `collapsed`. */
  onExpand?: () => void;
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
  onExpand,
  className,
}: VirtualAccountDetailsProps) {
  const fields = buildFullAccountDetails(account);

  const [currenciesOpen, setCurrenciesOpen] = useState(false);
  const [methodInfoOpen, setMethodInfoOpen] = useState(false);

  return (
    <section aria-live="polite">
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

      <Card size="sm" className={cn("w-fit max-w-[730px] gap-4", className)}>
        {headerPlacement === "inside" && (
          <div className="flex items-start justify-between gap-3">
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

            {/* Restores the full 3-column layout — the only way back out of
                `collapsed`, so it only renders alongside a handler for it.
                -mr-2 -mt-1 cancels the button's own padding, the same trick
                "How it works?" uses beside this card, so the glyph sits flush
                with the card's corner rather than adrift of it. */}
            {collapsed && onExpand && (
              <IconButton
                aria-label="Show full account details"
                variant="ghost"
                size="sm"
                className="-mr-2 -mt-1 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={onExpand}
              >
                <Icon name="chevrons-right" className="h-4 w-4" />
              </IconButton>
            )}
          </div>
        )}

        {/* mt-2 on top of the Card's own gap-4 opens the header → metadata
            step to 24px, a clear grouping break above a block whose internal
            rows are 24px apart, without widening every other step in the
            card. Only needed where there is a header inside to separate. */}
        <CardContent className={cn(headerPlacement === "inside" && "mt-2")}>
          {/* Label and value carry the same tokens the Transaction Details
              page's own detail fields use: the label sits a size down and
              muted, the value a size up at medium weight, so the value leads
              without the two competing. */}
          {/* Collapsed: forced 2 columns, plus every 3rd field (in source
              order — the same order the 3-column layout would have placed
              in its own third column) hidden via nth-child. Since a hidden
              item drops out of grid auto-placement entirely, the remaining
              two-per-original-row survive intact rather than reflowing into
              a denser 2-column pack of every field. */}
          <dl
            className={cn(
              "grid grid-cols-1 gap-x-5 gap-y-3",
              collapsed ? "grid-cols-2 [&>*:nth-child(3n)]:hidden" : "sm:grid-cols-3"
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

        <Separator />

        {showShare && (
          <p className="text-[13px] text-muted-foreground">
            Share a link or copy all fields for your client.
          </p>
        )}

        <div className={cn("flex flex-col gap-3", showShare && "sm:flex-row")}>
          {showShare && (
            <Button
              variant="outline"
              className="flex-1"
              leftIcon={<Icon name="share" className="h-4 w-4" />}
              onClick={() => onShare(account)}
            >
              Share
            </Button>
          )}
          <Button
            variant="primary"
            className={cn(showShare ? "flex-1" : "w-full")}
            leftIcon={<Icon name="copy" className="h-4 w-4" />}
            onClick={() => onCopy(account)}
          >
            Copy account details
          </Button>
        </div>
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
