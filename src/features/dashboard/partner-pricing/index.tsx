"use client";

import { useEffect, useRef, useState } from "react";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PricingCategory } from "@/features/dashboard/partner-pricing/components/PricingCategory";
import { EarningsPreviewDialog } from "@/features/dashboard/partner-pricing/components/EarningsPreviewDialog";
import {
  marginFor,
  parseFee,
  PRICING_CATEGORIES,
  PRICING_PRODUCTS,
  SAVED_MERCHANT_FEES,
} from "@/features/dashboard/partner-pricing/pricing";

type SaveState = "saved" | "unsaved" | "saving" | "error";

/** Wait after the last keystroke before saving. */
const SAVE_DELAY_MS = 800;

/**
 * DESIGN MOCK: Partner Pricing, at /pricing. A configuration page, not a
 * dashboard: what the partner charges their merchants per product against
 * PayGlocal's rate, and the margin that leaves, with one compact status line
 * instead of metric cards. "Preview earnings" opens the money split for a
 * single payment, kept out of the table on purpose.
 *
 * Fees save on their own a moment after the last edit (mock: no endpoint;
 * the status line walks Unsaved changes → Saving… → All changes saved).
 * TODO(integration): the partner pricing read/save endpoints, and the
 * "Couldn't save changes" state on a failed save.
 */
export function PartnerPricingFeature() {
  const [fees, setFees] = useState<Record<string, string>>(() => ({ ...SAVED_MERCHANT_FEES }));
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [previewOpen, setPreviewOpen] = useState(false);
  const saveTimer = useRef<number | null>(null);
  const settleTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (settleTimer.current) window.clearTimeout(settleTimer.current);
    },
    []
  );

  function changeFee(productId: string, value: string) {
    setFees((prev) => ({ ...prev, [productId]: value }));
    setSaveState("unsaved");
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    if (settleTimer.current) window.clearTimeout(settleTimer.current);
    saveTimer.current = window.setTimeout(() => {
      setSaveState("saving");
      // Stands in for the save request.
      settleTimer.current = window.setTimeout(() => setSaveState("saved"), 600);
    }, SAVE_DELAY_MS);
  }

  // Derived on every edit, never stored, so the line can't go stale.
  const configured = PRICING_PRODUCTS.filter((p) => parseFee(fees[p.id] ?? "") !== null).length;
  const total = PRICING_PRODUCTS.length;
  const belowRate = PRICING_PRODUCTS.filter(
    (p) => marginFor(p, fees[p.id] ?? "").state === "below"
  ).length;
  const allConfigured = configured === total;

  // Quiet text, not a button: what the last edit's save is doing.
  const saveStatus = (
    <p
      role="status"
      className={cn(
        "flex items-center gap-1.5 text-[12.5px]",
        saveState === "error" ? "text-destructive" : "text-muted-foreground"
      )}
    >
      {saveState === "saved" && (
        <>
          <Icon name="check" size={13} aria-hidden />
          All changes saved
        </>
      )}
      {saveState === "saving" && "Saving…"}
      {saveState === "unsaved" && "Unsaved changes"}
      {saveState === "error" && (
        <>
          <Icon name="alert-circle" size={13} aria-hidden />
          Couldn&apos;t save changes
        </>
      )}
    </p>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 page-enter">
      <div className="space-y-2">
        <PageHeader
          title="Pricing"
          subtitle="Set the fees your merchants pay. Your earnings are the difference between your merchant fee and PayGlocal's rate."
          actions={
            <div className="flex items-center gap-3">
              {/* sm+: beside the button. Below sm it sits on the status line,
                  where it has room. */}
              <span className="hidden sm:flex">{saveStatus}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Icon name="calculator" className="h-3.5 w-3.5" />}
                onClick={() => setPreviewOpen(true)}
              >
                Preview earnings
              </Button>
            </div>
          }
        />

        {/* Completion, not a metric: how much is set up, and how much is
            priced below what PayGlocal charges. */}
        <p className="flex flex-wrap items-center gap-x-1.5 text-[13px] text-muted-foreground">
          {allConfigured && (
            <Icon name="check-circle" size={14} className="text-success" aria-hidden />
          )}
          <span className={cn(allConfigured && "text-foreground")}>
            {configured} of {total} products configured
          </span>
          {belowRate > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="text-amber-700 dark:text-amber-400">
                {belowRate} below PayGlocal rate
              </span>
            </>
          )}
        </p>
        <div className="sm:hidden">{saveStatus}</div>
      </div>

      {PRICING_CATEGORIES.map((category) => (
        <PricingCategory
          key={category.id}
          name={category.name}
          description={category.description}
          products={PRICING_PRODUCTS.filter((p) => p.category === category.id)}
          fees={fees}
          onFeeChange={changeFee}
        />
      ))}

      <EarningsPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} fees={fees} />
    </div>
  );
}
