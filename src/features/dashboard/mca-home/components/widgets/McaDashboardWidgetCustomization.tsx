"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { McaDashboardWidgetRenderer } from "@/features/dashboard/mca-home/components/widgets/McaDashboardWidgetRenderer";
import { SortableMcaDashboardWidget } from "@/features/dashboard/mca-home/components/widgets/SortableMcaDashboardWidget";
import { McaWidgetLibraryModal } from "@/features/dashboard/mca-home/components/widgets/McaWidgetLibraryModal";
import {
  MIN_MCA_DASHBOARD_WIDGETS,
  type McaWidgetId,
} from "@/features/dashboard/mca-home/widget-catalog";
import { cn } from "@/lib/utils";

export const MCA_DASHBOARD_DROP_ZONE_ID = "mca-dashboard-drop-zone";
const REMOVE_ANIMATION_MS = 200;

function DropGridShell({ editMode, children }: { editMode: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: MCA_DASHBOARD_DROP_ZONE_ID,
    disabled: !editMode,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "grid grid-cols-1 gap-4 lg:grid-cols-12",
        editMode &&
          cn(
            "min-h-[120px] rounded-xl border-[1.5px] border-dashed border-[var(--primary-border)] p-3 transition-[box-shadow,background-color] duration-150",
            isOver &&
              "bg-primary-light/40 shadow-[inset_0_0_0_2px_rgba(0,97,227,0.12)] dark:shadow-[inset_0_0_0_2px_rgba(59,130,246,0.15)]"
          )
      )}
    >
      {children}
    </div>
  );
}

function layoutsEqual(a: McaWidgetId[], b: McaWidgetId[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export function McaDashboardWidgetCustomization({
  layout,
  onLayoutChange,
  editMode,
  onDiscardEdit,
  onDoneEdit,
}: {
  layout: McaWidgetId[];
  onLayoutChange: (next: McaWidgetId[] | ((prev: McaWidgetId[]) => McaWidgetId[])) => void;
  editMode: boolean;
  onDiscardEdit: () => void;
  onDoneEdit: () => void;
}) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [activeSort, setActiveSort] = useState<McaWidgetId | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<McaWidgetId>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6, delay: 0, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragStart = (e: DragStartEvent) => {
    if (e.active.data.current?.type === "sortable") {
      setActiveSort(e.active.id as McaWidgetId);
    }
  };

  const onDragCancel = () => setActiveSort(null);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveSort(null);

    if (!over || active.id === over.id) return;

    const prev = layout;
    if (!prev.includes(active.id as McaWidgetId) || !prev.includes(over.id as McaWidgetId)) return;

    const oldIndex = prev.indexOf(active.id as McaWidgetId);
    const newIndex = prev.indexOf(over.id as McaWidgetId);
    const next = arrayMove(prev, oldIndex, newIndex);
    if (!layoutsEqual(prev, next)) {
      onLayoutChange(next);
      toast.success("Layout updated", { description: "Widgets reordered." });
    }
  };

  const handleApplyLibrary = useCallback(
    (next: McaWidgetId[]) => {
      onLayoutChange(next);
    },
    [onLayoutChange]
  );

  const handleRemove = useCallback(
    (wid: McaWidgetId) => {
      if (layout.length <= MIN_MCA_DASHBOARD_WIDGETS) return;
      setRemovingIds((s) => new Set(s).add(wid));
      window.setTimeout(() => {
        onLayoutChange((prev) => prev.filter((w) => w !== wid));
        setRemovingIds((s) => {
          const n = new Set(s);
          n.delete(wid);
          return n;
        });
        toast.success("Widget removed");
      }, REMOVE_ANIMATION_MS);
    },
    [layout.length, onLayoutChange]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <div className="space-y-3">
        {editMode && (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-primary-light/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground" role="status" aria-live="polite">
              Use <strong className="font-semibold">Add widgets</strong> to pick cards, then{" "}
              <strong className="font-semibold">drag</strong> tiles to reorder.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Icon name="layout-grid" className="h-3.5 w-3.5" />}
                onClick={() => setLibraryOpen(true)}
              >
                Add widgets
              </Button>
              <Button variant="primary" size="sm" onClick={onDoneEdit}>
                Done
              </Button>
              <Button
                type="button"
                variant="link"
                className="h-auto min-h-0 px-1 text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={onDiscardEdit}
              >
                Cancel editing
              </Button>
            </div>
          </div>
        )}

        <DropGridShell editMode={editMode}>
          <SortableContext items={layout} strategy={rectSortingStrategy}>
            {layout.map((wid) => (
              <SortableMcaDashboardWidget
                key={wid}
                id={wid}
                editMode={editMode}
                layoutLength={layout.length}
                isRemoving={removingIds.has(wid)}
                onRemove={handleRemove}
              />
            ))}
          </SortableContext>
        </DropGridShell>
      </div>

      <McaWidgetLibraryModal
        open={libraryOpen && editMode}
        onOpenChange={setLibraryOpen}
        layout={layout}
        onApplyLayout={handleApplyLibrary}
      />

      <DragOverlay
        dropAnimation={{ duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" }}
        style={{ zIndex: 200 }}
      >
        {activeSort && (
          <div className="widget-dnd-overlay w-[min(100vw-2rem,300px)] cursor-grabbing rounded-xl border border-border bg-card p-2 shadow-2xl">
            <McaDashboardWidgetRenderer widgetId={activeSort} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
