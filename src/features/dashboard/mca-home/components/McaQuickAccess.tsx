"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { mcaQuickAccessItems } from "@/features/dashboard/mca-home/mock-data";
import { FxCalculatorModal } from "@/features/dashboard/multi-currency/components/FxCalculatorModal";

/**
 * Where each tile goes. Two tiles are deliberately absent: "forex-calculator"
 * opens the calculator dialog in place (it is a modal, not a page, and the
 * dashboard mounts its own copy below rather than sending the merchant to
 * /multi-currency just to click it), and "customise-dashboard" calls straight
 * into this dashboard's own edit mode.
 */
const QUICK_ACCESS_ROUTES: Record<string, string> = {
  "invoice-links": "/create-invoice",
  // Virtual accounts is this app's international-accounts screen, there is no
  // separate /international-accounts route, see lib/navigation.ts.
  "international-accounts": "/multi-currency",
  // Closest real destination: /platforms is where marketplace and payout
  // platforms are connected. No withdrawal-specific page exists yet.
  "platform-withdrawal": "/platforms",
  "client-management": "/client-management",
};

// Mirrors home/components/QuickAccess.tsx's tile styling so both dashboards'
// quick-access rows read as the same component even though the item lists
// differ (this one is MCA-specific: invoices, international accounts, forex).
const quickAccessCardClass = cn(
  "group flex h-auto w-[11rem] shrink-0 flex-col items-start gap-2 rounded-xl border border-border bg-card text-left sm:w-[11.5rem]",
  "px-3.5 pb-2.5 pt-3.5 shadow-sm transition-shadow duration-150",
  "hover:bg-muted/40 hover:shadow"
);

interface McaQuickAccessProps {
  /** Dashboard is currently in "customise" edit mode, hides the tile that
   * opens it (mirrors home/components/QuickAccess.tsx). */
  editMode?: boolean;
  onEditDashboard?: () => void;
}

export function McaQuickAccess({ editMode = false, onEditDashboard }: McaQuickAccessProps) {
  const router = useRouter();
  const [fxModalOpen, setFxModalOpen] = useState(false);

  function handleAction(id: string) {
    if (id === "customise-dashboard") {
      onEditDashboard?.();
      return;
    }
    if (id === "forex-calculator") {
      setFxModalOpen(true);
      return;
    }
    const href = QUICK_ACCESS_ROUTES[id];
    if (href) router.push(href);
  }

  return (
    <div className="w-full">
      <h2 className="mb-3 text-[15px] font-semibold tracking-[-0.02em] text-foreground sm:text-base">
        Quick access
      </h2>

      <div className="flex flex-wrap gap-2.5">
        {mcaQuickAccessItems.map((item) => {
          if (item.id === "customise-dashboard" && editMode) return null;
          return (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              onClick={() => handleAction(item.id)}
              className={quickAccessCardClass}
            >
              <Icon name={item.icon} className="h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span className="text-left text-[11px] font-medium leading-snug text-foreground sm:text-xs">
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>

      <FxCalculatorModal open={fxModalOpen} onOpenChange={setFxModalOpen} />
    </div>
  );
}
