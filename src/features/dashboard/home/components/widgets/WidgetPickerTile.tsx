"use client";

import type { KeyboardEvent } from "react";
import { Icon } from "@/components/icon";
import { DashboardWidgetRenderer } from "@/features/dashboard/home/components/widgets/DashboardWidgetRenderer";
import type { WidgetCatalogEntry } from "@/features/dashboard/home/widget-catalog";
import { cn } from "@/lib/utils";

export function WidgetPickerTile({
  entry,
  selected,
  onToggle,
}: {
  entry: WidgetCatalogEntry;
  selected: boolean;
  onToggle: () => void;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={onKeyDown}
      className={cn(
        "group relative w-full cursor-pointer rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-[border-color,box-shadow,opacity] outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/35 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-primary ring-1 ring-primary/25"
          : "hover:border-muted-foreground/30 hover:shadow-md"
      )}
      aria-pressed={selected}
      aria-label={
        selected
          ? `${entry.name}, selected. Click to remove from dashboard.`
          : `${entry.name}. Click to add to dashboard.`
      }
    >
      <div className="mb-2 flex items-start justify-between gap-2 pr-1">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-foreground leading-snug">{entry.name}</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">Tap to {selected ? "remove" : "add"}</p>
        </div>
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-transparent group-hover:border-muted-foreground/50"
          )}
          aria-hidden
        >
          {selected && <Icon name="check" className="h-3.5 w-3.5 stroke-[2.5]" />}
        </span>
      </div>

      {/* Preview: no scale — padding + min-height avoids clipping (Recharts needs space) */}
      <div className="rounded-lg border border-border bg-muted/50 p-3 sm:p-4">
        <div className="min-h-[168px] w-full min-w-0">
          <DashboardWidgetRenderer widgetId={entry.id} preview />
        </div>
      </div>
    </div>
  );
}
