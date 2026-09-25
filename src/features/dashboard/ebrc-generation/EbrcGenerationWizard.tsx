"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { Badge, Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { withBasePath } from "@/constants/basePath";
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
import { EbrcStepFooterBar } from "@/features/dashboard/ebrc-generation/components/EbrcStepFooterBar";
import { EbrcRequestReceivedOverlay } from "@/features/dashboard/ebrc-generation/components/EbrcRequestReceivedOverlay";
import {
  EBRC_JUST_QUEUED_KEY,
  emptyMapping,
  isMappingComplete,
  portCodeError,
  type IrmDetails,
  type IrmMapping,
} from "@/features/dashboard/ebrc-generation/types";

const STEPS = [
  {
    step: 1,
    label: "Select IRMs",
    description: "Choose the inward remittance messages you want this eBRC to cover.",
    headerTitle: "Select the IRMs for generation",
    headerDescription: "Pick the remittances that should be included in this request.",
  },
  {
    step: 2,
    label: "Map Shipping Bills",
    description: "Match each selected IRM to the shipping bill(s) and deductions it settles.",
    headerTitle: "Map shipping bills to your IRMs",
    headerDescription: "Upload or enter the shipping documentation for each selected IRM.",
  },
  {
    step: 3,
    label: "Review & Confirm",
    description: "Check the mapped amounts, then submit your eBRC generation request.",
    headerTitle: "Review and confirm",
    headerDescription: "Double-check the details below before generating your eBRC.",
  },
] as const;

/** Identity of the server's shipping-bill record for an IRM, which is what an
 *  edit is stamped with. Empty while there is none. */
function shippingBillSnapshot(record: IrmDetails | undefined): string {
  return record?.shippingBillData ? JSON.stringify(record.shippingBillData) : "";
}

const STEP_TRANSITION = { duration: 0.25, ease: [0.33, 0.88, 0.22, 1] as const };

/** Left vertical step list. Each step's own description is revealed only
 *  once the merchant is actually on it — everywhere else stays a plain
 *  single-line label, so the list doesn't grow three paragraphs deep at
 *  once. A vertical progress tracker runs down the nav's own right-hand
 *  border stroke: a static full-height line, with a primary-filled overlay
 *  that grows top-to-bottom (and shrinks back on "Back") as `activeStep`
 *  advances — the vertical equivalent of the step content's own horizontal
 *  slide, so both transitions read as "moving through the same wizard". */
function StepList({
  activeStep,
  furthestStep,
  onJump,
}: {
  activeStep: number;
  furthestStep: number;
  onJump: (step: number) => void;
}) {
  // activeStep / length, not (activeStep - 1) / (length - 1): the latter is
  // 0 on step 1, which left the fill invisible on the very first step —
  // this divider IS the progress bar now (nav's own border-r was removed),
  // so it has to show something from the start, not just once step 2 begins.
  const progressRatio = activeStep / STEPS.length;

  return (
    <nav aria-label="eBRC generation steps" className="relative w-64 shrink-0 px-4 py-6">
      <div className="absolute bottom-0 right-0 top-0 w-px bg-border" aria-hidden />
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-px origin-top bg-primary"
        initial={false}
        animate={{ scaleY: progressRatio }}
        transition={STEP_TRANSITION}
        aria-hidden
      />

      <ol className="space-y-1">
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
                  "group block w-full border-l-2 py-2 pl-3.5 pr-4 text-left transition-colors",
                  isCurrent ? "border-primary" : "border-transparent",
                  !reachable && "cursor-not-allowed"
                )}
              >
                <span
                  className={cn(
                    "block text-[13px] transition-colors",
                    isCurrent
                      ? "font-semibold text-foreground"
                      : reachable
                        ? "text-foreground/80 group-hover:text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
                <AnimatePresence initial={false}>
                  {isCurrent && (
                    <motion.span
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="block overflow-hidden"
                    >
                      <span className="block pt-1 text-[11.5px] leading-snug text-muted-foreground">
                        {s.description}
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
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
 * Step content (SelectIrmsStep / MapShippingBillStep / ReviewConfirmStep)
 * slides in from the direction the merchant is moving (top-to-bottom going
 * forward, the reverse going "Back") via framer-motion, keyed by
 * `activeStep`. Every step's own primary/secondary actions now live in one
 * shared `EbrcStepFooterBar` — a sticky bar docked to the bottom of each
 * step's own content — so the CTAs sit in the same screen position across
 * all three steps instead of each growing a differently-placed footer.
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
  const { needsMidChoice } = usePacbMidScope();
  const clearSelectedIrms = useEbrcSelection((s) => s.clearSelectedIrms);

  const { isConnected: dgftConnected, isLoading: isStatusLoading } = useDgftCustomerStatus();
  const [activeStep, setActiveStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  // Persisted, like pg-dashboard's own `useEbrc` store: the mapping step is
  // long enough that losing the selection to a refresh means redoing all of it.
  const selectedIds = useEbrcSelection((s) => s.selectedIrms);
  const setSelectedIds = useEbrcSelection((s) => s.setSelectedIrms);
  // Only what the merchant has typed, each edit stamped with the server
  // record it was made against. The form's values are derived from this and
  // the server records together, see `mappings` below.
  const [edits, setEdits] = useState<Record<string, { value: IrmMapping; basedOn: string }>>({});
  const [agreed, setAgreed] = useState(false);
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

  // Each IRM's form values: the merchant's own edit while the server's
  // shipping-bill record is still the one that edit was made against, and the
  // server's record otherwise. So returning to step 2, or reloading mid-flow,
  // shows what was saved rather than an empty form, and a record that
  // *changes* wins over the edit, which is what makes the upload path work:
  // `extract_shipping_data` fills the shipping-bill fields asynchronously, and
  // the extracted values have to replace what is there (including the file
  // name the upload itself patched in). A refetch that returns the same record
  // changes nothing, so live typing is never clobbered.
  //
  // Derived during render, not seeded by an effect. The effect version tracked
  // "already seeded" in a ref mutated inside a setState updater; React may run
  // an updater twice (StrictMode always does in development), and the second
  // run saw the record as seeded and discarded the extracted values.
  //
  // (An earlier version skipped any IRM the merchant had touched. That looked
  // safer and was not: attaching a PDF is itself an edit, so every uploaded
  // IRM was marked touched and its extracted fields were then permanently
  // ignored.)
  const mappings = useMemo(() => {
    const out: Record<string, IrmMapping> = {};
    for (const id of selectedIds) {
      const record = recordsByIrm.get(id);
      const edit = edits[id];
      if (edit && edit.basedOn === shippingBillSnapshot(record)) {
        out[id] = edit.value;
      } else if (record?.shippingBillData) {
        out[id] = toIrmMapping(id, record.shippingBillData, record.remittanceFCC);
      } else {
        // No saved mapping yet: still seed the currency off the IRM, since
        // that field is read-only and comes from the remittance rather than
        // from anything the merchant types.
        out[id] = { ...emptyMapping(id), shippingBillCurrency: record?.remittanceFCC ?? "" };
      }
    }
    return out;
  }, [selectedIds, recordsByIrm, edits]);

  const { push, isPending: isPushing } = usePushIrms();

  const goToStep = (step: number) => {
    setDirection(step >= activeStep ? 1 : -1);
    setActiveStep(step);
    setFurthestStep((prev) => Math.max(prev, step));
  };

  const handleSelectedIdsChange = (ids: string[]) => {
    setSelectedIds(ids);
    // Deselecting an IRM drops its edit, so re-adding it starts from the
    // server's record rather than a stale draft.
    setEdits((prev) => {
      const next: typeof prev = {};
      for (const id of ids) if (prev[id]) next[id] = prev[id];
      return next;
    });
  };

  const handleMappingChange = (irmId: string, next: IrmMapping) => {
    const basedOn = shippingBillSnapshot(recordsByIrm.get(irmId));
    setEdits((prev) => ({ ...prev, [irmId]: { value: next, basedOn } }));
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
    // The same port-code rule push_irm enforces, checked on what is about to
    // be sent. Step 2 catches it at save time, but a record saved before that
    // check existed can still carry a bad code, and DGFT then rejects the
    // whole request for one field.
    const badPort = dtos.find((dto) => dto && portCodeError(dto.portCode));
    if (badPort) {
      toast.error(
        `IRM ${badPort.irmNumber ?? ""}: ${portCodeError(badPort.portCode)} Fix it in Map shipping bills.`
      );
      goToStep(2);
      return;
    }
    push(dtos, () => {
      clearSelectedIrms();
      // Read (and cleared) by EbrcStatusTable once the overlay routes back
      // there, so its "wait 4 hours" callout shows only after a real submit.
      window.sessionStorage.setItem(EBRC_JUST_QUEUED_KEY, "1");
      // The overlay is the confirmation, not a toast — see
      // EbrcRequestReceivedOverlay. Routing happens when it is dismissed, so
      // the merchant reads the 4-hour expectation before leaving the wizard.
      setReceivedOpen(true);
    });
  };

  const activeMeta = STEPS[activeStep - 1];

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
          <SelectMidView midType="PACB" showSidebarHint={false} />
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

          <div
            className="relative min-h-0 flex-1 overflow-y-auto bg-cover bg-top bg-no-repeat"
            // Quoted url(): the filename has a space ("bg image.png"), and an
            // unquoted CSS url() is terminated by the first whitespace,
            // which silently drops the whole background-image declaration —
            // this is the exact bug that made this image "not load" before.
            //
            // The white wash is layered on as a second background
            // (multiple-backgrounds, not `opacity` on this div) — opacity
            // would fade the step content sitting on top of it too, not
            // just the image underneath.
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.78), rgba(255,255,255,0.78)), url("${withBasePath("/assets/bg image.png")}")`,
            }}
          >
            <div className="px-6 py-6">
              {/* Header naming the current step's action in a few words —
                    the sidebar label says which step this is, this says what
                    to actually do on it. */}
              <div className="mb-4">
                <h2 className="text-[15px] font-semibold text-foreground">
                  {activeMeta.headerTitle}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  {activeMeta.headerDescription}
                </p>
              </div>

              {/* Vertical slide, not horizontal — matches the sidebar's
                    own top-to-bottom progress tracker, so the step list and
                    the content it's driving move the same way. */}
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <motion.div
                  key={activeStep}
                  custom={direction}
                  initial={{ y: direction > 0 ? 24 : -24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: direction > 0 ? -24 : 24, opacity: 0 }}
                  transition={STEP_TRANSITION}
                >
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
                    <div className="space-y-4">
                      <ReviewConfirmStep
                        selectedIds={selectedIds}
                        mappings={mappings}
                        records={recordsByIrm}
                        agreed={agreed}
                        onAgreedChange={setAgreed}
                      />
                      <EbrcStepFooterBar
                        right={
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto min-h-0 p-0 text-[12.5px] text-muted-foreground hover:bg-transparent hover:text-foreground"
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
                          </>
                        }
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
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
