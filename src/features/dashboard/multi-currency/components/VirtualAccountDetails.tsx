"use client";

import { Button, Card, CardContent, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { buildFullAccountDetails } from "@/features/dashboard/multi-currency/utils";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

interface VirtualAccountDetailsProps {
  account: VirtualAccount;
  onCopy: (account: VirtualAccount) => Promise<void> | void;
  onShare: (account: VirtualAccount) => void;
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
 * width the way a plain `w-full` card would.
 */
export function VirtualAccountDetails({ account, onCopy, onShare }: VirtualAccountDetailsProps) {
  const fields = buildFullAccountDetails(account);

  return (
    <section aria-live="polite">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {account.countryName} Account
      </h3>

      <Card className="w-fit max-w-full px-6 py-6">
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

        <Separator className="my-5" />

        <p className="mb-3 text-xs text-muted-foreground">
          Share a link or copy all fields for your client.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            variant="primary"
            className="flex-1"
            leftIcon={<Icon name="copy" className="h-4 w-4" />}
            onClick={() => onCopy(account)}
          >
            Copy account details
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            leftIcon={<Icon name="share" className="h-4 w-4" />}
            onClick={() => onShare(account)}
          >
            Share
          </Button>
        </div>
      </Card>
    </section>
  );
}
