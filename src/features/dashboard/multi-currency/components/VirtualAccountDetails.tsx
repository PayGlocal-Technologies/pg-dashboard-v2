"use client";

import { Button, Card, CardContent, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
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
  /** Merged onto the Card — e.g. to override its default shrink-wrapped width. */
  className?: string;
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
 * flux-ui's Card is itself a `flex flex-col` with a `gap-10` (40px) default
 * between its direct children — CardContent, Separator, the helper text, and
 * the button row all sit directly inside it, so that default gap was what
 * actually set the vertical rhythm here, not per-element margins. Overriding
 * it to `gap-4` on the Card is the one place that spacing needs to change;
 * adding margins back on the individual elements would only double up with it.
 */
export function VirtualAccountDetails({
  account,
  onCopy,
  onShare,
  headerPlacement = "above",
  className,
}: VirtualAccountDetailsProps) {
  const fields = buildFullAccountDetails(account);

  return (
    <section aria-live="polite">
      {headerPlacement === "above" && (
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {account.countryName} Account
        </h3>
      )}

      <Card className={cn("w-fit max-w-[730px] gap-4 px-6 py-6", className)}>
        {headerPlacement === "inside" && (
          <div className="flex items-center gap-3">
            <CountryFlagAvatar
              iso2={account.iso2}
              countryName={account.countryName}
              className="h-10 w-10"
            />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-foreground">
                {account.accountName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{accountSubtitle(account)}</p>
            </div>
          </div>
        )}

        <CardContent>
          <dl className="grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-3">
            {fields.map((field) => (
              <div key={field.label} className="min-w-[160px] space-y-1">
                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                <dd className="break-words text-sm font-semibold text-foreground">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>

        <Separator />

        <p className="text-xs text-muted-foreground">
          Share a link or copy all fields for your client.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1"
            leftIcon={<Icon name="share" className="h-4 w-4" />}
            onClick={() => onShare(account)}
          >
            Share
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            leftIcon={<Icon name="copy" className="h-4 w-4" />}
            onClick={() => onCopy(account)}
          >
            Copy account details
          </Button>
        </div>
      </Card>
    </section>
  );
}
