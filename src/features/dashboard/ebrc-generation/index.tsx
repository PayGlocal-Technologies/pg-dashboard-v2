"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  PageHeader,
} from "@/components/ui";
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
 * connect gate is the landing content instead of an empty/fake table — and,
 * per explicit ask, the page-level heading (title/badge/subtitle) doesn't
 * show at all in that state either: the onboarding hero (DgftConnectGate)
 * is the page's whole content, not a section under a heading that would
 * just repeat "not connected" back at the merchant. The heading only
 * appears once connected, alongside the real status table it describes.
 * DGFT connection state lives in `useEbrcDgft` so it's shared with the
 * wizard page (which has its own gate) rather than re-asked twice in the
 * same session.
 */
export function EbrcGenerationFeature() {
  const router = useRouter();
  const dgftConnected = useEbrcDgft((s) => s.connected);
  const setDgftConnected = useEbrcDgft((s) => s.setConnected);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  if (!dgftConnected) {
    return (
      <div className="mx-auto max-w-350 page-enter">
        <DgftConnectGate onConnected={() => setDgftConnected(true)} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-350 space-y-4 page-enter">
      <PageHeader
        title={
          // PageHeader's own <h1> is already `flex items-center gap-2.5`, so
          // the badge just sits as a second child rather than needing its
          // own wrapper.
          <>
            eBRC Status
            <Badge variant="success" size="sm">
              DGFT connected
            </Badge>
          </>
        }
        titleAriaLabel="eBRC Status"
        subtitle="Check the status of your eBRC requests"
        actions={
          // "Bulk Upload" no longer sits beside this as its own button —
          // that same flow ("Upload a CSV" here) is now one of the two ways
          // to generate, both reached from this one entry point instead of
          // two separate ones.
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="primary"
                size="sm"
                rightIcon={<Icon name="chevron-down" className="h-3.5 w-3.5" />}
              >
                Generate eBRC
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setBulkUploadOpen(true)}>
                <Icon name="upload" className="h-3.5 w-3.5" />
                Upload a CSV
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push("/ebrc-generation/generate")}>
                <Icon name="list-checks" className="h-3.5 w-3.5" />
                Select Individual
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <BulkUploadDialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen} />

      <EbrcStatusTable />
    </div>
  );
}
