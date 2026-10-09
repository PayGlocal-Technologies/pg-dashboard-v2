"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { MidScopedAction } from "@/components/common/MidScopedAction";
import { useUrlAction } from "@/lib/hooks/useUrlAction";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { ManageTemplatesDialog } from "@/features/dashboard/create-invoice/components/ManageTemplatesDialog";
import { InvoiceLinkTable } from "@/features/dashboard/invoice-links/components/InvoiceLinkTable";
import { INVOICE_LINKS_FEATURE } from "@/features/dashboard/invoice-links/constants";
import {
  useHasInvoiceLinks,
  useInvoiceLinkMidScope,
  useInvoiceLinksEnabled,
} from "@/features/dashboard/invoice-links/hooks";
import { EnableProductAction, FeatureBanner } from "@/components/common/FeatureBanner";
import {
  useInvoiceEditorMid,
  useInvoiceLinkTemplates,
} from "@/features/dashboard/invoice-links/create/hooks";

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
  // ?action=create, the same handoff MCA Links uses. It cannot ask which
  // account first, so a multi-MID merchant is asked on the editor instead.
  useUrlAction("create", () => router.push("/invoice-links/create"));

  // Not enabled: the banner asks them to enable it, over an empty table (no
  // list call, nothing to create). Enabled with no link yet: the banner
  // leads, pointing at Create. Once a link exists the page is the list.
  const hasLinks = useHasInvoiceLinks(isEnabled);
  const showBanner = !isEnabled || hasLinks === false;

  const banner = showBanner && (
    <FeatureBanner
      imageSrc="/assets/banner-states/invoice-links.webp"
      title="Your invoices, ready to share"
      description="Create and customise invoices for your business, then share them with customers to make payments simpler."
      action={
        isEnabled ? <CreateInvoiceLinkAction /> : <EnableProductAction product="Invoice Links" />
      }
    />
  );

  if (!isEnabled) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
        <PageHeader title="Invoice Links" />
        {banner}
        <PlaceholderState
          variant="empty-table"
          title="No invoice links yet"
          description="Invoice links you raise for your customers will appear here once they are created."
          className="rounded-xl border border-border bg-card py-16"
        />
      </div>
    );
  }

  const header = (
    <PageHeader
      title="Invoice Links"
      actions={
        <>
          <ManageTemplatesAction />
          <CreateInvoiceLinkAction />
        </>
      }
    />
  );
  const table = (
    <MidGuard productType="PA" feature={INVOICE_LINKS_FEATURE}>
      <InvoiceLinkTable />
    </MidGuard>
  );

  // With the banner up the page flows as usual: the fixed-height layout
  // below would squeeze the table under it.
  if (showBanner) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
        {header}
        {banner}
        {table}
      </div>
    );
  }

  return (
    // Fills the content area exactly, the way dispute management does in
    // pg-internal-v2: the viewport, less the app header (57px) and the
    // layout's padding (p-4, md:p-6). The table card takes what the page
    // header leaves, and its rows scroll between the column header and the
    // footer.
    <div className="page-enter mx-auto flex h-[calc(100dvh-57px-2rem)] min-h-[28rem] max-w-[1400px] flex-col gap-4 md:h-[calc(100dvh-57px-3rem)]">
      {header}
      {table}
    </div>
  );
}

/**
 * "Manage templates", the same button and dialog MCA Invoices carries. The
 * invoice link editor already reads and writes this template store, so this
 * is the list-side door to it.
 *
 * Templates live under one MID's path, so the store is addressed to the MID
 * the editor would write against. Rename and delete only here: no open-in-
 * editor (↗) action on this page.
 */
function ManageTemplatesAction() {
  const [open, setOpen] = useState(false);
  const mid = useInvoiceEditorMid();
  const templateStore = useInvoiceLinkTemplates(mid);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        leftIcon={<Icon name="layout-template" className="h-3.5 w-3.5" />}
        onClick={() => setOpen(true)}
      >
        Manage templates
      </Button>

      <ManageTemplatesDialog
        open={open}
        onOpenChange={setOpen}
        templates={templateStore.templates}
        isMutating={templateStore.isMutating}
        onRename={templateStore.rename}
        onDelete={templateStore.remove}
      />
    </>
  );
}

/**
 * "Create Invoice Link", scoped the way MCA Invoices' Create is: with several
 * eligible PA MIDs and none selected, it asks which account the link is for
 * before the editor opens, since the editor puts one MID in every request
 * path.
 */
function CreateInvoiceLinkAction() {
  const router = useRouter();
  const { needsMidChoice, midOptions, selectMid } = useInvoiceLinkMidScope();

  const openEditor = (mid: string) => {
    if (mid) selectMid(mid);
    router.push("/invoice-links/create");
  };

  return (
    <MidScopedAction
      label="Create Invoice Link"
      icon="plus"
      variant="primary"
      needsMidChoice={needsMidChoice}
      midOptions={midOptions}
      onRun={openEditor}
    />
  );
}
