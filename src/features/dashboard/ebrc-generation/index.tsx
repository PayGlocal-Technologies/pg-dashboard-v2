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
  Shimmer,
} from "@/components/ui";
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
 * connect gate is the landing content instead of an empty/fake table — and,
 * per explicit ask, the page-level heading (title/badge/subtitle) doesn't
 * show at all in that state either: the onboarding hero (DgftConnectGate) is
 * the page's whole content, not a section under a heading that would just
 * repeat "not connected" back at the merchant. The heading only appears once
 * connected, alongside the real status table it describes.
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

  // The connection check is a request, so there is a moment before the answer
  // where neither the gate nor the table is the honest thing to show. A
  // skeleton beats flashing the onboarding hero at a merchant who is in fact
  // already connected.
  if (isStatusLoading) {
    return (
      <div className="mx-auto max-w-350 space-y-4 page-enter">
        <Shimmer className="h-8 w-56" />
        <div className="space-y-2 rounded-xl border border-border bg-card p-6">
          <Shimmer className="h-5 w-48" />
          <Shimmer className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!dgftConnected) {
    return (
      <MidGuard productType="PACB" feature={EBRC_FEATURE}>
        <div className="mx-auto max-w-350 page-enter">
          {/* `refetch` rather than a local flag: the DGFT session lives on the
              backend, so the page re-asks it rather than assuming the login
              took. */}
          <DgftConnectGate onConnected={refetch} />
        </div>
      </MidGuard>
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
              <Badge variant="success" size="sm">
                DGFT connected
              </Badge>
            </>
          }
          titleAriaLabel="eBRC Status"
          subtitle="Check the status of your eBRC requests"
          actions={
            // "Bulk Upload" no longer sits beside this as its own button —
            // that same flow ("Upload Bulk" here, an Excel file) is now one
            // of the two ways to generate, both reached from this one entry point
            // instead of two separate ones.
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
                  Upload Bulk
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
    </MidGuard>
  );
}
