"use client";

import { Button } from "@/components/ui";
import { EnableProductAction, FeatureBanner } from "@/components/common/FeatureBanner";

/**
 * Static Link's banner, shown until the merchant has a link of their own:
 *
 * - no link on this account (PayGlocal hasn't provisioned one), "Enable it
 *   now", which hands them the support address;
 * - a link that hasn't been set up yet, "Edit Static Link", which opens the
 *   editor where it is named, given its details and switched on.
 *
 * Once the link is set up the page shows the link card instead (see
 * StaticLinkFeature).
 */
export function StaticLinkBanner({
  canEdit,
  onEdit,
}: {
  /** A link exists to set up; false when the account has none yet. */
  canEdit: boolean;
  onEdit: () => void;
}) {
  return (
    <FeatureBanner
      imageSrc="/assets/banner-states/static-link.webp"
      title="One link. Multiple payments."
      description="Share one permanent payment link with your customers and collect payments whenever they're ready."
      action={
        canEdit ? (
          <Button type="button" variant="primary" size="sm" onClick={onEdit}>
            Edit Static Link
          </Button>
        ) : (
          <EnableProductAction product="Static Link" />
        )
      }
    />
  );
}
