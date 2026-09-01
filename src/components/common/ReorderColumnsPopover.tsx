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
import {
  Button,
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
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
  /** Column keys currently hidden. Omit to disable the visibility controls
   *  entirely and keep this a reorder-only popover. */
  hiddenKeys?: string[];
  onHiddenKeysChange?: (hidden: string[]) => void;
  /** Columns that must always be shown — the ones the table is meaningless
   *  without. Rendered with a locked checkbox, matching pg-dashboard's
   *  "Fixed Columns" group. */
  fixedKeys?: string[];
  /**
   * Why a fixed column cannot be hidden, shown on hover and focus.
   *
   * Required in spirit rather than in the type: a control that is disabled and
   * silent about it is the thing a DQA pass called out, so every caller should
   * say something. The default is deliberately generic so a missing one is
   * still an answer rather than an empty tooltip.
   */
  fixedReason?: string;
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
interface ColumnVisibility {
  checked: boolean;
  /** Locked on, with a reason. Renders grey rather than as an active choice. */
  lockedReason?: string;
  onToggle: () => void;
}

function SortableColumnRow({
  id,
  label,
  visibility,
}: {
  id: string;
  label: string;
  visibility?: ColumnVisibility;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
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
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground",
        isDragging ? "bg-muted opacity-90" : "hover:bg-muted/50"
      )}
    >
      {/* Drag listeners live on the grip and the label, not the row, so the
          checkbox stays clickable instead of being swallowed by a drag. */}
      <span
        className="flex min-w-0 flex-1 cursor-grab items-center gap-2 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <Icon name="grip-vertical" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{label}</span>
      </span>
      {visibility &&
        (visibility.lockedReason ? (
          /**
           * A locked column, and two DQA points in one control.
           *
           * It renders grey, not the primary blue a live ticked box uses: blue
           * says "you chose this", and nobody chose this. And it explains
           * itself, because a disabled control that stays silent leaves the
           * merchant to guess whether they are doing something wrong.
           *
           * The tooltip hangs off a wrapping span rather than the Checkbox: a
           * disabled control receives no pointer events, so a trigger on the
           * box itself would never fire. The span also carries the
           * not-allowed cursor and is focusable, so the reason is reachable by
           * keyboard as well as hover.
           */
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="shrink-0 cursor-not-allowed rounded-sm">
                  <Checkbox
                    checked
                    disabled
                    aria-label={`${label} column is always shown`}
                    className="pointer-events-none border-border opacity-100 data-[state=checked]:border-border data-[state=checked]:bg-muted-foreground/40 data-[state=checked]:text-foreground/70"
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-[15rem]">{visibility.lockedReason}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Checkbox
            checked={visibility.checked}
            onCheckedChange={visibility.onToggle}
            aria-label={`Show ${label} column`}
            className="shrink-0"
          />
        ))}
    </div>
  );
}

export function ReorderColumnsPopover({
  columns,
  order,
  onOrderChange,
  onReset,
  hiddenKeys,
  onHiddenKeysChange,
  fixedKeys = [],
  fixedReason = "Always shown. The table needs this column to make sense.",
}: ReorderColumnsPopoverProps) {
  const canToggleVisibility = !!hiddenKeys && !!onHiddenKeysChange;
  const hidden = hiddenKeys ?? [];

  const toggleVisibility = (key: string) => {
    if (!onHiddenKeysChange || fixedKeys.includes(key)) return;
    onHiddenKeysChange(hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key]);
  };
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const orderedColumns = order.map((k) => byKey.get(k)).filter((c): c is ReorderableColumn => !!c);
  // `columns` arrives in buildMcaColumns' declared order, which is exactly
  // what resetting falls back to, so comparing against it tells us whether
  // there's a custom arrangement to reset at all.
  const isCustomOrder =
    order.join("|") !== columns.map((c) => c.key).join("|") || hidden.length > 0;

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
          Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <p className="px-2 pb-1.5 text-[11px] font-medium text-muted-foreground">
          {canToggleVisibility ? "Drag to reorder · tick to show" : "Drag to reorder"}
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-0.5">
              {orderedColumns.map((col) => (
                <SortableColumnRow
                  key={col.key}
                  id={col.key}
                  label={col.label}
                  visibility={
                    canToggleVisibility
                      ? {
                          checked: !hidden.includes(col.key),
                          // A fixed column keeps a box rather than having none,
                          // so the list reads as one set of columns with some
                          // locked, not two lists.
                          lockedReason: fixedKeys.includes(col.key) ? fixedReason : undefined,
                          onToggle: () => toggleVisibility(col.key),
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Secondary action, below the list and divided off from it so it
            reads as an escape hatch rather than another draggable row. */}
        <Separator className="my-2" />
        {isCustomOrder ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="refresh" className="h-3 w-3" />}
            onClick={onReset}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            Reset to defaults
          </Button>
        ) : (
          /* Nothing to undo. This used to render as a disabled button, which
             offers an action and then refuses it; saying the columns already
             are the default answers the question the button was raising. */
          <p className="px-2 py-1.5 text-[12px] text-muted-foreground">
            Columns are in their default order.
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
