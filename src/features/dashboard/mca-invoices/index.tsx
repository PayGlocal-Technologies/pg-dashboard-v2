"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { MidScopedAction } from "@/components/common/MidScopedAction";
import { TimeRangeTabs } from "@/components/common/TimeRangeTabs";
import { useScopeId } from "@/lib/hooks/useScopeId";
import { usePacbMidScope } from "@/lib/hooks/usePacbMidScope";
import { withBasePath } from "@/constants/basePath";
import { withMidParam } from "@/lib/hooks/useMidFromUrl";
import { useAccountSetup } from "@/stores/useAccountSetup";
import { McaInvoiceTable } from "@/features/dashboard/mca-invoices/components/McaInvoiceTable";
import { InvoiceSummaryCards } from "@/features/dashboard/mca-invoices/components/InvoiceSummaryCards";
import { InvoiceActionCard } from "@/features/dashboard/mca-invoices/components/InvoiceActionCard";
import { useZohoPullSync, zohoSyncLabel } from "@/features/dashboard/zoho-integration/hooks";
import { useInvoiceTemplates } from "@/features/dashboard/create-invoice/hooks";
import { ManageTemplatesDialog } from "@/features/dashboard/create-invoice/components/ManageTemplatesDialog";
import {
  ALL_TIME_RANGE_VALUE,
  INVOICE_DATA_KEYS,
  SUMMARY_RANGE_OPTIONS,
  SUMMARY_RANGE_TIMEFRAME,
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
            <CreateInvoiceAction />
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
  const selectedMid = useAccountSetup((s) => s.selectedMidDetails.mid);

  const handleDeleteTemplate = (templateId: string) => templateStore.remove(templateId);

  // Hard navigation, matching the create-invoice editor's own "Edit template":
  // router.push lands on /create-invoice as a client transition, and the
  // bootstrap there reads `?templateId=` in a first-render lazy initializer that
  // useSearchParams does not reliably populate on a soft navigation — so the
  // template id was captured as empty and the draft opened blank. A full load
  // makes the URL synchronous, and withBasePath keeps the /app-v2 prefix a raw
  // window.location navigation would otherwise drop.
  // The MID rides along because this is a full page load: the selection is
  // in-memory (see useAccountSetup), so without it a multi-MID merchant lands
  // on the editor's "which account?" picker instead of their template.
  const handleEditTemplate = (templateId: string) => {
    window.location.href = withBasePath(
      withMidParam(`/create-invoice?templateId=${templateId}`, selectedMid)
    );
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

/**
 * The page-level "Create invoice", same MID-scoping rule as the table's own
 * toolbar button (see McaInvoiceTable's openInvoiceEditor): a multi-MID
 * merchant with nothing selected has to choose which account the new invoice
 * belongs to before the editor opens, since the editor puts one MID in every
 * request path rather than falling back to the merchant's first one.
 */
function CreateInvoiceAction() {
  const router = useRouter();
  const { needsMidChoice, midOptions, selectMid } = usePacbMidScope();

  const openInvoiceEditor = (mid: string) => {
    if (mid) selectMid(mid);
    router.push("/create-invoice");
  };

  return (
    <MidScopedAction
      label="Create invoice"
      icon="plus"
      variant="primary"
      needsMidChoice={needsMidChoice}
      midOptions={midOptions}
      onRun={openInvoiceEditor}
    />
  );
}

function McaInvoicesContent() {
  // The summary endpoint takes a single id in its path: the product MID, the
  // selected MID, or the UCIC id for a multi-MID account with nothing selected
  // (see lib/hooks/useScopeId.ts).
  const { scopeId: summaryMid } = useScopeId("PACB");

  const [statusFilters, setStatusFilters] = useState<string[]>([]);

  /** The period BOTH summary cards describe. The table's Date chip is its own,
   *  inside it. The two cards read the same value through different
   *  vocabularies — an epoch window for get-invoice-summary, a named timeframe
   *  for document-pending-list (see SUMMARY_RANGE_TIMEFRAME). */
  const [summaryRange, setSummaryRange] = useState<SummaryRange>(ALL_TIME_RANGE_VALUE);

  // Read once, and bucketed to the end of the local day: this is the open end
  // of the summary's window, and therefore part of its react-query key, so a
  // second-resolution "now" would produce a fresh key on every mount and the
  // cards could never paint from cache.
  const [defaultEndMs] = useState(() => endOfDayMs(new Date()));

  const summary = (
    <div className="flex flex-col gap-3">
      {/* "Summary" subheading + the period tabs sit above the card, not
          inside it — the same placement Transactions uses for its own
          "Summary" row above the analytics cards (see McaTransactionsFeature). */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Summary
        </h2>
        <TimeRangeTabs
          options={SUMMARY_RANGE_OPTIONS}
          value={summaryRange}
          onValueChange={setSummaryRange}
          label="Summary period"
        />
      </div>

      {/* Even split: the action card now carries per-transaction rows with
          two buttons each rather than a single CTA, so it reads better at
          the same width as the donut card instead of the narrower 7fr/3fr
          Transactions uses for its own analytics row (see
          TransactionsAnalyticsCarousel). Stacked below `lg`, where there
          isn't room for either to read at a glance side by side. The grid's
          own default `items-stretch` matches the action card's height to
          the donut card's — the slack that creates lands inside the action
          card's own row list (see InvoiceActionCard's `mt-auto`/`flex-1`),
          which reads as breathing room rather than the dead space an
          earlier top-aligned version left stranded under the button. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InvoiceSummaryCards
          merchantId={summaryMid}
          windowSeconds={summaryWindowSeconds(summaryRange, defaultEndMs)}
          onStatusFilter={setStatusFilters}
        />
        <InvoiceActionCard timeframe={SUMMARY_RANGE_TIMEFRAME[summaryRange]} />
      </div>
    </div>
  );

  return (
    <McaInvoiceTable
      summarySection={summary}
      statusFilters={statusFilters}
      onStatusFiltersChange={setStatusFilters}
    />
  );
}
