"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge, Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { ContentAreaProvider } from "@/components/layout/ContentAreaContext";
import { useEbrcDgft } from "@/stores/useEbrcDgft";
import { SelectIrmsStep } from "@/features/dashboard/ebrc-generation/components/SelectIrmsStep";
import { MapShippingBillStep } from "@/features/dashboard/ebrc-generation/components/MapShippingBillStep";
import { ReviewConfirmStep } from "@/features/dashboard/ebrc-generation/components/ReviewConfirmStep";
import { emptyMapping, type IrmMapping } from "@/features/dashboard/ebrc-generation/types";

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
    <nav aria-label="eBRC generation steps" className="w-52 shrink-0 border-r border-border px-4 py-6">
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, IrmMapping>>({});
  const [agreed, setAgreed] = useState(false);
  const [contentEl, setContentEl] = useState<HTMLElement | null>(null);

  // This wizard only makes sense once DGFT is connected — that gate lives
  // on the eBRC Status landing page (DgftConnectGate there), not full-screen
  // here, so someone landing on this route directly (a stale bookmark, a
  // refresh after the in-memory store reset) is sent back to it rather than
  // shown a squeezed copy of the same gate inside the wizard chrome.
  useEffect(() => {
    if (!dgftConnected) router.replace("/ebrc-generation");
  }, [dgftConnected, router]);

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

  const handleConfirm = () => {
    // TODO(integration): POST to the eBRC generation endpoint once it
    // exists — payload shape must come from a real spec, not a guess.
    toast.message("eBRC generation isn't connected to the backend yet", {
      description: "Your request would normally be submitted to DGFT for validation here.",
    });
    router.push("/ebrc-generation");
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

      {!dgftConnected ? (
        // Redirecting (see the effect above) — this only flashes briefly,
        // never a real destination in its own right.
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Icon name="loader" className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <StepList activeStep={activeStep} furthestStep={furthestStep} onJump={goToStep} />

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
                    onMappingChange={handleMappingChange}
                    onProceed={() => goToStep(3)}
                    onBackToSelectIrms={() => goToStep(1)}
                  />
                )}
                {activeStep === 3 && (
                  <>
                    <ReviewConfirmStep
                      selectedIds={selectedIds}
                      mappings={mappings}
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
                        disabled={!agreed}
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
    </div>
  );
}
