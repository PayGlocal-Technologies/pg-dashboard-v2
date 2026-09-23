"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, PageHeader, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { SelectMidView } from "@/components/common/SelectMidView";
import { useNeedsMidSelection } from "@/features/dashboard/multi-currency/hooks";
import { EBRC_FEATURE, useDgftCustomerStatus } from "@/features/dashboard/ebrc-generation/hooks";
import { BulkUploadDialog } from "@/features/dashboard/ebrc-generation/components/BulkUploadDialog";
import { DgftConnectGate } from "@/features/dashboard/ebrc-generation/components/DgftConnectGate";
import { EbrcStatusTable } from "@/features/dashboard/ebrc-generation/components/EbrcStatusTable";

/**
 * eBRC Status — the landing page behind the eBRC nav item's "eBRC Status"
 * child route (`/ebrc-generation`; the URL is unchanged, only the nav label
 * and what it lands on changed). Shows the merchant's existing eBRC
 * requests directly rather than opening straight into the generation
 * wizard — "Generate eBRC" now takes over the full screen instead (see
 * EbrcGenerationWizard, `/ebrc-generation/generate`), the same pattern
 * Create Invoice uses for its own full-screen editor.
 *
 * Until DGFT is connected there's nothing real to show a status for, so the
 * connect gate is the landing content instead of an empty/fake table; once
 * connected, this page always shows the status table.
 *
 * Whether DGFT is connected comes from `fetch_customer_status`, not from
 * client state: the session lives on the backend, so a reload (or a second
 * tab) gets the same answer, and a session that expires server-side closes the
 * gate again rather than leaving a stale "connected" badge behind.
 */
export function EbrcGenerationFeature() {
  const router = useRouter();
  const {
    isConnected: dgftConnected,
    isLoading: isStatusLoading,
    refetch,
  } = useDgftCustomerStatus();
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  // Every eBRC call but the two searches puts the MID in its path —
  // `fetch_customer_status`, the DGFT login, refresh, save, push. With more
  // than one PACB MID and none selected those would all silently address the
  // first one, so a merchant would see one account's DGFT session and eBRC
  // requests under a heading that implies all of them. Same gate Platforms and
  // Virtual Accounts use, for the same reason.
  const needsMidSelection = useNeedsMidSelection();

  if (needsMidSelection) {
    return (
      <div className="mx-auto max-w-350 space-y-4 page-enter">
        <PageHeader title="eBRC Status" subtitle="Check the status of your eBRC requests" />
        <SelectMidView midType="PACB" />
      </div>
    );
  }

  return (
    <MidGuard productType="PACB" feature={EBRC_FEATURE}>
      <div className="mx-auto max-w-350 space-y-4 page-enter">
        <PageHeader
          title={
            // PageHeader's own <h1> is already `flex items-center gap-2.5`, so
            // the badge just sits as a second child rather than needing its
            // own wrapper.
            <>
              eBRC Status
              {isStatusLoading ? (
                <Shimmer className="h-5 w-32 rounded-full" />
              ) : dgftConnected ? (
                <Badge variant="success" size="sm">
                  DGFT connected
                </Badge>
              ) : (
                <Badge variant="secondary" size="sm">
                  DGFT not connected
                </Badge>
              )}
            </>
          }
          titleAriaLabel="eBRC Status"
          subtitle="Check the status of your eBRC requests"
          actions={
            // Nothing to generate or bulk-upload into until DGFT is
            // connected — the banner below is already the call to action in
            // that state, so the header stays free of a CTA that would only
            // re-gate on the same thing.
            !isStatusLoading &&
            dgftConnected && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Icon name="upload" className="h-3.5 w-3.5" />}
                  onClick={() => setBulkUploadOpen(true)}
                >
                  Bulk Upload
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => router.push("/ebrc-generation/generate")}
                >
                  Generate eBRC
                </Button>
              </div>
            )
          }
        />

        <BulkUploadDialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} />

        {/* The gate is the honest default while the status call is in flight:
          showing the table first and yanking it back would be worse than a
          brief skeleton. */}
        {isStatusLoading ? (
          <div className="space-y-2 rounded-xl border border-border bg-card p-6">
            <Shimmer className="h-5 w-48" />
            <Shimmer className="h-40 w-full" />
          </div>
        ) : dgftConnected ? (
          <EbrcStatusTable />
        ) : (
          <DgftConnectGate onConnected={refetch} />
        )}
      </div>
    </MidGuard>
  );
}
