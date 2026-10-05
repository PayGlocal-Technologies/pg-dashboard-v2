"use client";

import { useRouter } from "next/navigation";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { useUrlAction } from "@/lib/hooks/useUrlAction";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { InvoiceLinkTable } from "@/features/dashboard/invoice-links/components/InvoiceLinkTable";
import { INVOICE_LINKS_FEATURE } from "@/features/dashboard/invoice-links/constants";
import { useInvoiceLinksEnabled } from "@/features/dashboard/invoice-links/hooks";

/**
 * Invoice Links, at /invoice-links.
 *
 * This is pg-dashboard's `McaPaymentInvoiceLinks` with `page="INVOICE"` — the
 * third mode of the component that also backs /mca-links ("MCA") and
 * /payment-links ("PAYMENT"). It is a **PA** product: `midMap.INVOICE` is
 * `paMids`, so it is scoped and guarded exactly like the PA transaction
 * surfaces, not like the PACB ones.
 *
 * It is not MCA Invoices. See types.ts.
 *
 * Gated the way pg-dashboard gates it, in two independent steps:
 *
 *  - the merchant must have INVOICE_LINKS in `merchantEnabledProducts
 *    .paymentProducts`, else the page explains the product instead of
 *    rendering a table (upstream's EmptyEnableProduct);
 *  - a selected MID must be PA and carry the INVOICE_LINKS feature, else
 *    MidGuard shows the standard "not available for this MID" view
 *    (upstream's useFeatureApplicable → NoFeatureView).
 *
 * There are no IAM gates on this feature. pg-dashboard has no
 * useNewPermissions call anywhere in either half of it, and the sidebar entry
 * carries `permission: []`; the product entitlement above is the whole gate.
 *
 * INCREMENT 1 — read-only. The list, its three filters and pagination. The
 * row-action menu (Preview / Edit / Delete draft / Update status / Disable),
 * the report download, and the create+edit form are increments 2 and 3, and
 * until they land a merchant still uses the old dashboard for all of them.
 */
export function InvoiceLinksFeature() {
  const router = useRouter();
  const isEnabled = useInvoiceLinksEnabled();

  // "Create invoice link" picked from the header search arrives as
  // ?action=create, the same handoff MCA Links uses.
  useUrlAction("create", () => router.push("/invoice-links/create"));

  if (!isEnabled) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
        <PageHeader title="Invoice Links" />
        <PlaceholderState
          variant="empty-table"
          title="Invoice Links isn't enabled on your account"
          description="Raise invoice links for your customers and collect against them online. Contact your account manager to switch this on."
          className="rounded-xl border border-border bg-card py-16"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="Invoice Links"
        actions={
          <Button
            type="button"
            variant="primary"
            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onClick={() => router.push("/invoice-links/create")}
          >
            Create Invoice Link
          </Button>
        }
      />

      <MidGuard productType="PA" feature={INVOICE_LINKS_FEATURE}>
        <InvoiceLinkTable />
      </MidGuard>
    </div>
  );
}
