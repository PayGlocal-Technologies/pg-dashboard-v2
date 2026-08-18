"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { mcaQuickAccessItems } from "@/features/dashboard/mca-home/mock-data";

// Mirrors home/components/QuickAccess.tsx's tile styling so both dashboards'
// quick-access rows read as the same component even though the item lists
// differ (this one is MCA-specific: invoices, international accounts, forex).
const quickAccessCardClass = cn(
  "group flex h-auto w-[9rem] shrink-0 flex-col items-start gap-2 rounded-xl border border-border bg-card text-left sm:w-[9.25rem]",
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
  function handleAction(label: string) {
    toast.message(label, { description: "This action isn't wired up yet." });
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
              onClick={() => {
                if (item.id === "customise-dashboard" && onEditDashboard) {
                  onEditDashboard();
                  return;
                }
                handleAction(item.label);
              }}
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
    </div>
  );
}
