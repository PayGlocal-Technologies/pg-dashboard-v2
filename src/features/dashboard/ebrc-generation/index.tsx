"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useEbrcDgft } from "@/stores/useEbrcDgft";
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
 * connected, this page always shows the status table. DGFT connection
 * state lives in `useEbrcDgft` so it's shared with the wizard page (which
 * has its own gate) rather than re-asked twice in the same session.
 */
export function EbrcGenerationFeature() {
  const router = useRouter();
  const dgftConnected = useEbrcDgft((s) => s.connected);
  const setDgftConnected = useEbrcDgft((s) => s.setConnected);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  return (
    <div className="mx-auto max-w-350 space-y-4 page-enter">
      <PageHeader
        title={
          // PageHeader's own <h1> is already `flex items-center gap-2.5`, so
          // the badge just sits as a second child rather than needing its
          // own wrapper.
          <>
            eBRC Status
            {dgftConnected ? (
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

      {dgftConnected ? (
        <EbrcStatusTable />
      ) : (
        <DgftConnectGate onConnected={() => setDgftConnected(true)} />
      )}
    </div>
  );
}
