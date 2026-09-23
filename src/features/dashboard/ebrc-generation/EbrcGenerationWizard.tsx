"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { ContentAreaProvider } from "@/components/layout/ContentAreaContext";
import { SelectMidView } from "@/components/common/SelectMidView";
import { usePacbMidScope } from "@/lib/hooks/usePacbMidScope";
import { useEbrcSelection } from "@/stores/useEbrcSelection";
import {
  useDgftCustomerStatus,
  useIrmsByNumber,
  usePushIrms,
} from "@/features/dashboard/ebrc-generation/hooks";
import { SelectIrmsStep } from "@/features/dashboard/ebrc-generation/components/SelectIrmsStep";
import { MapShippingBillStep } from "@/features/dashboard/ebrc-generation/components/MapShippingBillStep";
import { ReviewConfirmStep } from "@/features/dashboard/ebrc-generation/components/ReviewConfirmStep";
import { toIrmMapping } from "@/features/dashboard/ebrc-generation/helpers";
import { EbrcRequestReceivedOverlay } from "@/features/dashboard/ebrc-generation/components/EbrcRequestReceivedOverlay";
import {
  emptyMapping,
  isMappingComplete,
  type IrmMapping,
} from "@/features/dashboard/ebrc-generation/types";

const STEPS = [
  { step: 1, label: "Select IRMs" },
  { step: 2, label: "Map Shipping Bills" },
  { step: 3, label: "Review & Confirm" },
];

/**
 * Left vertical step list — a minimal reference the user supplied: plain
 * text labels, a blue left-border accent on the current step, muted text
 * otherwise, no icons, no boxes, no progress bar. Replaces the old
 * horizontal StepRail (boxed icon tiles + a "What is eBRC?" banner)
 * entirely, per explicit ask to drop that banner.
 */
function StepList({
  activeStep,
  furthestStep,
  onJump,
}: {
  activeStep: number;
  furthestStep: number;
  onJump: (step: number) => void;
}) {
  return (
    <nav
      aria-label="eBRC generation steps"
      className="w-52 shrink-0 border-r border-border px-4 py-6"
    >
      <ol className="space-y-0.5">
        {STEPS.map((s) => {
          const isCurrent = s.step === activeStep;
          const reachable = s.step <= furthestStep;
          return (
            <li key={s.step}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && onJump(s.step)}
                aria-current={isCurrent}
                className={cn(
                  "block w-full border-l-2 py-2 pl-3.5 text-left text-[13px] transition-colors",
                  isCurrent
                    ? "border-primary font-semibold text-foreground"
                    : reachable
                      ? "border-transparent text-foreground/80 hover:text-primary"
                      : "border-transparent text-muted-foreground",
                  !reachable && "cursor-not-allowed"
                )}
              >
                {s.label}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Full-screen "Generate eBRC" wizard — reached from the eBRC Status landing
 * page's own "Generate eBRC" button (see ebrc-generation/index.tsx), same
 * full-screen-takeover pattern Create Invoice uses: its own route group
 * `(ebrc-editor)` with no sidebar/header, its own close button back to the
 * landing page.
 *
 * Step content (SelectIrmsStep / MapShippingBillStep / ReviewConfirmStep) is
 * unchanged from the dashboard-embedded version — only the chrome around it
 * moved. SelectIrmsStep's own docked selection bar reads the nearest
 * ContentAreaContext to size itself against the content column, which the
 * dashboard shell normally provides; this page provides its own scoped to
 * the wizard's own scrolling content panel instead, since this route has no
 * dashboard `<main>` to read from.
 *
 * Whether DGFT is connected is read from the backend (`fetch_customer_status`),
 * not held in client state, so a direct visit or a refresh gets the same
 * answer the landing page does. This page never shows its own connect gate —
 * reaching it disconnected redirects straight back to the landing page, where
 * DgftConnectGate lives inline.
 */
export function EbrcGenerationWizard() {
  const router = useRouter();
  // This route has no sidebar, so the picker goes in the card rather than
  // pointing at a control that isn't on screen — the same inline form the
  // invoice editor uses for exactly this situation.
  const { needsMidChoice, midOptions, selectMid } = usePacbMidScope();
  const clearSelectedIrms = useEbrcSelection((s) => s.clearSelectedIrms);

  const { isConnected: dgftConnected, isLoading: isStatusLoading } = useDgftCustomerStatus();
  const [activeStep, setActiveStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  // Persisted, like pg-dashboard's own `useEbrc` store: the mapping step is
  // long enough that losing the selection to a refresh means redoing all of it.
  const selectedIds = useEbrcSelection((s) => s.selectedIrms);
  const setSelectedIds = useEbrcSelection((s) => s.setSelectedIrms);
  const [mappings, setMappings] = useState<Record<string, IrmMapping>>({});
  const [agreed, setAgreed] = useState(false);
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);
  // What the server's shipping-bill record looked like the last time each IRM
  // was seeded into the form — see the seeding effect below.
  const seededRef = useRef<Map<string, string>>(new Map());
  const [receivedOpen, setReceivedOpen] = useState(false);

  // This wizard only makes sense once DGFT is connected — that gate lives
  // on the eBRC Status landing page (DgftConnectGate there), not full-screen
  // here, so someone landing on this route directly (a stale bookmark, an
  // expired DGFT session) is sent back to it rather than shown a squeezed
  // copy of the same gate inside the wizard chrome. Gated on the status call
  // having settled, so an in-flight check does not bounce them out.
  useEffect(() => {
    // Not while a MID is still owed: the status call is disabled until one is
    // picked, so "not connected" is the absence of an answer rather than a no.
    if (needsMidChoice) return;
    if (!isStatusLoading && !dgftConnected) router.replace("/ebrc-generation");
  }, [needsMidChoice, isStatusLoading, dgftConnected, router]);

  // Full records for the current selection — carries each IRM's saved
  // shipping-bill data, its extraction status, and the presigned URL for a
  // PDF already uploaded. The steps below read these rather than the search
  // rows, which have none of it.
  const {
    records: selectedRecords,
    presignedUrls,
    isLoading: isIrmsLoading,
    isError: isIrmsError,
    refetch: refetchIrms,
  } = useIrmsByNumber(selectedIds);

  const recordsByIrm = useMemo(
    () => new Map(selectedRecords.map((record) => [record.irmNumber ?? "", record])),
    [selectedRecords]
  );

  /**
   * Whether every currently selected IRM has an accepted mapping — the same
   * check Step 2's "Save & review" gate runs, recomputed live against
   * whatever is selected *right now* rather than latched at the moment that
   * gate last passed.
   *
   * `furthestStep` only ratchets forward (see `goToStep`), so on its own it
   * would let someone who already reached Step 3 go back to Step 1, add a
   * fresh IRM, and jump the step list straight to "Review & Confirm" —
   * skipping Step 2 for that IRM entirely, since production's own sequential,
   * route-based wizard has no equivalent free jump between steps. Clamping
   * Step 3's reachability on this closes that gap without touching the ratchet
   * itself: once the new IRM is mapped, `furthestStep` is still 3 and Step 3
   * opens back up on its own.
   */
  const allSelectedMapped =
    selectedIds.length > 0 && selectedIds.every((id) => isMappingComplete(recordsByIrm.get(id)));
  const reachableStep = allSelectedMapped ? furthestStep : Math.min(furthestStep, 2);

  // Seed each mapping from whatever the server holds for that IRM, so
  // returning to step 2 (or reloading mid-flow) shows what was saved rather
  // than an empty form.
  //
  // Re-seeds whenever the server's own record *changes*, not just the first
  // time — which is what makes the upload path work: `extract_shipping_data`
  // fills the shipping-bill fields asynchronously, and the extracted values
  // only reach the form if a later refetch is allowed to overwrite what is
  // there. Comparing against the last-seeded snapshot is what keeps that from
  // also clobbering live typing: a refetch that returns the same record as
  // before seeds nothing.
  //
  // (An earlier version skipped any IRM the merchant had touched. That looked
  // safer and was not: attaching a PDF is itself an edit, so every uploaded
  // IRM was marked touched and its extracted fields were then permanently
  // ignored.)
  //
  // `setState` sits in the updater, not the effect body, and returns the same
  // object when nothing changed, so this cannot loop.
  useEffect(() => {
    if (selectedRecords.length === 0) return;
    setMappings((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const record of selectedRecords) {
        const id = record.irmNumber ?? "";
        if (!id) continue;

        // No saved mapping yet: still seed the currency off the IRM, since
        // that field is read-only and comes from the remittance rather than
        // from anything the merchant types.
        if (!record.shippingBillData) {
          if (!prev[id]?.shippingBillCurrency && record.remittanceFCC) {
            next[id] = {
              ...(prev[id] ?? emptyMapping(id)),
              shippingBillCurrency: record.remittanceFCC,
            };
            changed = true;
          }
          continue;
        }

        const snapshot = JSON.stringify(record.shippingBillData);
        if (seededRef.current.get(id) === snapshot) continue;

        seededRef.current.set(id, snapshot);
        next[id] = toIrmMapping(id, record.shippingBillData, record.remittanceFCC);
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [selectedRecords]);

  const { push, isPending: isPushing } = usePushIrms();

  const goToStep = (step: number) => {
    setActiveStep(step);
    setFurthestStep((prev) => Math.max(prev, step));
  };

  const handleSelectedIdsChange = (ids: string[]) => {
    setSelectedIds(ids);
    setMappings((prev) => {
      const next: Record<string, IrmMapping> = {};
      for (const id of ids) next[id] = prev[id] ?? emptyMapping(id);
      return next;
    });
  };

  const handleMappingChange = (irmId: string, next: IrmMapping) => {
    setMappings((prev) => ({ ...prev, [irmId]: next }));
  };

  const handleClose = () => router.push("/ebrc-generation");

  /**
   * Submits every selected IRM's saved shipping-bill record to DGFT.
   *
   * Production sends `selectedIrmsData.map(irm => irm.shippingBillData)` — the
   * server's own copy, saved by `save_shipping_data` as the merchant walked
   * step 2 — not the form state. Same here: a field that never reached the
   * server is a field DGFT should not be told about.
   */
  const handleConfirm = () => {
    const dtos = selectedIds.map((id) => recordsByIrm.get(id)?.shippingBillData ?? null);
    push(dtos, () => {
      clearSelectedIrms();
      // The overlay is the confirmation, not a toast — see
      // EbrcRequestReceivedOverlay. Routing happens when it is dismissed, so
      // the merchant reads the 4-hour expectation before leaving the wizard.
      setReceivedOpen(true);
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-3">
        <IconButton aria-label="Close" variant="ghost" size="sm" onClick={handleClose}>
          <Icon name="x" className="h-4 w-4" />
        </IconButton>
        <h1 className="flex-1 text-[15px] font-semibold tracking-tight text-foreground">
          Generate eBRC
        </h1>
        {dgftConnected && (
          <Badge variant="success" size="sm">
            DGFT connected
          </Badge>
        )}
      </header>

      {needsMidChoice ? (
        <div className="mx-auto w-full max-w-2xl px-6 py-16">
          <SelectMidView midType="PACB" midOptions={midOptions} onSelectMid={selectMid} />
        </div>
      ) : isStatusLoading || !dgftConnected ? (
        // Either the status call is still in flight, or it came back
        // disconnected and the effect above is redirecting — this only ever
        // flashes briefly, never a real destination in its own right.
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Icon name="loader" className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <StepList activeStep={activeStep} furthestStep={reachableStep} onJump={goToStep} />

          <div ref={setContentEl} className="relative min-h-0 flex-1 overflow-y-auto">
            <ContentAreaProvider value={contentEl}>
              <div className="space-y-4 px-6 py-6">
                {activeStep === 1 && (
                  <SelectIrmsStep
                    selectedIds={selectedIds}
                    onSelectedIdsChange={handleSelectedIdsChange}
                    onProceed={() => goToStep(2)}
                  />
                )}
                {activeStep === 2 && (
                  <MapShippingBillStep
                    selectedIds={selectedIds}
                    mappings={mappings}
                    records={recordsByIrm}
                    presignedUrls={presignedUrls}
                    isLoading={isIrmsLoading}
                    isError={isIrmsError}
                    onMappingChange={handleMappingChange}
                    onRefetchIrms={refetchIrms}
                    onProceed={() => goToStep(3)}
                    onBackToSelectIrms={() => goToStep(1)}
                  />
                )}
                {activeStep === 3 && (
                  <>
                    <ReviewConfirmStep
                      selectedIds={selectedIds}
                      mappings={mappings}
                      records={recordsByIrm}
                      agreed={agreed}
                      onAgreedChange={setAgreed}
                    />
                    <div className="flex items-center justify-between border-t border-border pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        leftIcon={<Icon name="chevron-left" className="h-3.5 w-3.5" />}
                        onClick={() => goToStep(2)}
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        disabled={!agreed || !allSelectedMapped || isPushing}
                        isLoading={isPushing}
                        onClick={handleConfirm}
                      >
                        Confirm and generate
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </ContentAreaProvider>
          </div>
        </div>
      )}

      <EbrcRequestReceivedOverlay
        open={receivedOpen}
        onClose={() => router.push("/ebrc-generation")}
      />
    </div>
  );
}
