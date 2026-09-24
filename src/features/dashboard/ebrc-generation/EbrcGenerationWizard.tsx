"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Badge, Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useEbrcDgft } from "@/stores/useEbrcDgft";
import { SelectIrmsStep } from "@/features/dashboard/ebrc-generation/components/SelectIrmsStep";
import { MapShippingBillStep } from "@/features/dashboard/ebrc-generation/components/MapShippingBillStep";
import { ReviewConfirmStep } from "@/features/dashboard/ebrc-generation/components/ReviewConfirmStep";
import { EbrcStepFooterBar } from "@/features/dashboard/ebrc-generation/components/EbrcStepFooterBar";
import { EbrcRequestReceivedOverlay } from "@/features/dashboard/ebrc-generation/components/EbrcRequestReceivedOverlay";
import { emptyMapping, type IrmMapping } from "@/features/dashboard/ebrc-generation/types";

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
 * DGFT connection state lives in `useEbrcDgft` rather than local state, so
 * it survives navigating back to the landing page and returning here. This
 * page never shows its own connect gate — reaching it disconnected redirects
 * straight back to the landing page, where DgftConnectGate lives inline.
 */
export function EbrcGenerationWizard() {
  const router = useRouter();
  const dgftConnected = useEbrcDgft((s) => s.connected);
  const [activeStep, setActiveStep] = useState(1);
  const [furthestStep, setFurthestStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, IrmMapping>>({});
  const [agreed, setAgreed] = useState(false);
  const [receivedOpen, setReceivedOpen] = useState(false);

  // This wizard only makes sense once DGFT is connected — that gate lives
  // on the eBRC Status landing page (DgftConnectGate there), not full-screen
  // here, so someone landing on this route directly (a stale bookmark, a
  // refresh after the in-memory store reset) is sent back to it rather than
  // shown a squeezed copy of the same gate inside the wizard chrome.
  useEffect(() => {
    if (!dgftConnected) router.replace("/ebrc-generation");
  }, [dgftConnected, router]);

  const goToStep = (step: number) => {
    setDirection(step >= activeStep ? 1 : -1);
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

  const handleConfirm = () => {
    // TODO(integration): POST to the eBRC generation endpoint once it
    // exists — payload shape must come from a real spec, not a guess.
    setReceivedOpen(true);
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

      {!dgftConnected ? (
        // Redirecting (see the effect above) — this only flashes briefly,
        // never a real destination in its own right.
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Icon name="loader" className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <StepList activeStep={activeStep} furthestStep={furthestStep} onJump={goToStep} />

          <div className="relative min-h-0 flex-1 overflow-y-auto">
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
                      onMappingChange={handleMappingChange}
                      onProceed={() => goToStep(3)}
                      onBackToSelectIrms={() => goToStep(1)}
                    />
                  )}
                  {activeStep === 3 && (
                    <div className="space-y-4">
                      <ReviewConfirmStep
                        selectedIds={selectedIds}
                        mappings={mappings}
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
                              disabled={!agreed}
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
