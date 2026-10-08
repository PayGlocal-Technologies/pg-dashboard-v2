"use client";

import { toast } from "sonner";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { MidGuard } from "@/components/common/MidGuard";
import { useApp } from "@/stores/useApp";
import { ManageMandatesTable } from "@/features/dashboard/manage-mandates/components/ManageMandatesTable";
import {
  MANAGE_MANDATES_FEATURE,
  MANAGE_MANDATES_NOT_ENABLED,
  MANAGE_MANDATES_PAGE_SUBTITLE,
  MANDATES_SUPPORT_EMAIL,
} from "@/features/dashboard/manage-mandates/constants";

/**
 * Manage Mandates, at /manage-mandates, gated as pg-dashboard gates it:
 *
 *  - A TRANSACTING_ADMIN always gets the page; anyone else needs
 *    MANAGE_MANDATES in `merchantEnabledProducts.paymentProducts`, else the
 *    product explainer with Contact us (pg-dashboard's EmptyEnableProduct).
 *  - A selected MID must be PA and carry the MANAGE_MANDATES feature, else
 *    MidGuard shows the standard "not available for this MID" view.
 */
export function ManageMandatesFeature() {
  const paymentProducts = useApp((s) => s.merchantEnabledProducts?.paymentProducts);
  const role = useApp((s) => s.profile?.role);
  const isEnabled =
    !!role?.includes("TRANSACTING_ADMIN") || !!paymentProducts?.includes(MANAGE_MANDATES_FEATURE);

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader title="Manage Mandates" subtitle={MANAGE_MANDATES_PAGE_SUBTITLE} />

      {isEnabled ? (
        <MidGuard productType="PA" feature={MANAGE_MANDATES_FEATURE}>
          <ManageMandatesTable />
        </MidGuard>
      ) : (
        <EmptyState
          title={MANAGE_MANDATES_NOT_ENABLED.title}
          description={MANAGE_MANDATES_NOT_ENABLED.description}
          className="rounded-xl border border-border bg-card"
          action={
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() =>
                void navigator.clipboard
                  .writeText(MANDATES_SUPPORT_EMAIL)
                  .then(() => toast.success("Support email copied to clipboard"))
                  .catch(() => toast.error("Couldn't copy to clipboard"))
              }
            >
              Contact us
            </Button>
          }
        />
      )}
    </div>
  );
}
