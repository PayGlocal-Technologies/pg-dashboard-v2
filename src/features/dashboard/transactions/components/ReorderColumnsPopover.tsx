"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Popover, PopoverContent, PopoverTrigger, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

interface ReorderableColumn {
  key: string;
  label: string;
}

interface ReorderColumnsPopoverProps {
  columns: ReorderableColumn[];
  order: string[];
  onOrderChange: (order: string[]) => void;
  /** Discards any saved order so the table falls back to the column order
   *  buildMcaColumns declares. Separate from onOrderChange rather than
   *  passing the default order through it, since "no saved order" is its own
   *  state in the caller, not just another arrangement. */
  onReset: () => void;
}

// Same @dnd-kit drag pattern as the dashboard's widget reordering (see
// SortableDashboardWidget/DashboardWidgetCustomization), using a vertical
// list of rows here instead of a grid of tiles. Reordering is the only
// action (no remove).
function SortableColumnRow({ id, label }: { id: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground active:cursor-grabbing",
        isDragging ? "bg-muted opacity-90" : "hover:bg-muted/50"
      )}
      {...attributes}
      {...listeners}
    >
      <Icon name="grip-vertical" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function ReorderColumnsPopover({
  columns,
  order,
  onOrderChange,
  onReset,
}: ReorderColumnsPopoverProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const orderedColumns = order.map((k) => byKey.get(k)).filter((c): c is ReorderableColumn => !!c);
  // `columns` arrives in buildMcaColumns' declared order, which is exactly
  // what resetting falls back to, so comparing against it tells us whether
  // there's a custom arrangement to reset at all.
  const isCustomOrder = order.join("|") !== columns.map((c) => c.key).join("|");

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as string);
    const newIndex = order.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    onOrderChange(arrayMove(order, oldIndex, newIndex));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          // Same grip glyph the draggable rows inside the popover use (see
          // SortableColumnRow), so the button names the gesture it opens.
          leftIcon={<Icon name="grip-vertical" className="h-3.5 w-3.5" />}
          // h-auto/min-h-0/py-1: same compact height as the Upload Invoice
          // button and the filter chips, instead of Button's default sm
          // height (h-9).
          className="h-auto min-h-0 shrink-0 py-1 text-muted-foreground hover:text-foreground"
        >
          Reorder Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <p className="px-2 pb-1.5 text-[11px] font-medium text-muted-foreground">Drag to reorder</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-0.5">
              {orderedColumns.map((col) => (
                <SortableColumnRow key={col.key} id={col.key} label={col.label} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Secondary action, below the list and divided off from it so it
            reads as an escape hatch rather than another draggable row.
            Disabled while the order already is the default, so the button
            never suggests there's something to undo when there isn't. */}
        <Separator className="my-2" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="refresh" className="h-3 w-3" />}
          onClick={onReset}
          disabled={!isCustomOrder}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          Reset to defaults
        </Button>
      </PopoverContent>
    </Popover>
  );
}
