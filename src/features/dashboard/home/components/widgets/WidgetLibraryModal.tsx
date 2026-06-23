"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, Input } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  CATEGORY_ORDER,
  MIN_DASHBOARD_WIDGETS,
  WIDGET_CATALOG,
  type WidgetCategory,
  type WidgetId,
} from "@/features/dashboard/home/widget-catalog";
import { cn } from "@/lib/utils";
import { WidgetPickerTile } from "@/features/dashboard/home/components/widgets/WidgetPickerTile";

function emptyGrouped(): Record<WidgetCategory, typeof WIDGET_CATALOG> {
  const m = {} as Record<WidgetCategory, typeof WIDGET_CATALOG>;
  for (const c of CATEGORY_ORDER) m[c] = [];
  return m;
}

function filterCatalogByQuery(query: string): Record<WidgetCategory, typeof WIDGET_CATALOG> {
  const m = emptyGrouped();
  const q = query.trim().toLowerCase();
  for (const w of WIDGET_CATALOG) {
    if (!q) {
      m[w.category].push(w);
      continue;
    }
    const name = w.name.toLowerCase();
    const cat = w.category.toLowerCase();
    if (name.includes(q) || cat.includes(q) || w.id.toLowerCase().replace(/_/g, " ").includes(q)) {
      m[w.category].push(w);
    }
  }
  return m;
}

export function WidgetLibraryModal({
  open,
  onOpenChange,
  layout,
  onApplyLayout,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: WidgetId[];
  onApplyLayout: (next: WidgetId[]) => void;
}) {
  const [staged, setStaged] = useState<WidgetId[]>(layout);
  const [searchQuery, setSearchQuery] = useState("");
  const prevOpen = useRef(false);

  const grouped = useMemo(() => filterCatalogByQuery(searchQuery), [searchQuery]);
  const hasResults = useMemo(
    () => CATEGORY_ORDER.some((cat) => grouped[cat].length > 0),
    [grouped]
  );

  useEffect(() => {
    if (open && !prevOpen.current) {
      setStaged([...layout]);
      setSearchQuery("");
    }
    prevOpen.current = open;
  }, [open, layout]);

  const toggle = (id: WidgetId) => {
    setStaged((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= MIN_DASHBOARD_WIDGETS) {
          toast.message("Minimum widgets on dashboard", {
            description: `Keep at least ${MIN_DASHBOARD_WIDGETS} charts.`,
          });
          return prev;
        }
        return prev.filter((w) => w !== id);
      }
      return [...prev, id];
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleApply = () => {
    if (staged.length < MIN_DASHBOARD_WIDGETS) {
      toast.error("Not enough charts", {
        description: `Select at least ${MIN_DASHBOARD_WIDGETS} widgets.`,
      });
      return;
    }
    onApplyLayout(staged);
    onOpenChange(false);
    toast.success("Dashboard updated", { description: "Chart selection applied." });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={false}
        className={cn(
          "left-1/2 top-[4vh] max-h-[min(92vh,880px)] min-h-[min(34rem,calc(100vh-2.5rem))] w-[min(100%-1.5rem,56rem)] max-w-none -translate-x-1/2 translate-y-0",
          "flex flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-none"
        )}
      >
        <div className="shrink-0 border-b border-border px-6 pt-4 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0 flex-1">
              <DialogTitle className="pr-0">Add charts</DialogTitle>
              <DialogDescription className="mt-1 text-[12px] leading-snug text-muted-foreground">
                Choose charts and Apply. Reorder by dragging on your dashboard.
              </DialogDescription>
            </div>
            <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:shrink-0 sm:pt-0.5">
              <div className="relative min-w-0 flex-1 sm:w-[12.5rem] sm:flex-none">
                <Icon
                  name="search"
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground z-10"
                  aria-hidden
                />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search…"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-2.5 text-[13px] text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring/30"
                  aria-label="Search charts"
                />
              </div>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 min-h-9 w-9 shrink-0 gap-0 rounded-lg border-0 bg-transparent px-0 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <Icon name="x" className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </div>
        </div>

        <div className="flex min-h-[min(22rem,calc(92vh-12.5rem))] flex-1 flex-col overflow-y-auto bg-muted/40 px-6 py-5">
          {!hasResults ? (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
                aria-hidden
              >
                <Icon name="search" className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground tracking-tight">No charts found</h3>
              <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
                Nothing matches{" "}
                <span className="font-medium text-foreground">&ldquo;{searchQuery.trim()}&rdquo;</span>. Try another
                keyword or browse by category.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearchQuery("")}
                className="mt-6 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {CATEGORY_ORDER.map((cat) => {
                const items = grouped[cat];
                if (!items.length) return null;
                return (
                  <section key={cat}>
                    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {cat}
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {items.map((entry) => {
                        const selected = staged.includes(entry.id);
                        return (
                          <WidgetPickerTile
                            key={entry.id}
                            entry={entry}
                            selected={selected}
                            onToggle={() => toggle(entry.id)}
                          />
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-border bg-card px-5 py-3.5">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleApply}>
              Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
