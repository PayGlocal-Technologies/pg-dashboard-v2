"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import type { MandateActionAvailability } from "@/features/dashboard/manage-mandates/helpers";
import type { Mandate } from "@/features/dashboard/manage-mandates/types";

export interface MandateRowActionHandlers {
  onPause: (row: Mandate) => void;
  onActivate: (row: Mandate) => void;
  onDisable: (row: Mandate) => void;
  onViewHistory: (row: Mandate) => void;
}

/**
 * The row's overflow menu. Actions that don't apply to a row are left out
 * rather than greyed, as pg-dashboard hides them; View history is always
 * there. Clicks here never reach the row: DataTable skips buttons and menus.
 */
export function MandateRowActions({
  row,
  available,
  onPause,
  onActivate,
  onDisable,
  onViewHistory,
}: MandateRowActionHandlers & { row: Mandate; available: MandateActionAvailability }) {
  const hasStatusAction = available.pause || available.activate || available.disable;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Actions for mandate ${row.maskedMandateId}`}
          // Card fill and border: it floats over the row's last cells (see
          // the table), so it has to cover the text beneath it.
          className="h-7 w-7 min-h-0 min-w-0 rounded-md border border-border bg-card p-0 text-muted-foreground shadow-sm hover:bg-card hover:text-foreground"
        >
          <Icon name="more-horizontal" className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {available.pause && (
          <DropdownMenuItem onClick={() => onPause(row)}>
            <Icon name="pause" className="h-3.5 w-3.5" />
            Pause mandate
          </DropdownMenuItem>
        )}
        {available.activate && (
          <DropdownMenuItem onClick={() => onActivate(row)}>
            <Icon name="play" className="h-3.5 w-3.5" />
            Activate mandate
          </DropdownMenuItem>
        )}
        {available.disable && (
          <DropdownMenuItem onClick={() => onDisable(row)}>
            <Icon name="ban" className="h-3.5 w-3.5" />
            Disable mandate
          </DropdownMenuItem>
        )}
        {hasStatusAction && <DropdownMenuSeparator />}
        <DropdownMenuItem onClick={() => onViewHistory(row)}>
          <Icon name="history" className="h-3.5 w-3.5" />
          View history
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
