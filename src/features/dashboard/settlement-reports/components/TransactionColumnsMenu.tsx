"use client";

import { useState } from "react";
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
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export interface ColumnToggleItem {
  key: string;
  label: string;
}

interface SortableRowProps {
  item: ColumnToggleItem;
  checked: boolean;
  onToggle: () => void;
}

function SortableRow({ item, checked, onToggle }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.key,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-lg px-1.5 py-1.5",
        isDragging && "z-10 bg-muted shadow-sm"
      )}
    >
      <Button
        type="button"
        variant="ghost"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${item.label}`}
        className="h-5 w-5 min-h-0 min-w-0 shrink-0 cursor-grab touch-none rounded p-0 text-muted-foreground/60 hover:text-muted-foreground active:cursor-grabbing"
      >
        <Icon name="grip-vertical" size={13} />
      </Button>
      <Checkbox checked={checked} onCheckedChange={onToggle} />
      <span className="text-[13px] text-foreground">{item.label}</span>
    </div>
  );
}

interface TransactionColumnsMenuProps {
  items: ColumnToggleItem[];
  order: string[];
  hidden: Set<string>;
  onOrderChange: (order: string[]) => void;
  onToggle: (key: string) => void;
  onReset: () => void;
}

export function TransactionColumnsMenu({
  items,
  order,
  hidden,
  onOrderChange,
  onToggle,
  onReset,
}: TransactionColumnsMenuProps) {
  const [open, setOpen] = useState(false);

  const itemsByKey = new Map(items.map((i) => [i.key, i]));
  const orderedItems = order
    .map((k) => itemsByKey.get(k))
    .filter((i): i is ColumnToggleItem => !!i);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(active.id as string);
    const newIndex = order.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    onOrderChange(arrayMove(order, oldIndex, newIndex));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon name="sliders-horizontal" className="h-3.5 w-3.5" />}
        >
          Reorder Columns
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Drag to reorder</p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-0.5">
              {orderedItems.map((item) => (
                <SortableRow
                  key={item.key}
                  item={item}
                  checked={!hidden.has(item.key)}
                  onToggle={() => onToggle(item.key)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <Separator className="my-2" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          leftIcon={<Icon name="refresh" className="h-3 w-3" />}
          className="h-auto min-h-0 w-full justify-start gap-1.5 p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          Reset to defaults
        </Button>
      </PopoverContent>
    </Popover>
  );
}
