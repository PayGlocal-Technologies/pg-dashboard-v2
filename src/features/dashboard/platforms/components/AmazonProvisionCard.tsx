"use client";

import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PlaceholderState } from "@/components/common/PlaceholderState";

/**
 * What the Amazon platform shows a merchant who has no Amazon payout accounts
 * yet: the accounts are issued on request, so this is the request.
 *
 * Ported from pg-dashboard's AmazonProvisionCard, with its copy kept word for
 * word — the same one-line diagnosis, the same explanation of what setting the
 * account up gets them, and the same "Get Amazon Account" call to action.
 * Production used to drop Amazon out of the platform list entirely in this
 * state, which left a merchant who *wanted* an Amazon account with nothing to
 * click; the row now stays and carries this card instead.
 *
 * The card takes the slot the account details and the connect steps occupy,
 * because neither of those can say anything until an account exists.
 */
export function AmazonProvisionCard({
  onProvision,
  isProvisioning,
}: {
  onProvision: () => void;
  isProvisioning: boolean;
}) {
  return (
    <Card size="sm" className="items-center justify-center px-7 py-10">
      <PlaceholderState
        variant="no-data"
        title="Your Amazon account isn't set up yet"
        description="Set up your Amazon virtual account to start receiving marketplace payouts directly into your Multi-Currency Account."
        // The illustration and copy already sit in a padded card, so the
        // placeholder's own padding is trimmed rather than doubled up.
        className="px-0 py-0"
        action={
          <Button
            variant="primary"
            size="md"
            rightIcon={<Icon name="arrow-right" className="h-4 w-4" />}
            isLoading={isProvisioning}
            onClick={onProvision}
          >
            Get Amazon Account
          </Button>
        }
      />
    </Card>
  );
}
