"use client";

import { useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { useScopeId } from "@/lib/hooks/useScopeId";
import { withBasePath } from "@/constants/basePath";
import { McaInvoiceTable } from "@/features/dashboard/mca-invoices/components/McaInvoiceTable";
import { InvoiceSummaryCards } from "@/features/dashboard/mca-invoices/components/InvoiceSummaryCards";
import { useZohoPullSync, zohoSyncLabel } from "@/features/dashboard/zoho-integration/hooks";
import { useInvoiceTemplates } from "@/features/dashboard/create-invoice/hooks";
import { ManageTemplatesDialog } from "@/features/dashboard/create-invoice/components/ManageTemplatesDialog";
import {
  ALL_TIME_RANGE_VALUE,
  INVOICE_DATA_KEYS,
  type SummaryRange,
} from "@/features/dashboard/mca-invoices/constants";
import { endOfDayMs, summaryWindowSeconds } from "@/features/dashboard/mca-invoices/helpers";

/**
 * Invoice management, at /mca-invoices.
 *
 * Composition root only. The one piece of state shared between the summary and
 * the table is the status filter, because a summary card is a shortcut into the
 * list: clicking "Outstanding invoices" filters it, exactly as pg-dashboard
 * does. The summary's period and the table's Date chip are NOT shared — see
 * SUMMARY_RANGE_OPTIONS for why they stopped being.
 */
export function McaInvoicesFeature() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <PageHeader
        title="Invoice management"
        actions={
          <>
            <ZohoSyncAction />
            <ManageTemplatesAction />
          </>
        }
      />
      <MidGuard productType="PACB">
        <McaInvoicesContent />
      </MidGuard>
    </div>
  );
}

/**
 * "Sync from Zoho", the invoice-list twin of the one Client Management shows.
 *
 * Only for a merchant who has actually connected Zoho: production gates it on
 * the connection status rather than showing a disabled control. It never asks
 * which MID to sync — a merchant's Zoho account is linked to exactly one PACB
 * MID, so the pull goes there and the label names it when the merchant holds
 * more than one account.
 */
function ZohoSyncAction() {
  // Invoices only. The same endpoint can pull clients across, and this list
  // deliberately doesn't ask it to, mirroring Client Management's inverse.
  //
  // A pull can add or restate any number of invoices, so both the list and the
  // summary counts have to refetch once it lands.
  const { isConnected, isSyncing, sync, connectedMid, hasMultipleMids } = useZohoPullSync(
    { isClientSync: false, isInvoiceSync: true },
    INVOICE_DATA_KEYS
  );

  if (!isConnected) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      leftIcon={<Icon name="zoho-logo" className="h-3.5 w-3.5" />}
      isLoading={isSyncing}
      onClick={sync}
    >
      {zohoSyncLabel(connectedMid, hasMultipleMids)}
    </Button>
  );
}

/**
 * "Manage templates", opened from the invoice list rather than only from
 * inside an invoice — the same dialog the create-invoice editor's split
 * button opens, so renaming or editing a template reads identically from
 * either surface.
 */
function ManageTemplatesAction() {
  const [open, setOpen] = useState(false);
  const templateStore = useInvoiceTemplates();

  const handleDeleteTemplate = (templateId: string) => templateStore.remove(templateId);

  // Hard navigation, matching the create-invoice editor's own "Edit template":
  // router.push lands on /create-invoice as a client transition, and the
  // bootstrap there reads `?templateId=` in a first-render lazy initializer that
  // useSearchParams does not reliably populate on a soft navigation — so the
  // template id was captured as empty and the draft opened blank. A full load
  // makes the URL synchronous, and withBasePath keeps the /app-v2 prefix a raw
  // window.location navigation would otherwise drop.
  const handleEditTemplate = (templateId: string) => {
    window.location.href = withBasePath(`/create-invoice?templateId=${templateId}`);
  };

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
        onDelete={handleDeleteTemplate}
        onEdit={handleEditTemplate}
      />
    </>
  );
}

function McaInvoicesContent() {
  // The summary endpoint takes a single id in its path: the product MID, the
  // selected MID, or the UCIC id for a multi-MID account with nothing selected
  // (see lib/hooks/useScopeId.ts).
  const { scopeId: summaryMid } = useScopeId("PACB");

  const [statusFilters, setStatusFilters] = useState<string[]>([]);

  /** The summary's own period. The table's Date chip is its own, inside it. */
  const [summaryRange, setSummaryRange] = useState<SummaryRange>(ALL_TIME_RANGE_VALUE);

  // Read once, and bucketed to the end of the local day: this is the open end
  // of the summary's window, and therefore part of its react-query key, so a
  // second-resolution "now" would produce a fresh key on every mount and the
  // cards could never paint from cache.
  const [defaultEndMs] = useState(() => endOfDayMs(new Date()));

  const summary = (
    <InvoiceSummaryCards
      merchantId={summaryMid}
      range={summaryRange}
      onRangeChange={setSummaryRange}
      windowSeconds={summaryWindowSeconds(summaryRange, defaultEndMs)}
      onStatusFilter={setStatusFilters}
    />
  );

  return (
    <McaInvoiceTable
      summarySection={summary}
      statusFilters={statusFilters}
      onStatusFiltersChange={setStatusFilters}
    />
  );
}
