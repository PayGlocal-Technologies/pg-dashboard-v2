"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { McaDashboardWidgetRenderer } from "@/features/dashboard/mca-home/components/widgets/McaDashboardWidgetRenderer";
import {
  MCA_WIDGET_BY_ID,
  MIN_MCA_DASHBOARD_WIDGETS,
  type McaWidgetId,
} from "@/features/dashboard/mca-home/widget-catalog";
import { cn } from "@/lib/utils";

export function SortableMcaDashboardWidget({
  id,
  editMode,
  layoutLength,
  isRemoving,
  onRemove,
}: {
  id: McaWidgetId;
  editMode: boolean;
  layoutLength: number;
  isRemoving: boolean;
  onRemove: (id: McaWidgetId) => void;
}) {
  const meta = MCA_WIDGET_BY_ID[id];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { type: "sortable" as const },
    disabled: !editMode,
    animateLayoutChanges: () => false,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 30 : undefined,
  };

  const canRemove = layoutLength > MIN_MCA_DASHBOARD_WIDGETS;

  const colSpanClass: Record<typeof meta.lgColSpan, string> = {
    4: "lg:col-span-4",
    8: "lg:col-span-8",
    12: "lg:col-span-12",
  };
  const colSpan = colSpanClass[meta.lgColSpan];

  const removeBtnClass = cn(
    "absolute right-2 top-2 z-30 inline-flex h-8 min-h-0 w-8 items-center justify-center gap-0 rounded-lg border-0 bg-transparent px-0 py-0 text-muted-foreground transition-colors",
    "hover:bg-muted hover:text-foreground",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
    canRemove ? "cursor-pointer" : "cursor-not-allowed opacity-40"
  );

  const removeControl = canRemove ? (
    <Button
      type="button"
      variant="ghost"
      aria-label={`Remove ${meta.name}`}
      className={removeBtnClass}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onRemove(id);
      }}
    >
      <Icon name="x" className="h-4 w-4" strokeWidth={2} aria-hidden />
    </Button>
  ) : (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="absolute right-2 top-2 z-30 inline-flex">
            <Button
              type="button"
              variant="ghost"
              aria-label={`Remove ${meta.name}`}
              aria-disabled
              title={`Minimum ${MIN_MCA_DASHBOARD_WIDGETS} widgets required`}
              disabled
              className={removeBtnClass}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Icon name="x" className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent
          className="z-[200] rounded-lg border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
          sideOffset={4}
        >
          Minimum {MIN_MCA_DASHBOARD_WIDGETS} widgets required
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const body = (
    <div
      className={cn(
        "relative h-full transition-[opacity,transform] duration-200 ease-out",
        isRemoving && "scale-[0.85] opacity-0"
      )}
    >
      {editMode && removeControl}
      {editMode && (
        <div
          className="pointer-events-none absolute left-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/95 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100"
          aria-hidden
        >
          <Icon name="grip-vertical" className="h-4 w-4" />
        </div>
      )}
      <McaDashboardWidgetRenderer widgetId={id} />
    </div>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(colSpan, "group min-w-0 touch-none", isDragging && "opacity-[0.92]")}
    >
      {editMode ? (
        <div
          className={cn(
            "relative h-full rounded-xl p-[2px] transition-shadow duration-150",
            "hover:shadow-[0_0_0_3px_rgba(0,97,227,0.12)] dark:hover:shadow-[0_0_0_3px_rgba(59,130,246,0.2)]",
            "cursor-grab active:cursor-grabbing",
            /* Recharts / inner cards use pointer or default; force grab for drag affordance */
            "[&_*]:!cursor-grab [&_*]:active:!cursor-grabbing",
            "[&_button]:!cursor-pointer [&_button]:active:!cursor-pointer",
            "[&_[role='button']]:!cursor-pointer [&_[role='button']]:active:!cursor-pointer"
          )}
          style={{ border: "1.5px dashed var(--primary-border)" }}
          {...listeners}
          {...attributes}
        >
          {body}
        </div>
      ) : (
        body
      )}
    </div>
  );
}
