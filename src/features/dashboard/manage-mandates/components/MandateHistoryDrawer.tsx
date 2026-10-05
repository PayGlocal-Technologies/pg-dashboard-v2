"use client";

import {
  Badge,
  Card,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  IconButton,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { useMandateHistory } from "@/features/dashboard/manage-mandates/hooks";
import { siDataRows } from "@/features/dashboard/manage-mandates/helpers";
import type { Mandate } from "@/features/dashboard/manage-mandates/types";

/**
 * A mandate's change log, pg-dashboard's MandateHistoryDrawer: one card per
 * change, newest first, each with its action and the SI's values at that
 * point. Every entry is open at once rather than in an accordion: the list is
 * short and read top to bottom.
 */
export function MandateHistoryDrawer({
  row,
  onOpenChange,
}: {
  row: Mandate | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { entries, isLoading, isError } = useMandateHistory(row);

  return (
    <Drawer open={!!row} onOpenChange={onOpenChange}>
      <DrawerContent className="w-full sm:w-[32rem] sm:max-w-[92vw] [&>button:last-child]:hidden">
        <DrawerHeader className="flex shrink-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <DrawerTitle className="pr-0 text-lg">Mandate history</DrawerTitle>
            {row && (
              <DrawerDescription className="truncate font-mono">SI ID {row.siId}</DrawerDescription>
            )}
          </div>
          <IconButton
            aria-label="Close"
            variant="ghost"
            size="sm"
            className="-mr-2 -mt-1 shrink-0"
            onClick={() => onOpenChange(false)}
          >
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </DrawerHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-6">
          {isLoading ? (
            [0, 1, 2].map((i) => <Shimmer key={i} className="h-36 w-full" />)
          ) : isError ? (
            <PlaceholderState
              variant="error"
              size="sm"
              title="Couldn't load this mandate's history"
              description="Something went wrong while fetching it. Close and try again."
            />
          ) : entries.length === 0 ? (
            <PlaceholderState
              variant="empty-table"
              size="sm"
              title="No changes recorded"
              description="Each change to this mandate is listed here."
            />
          ) : (
            entries.map((entry) => {
              const fields = siDataRows(entry.siData);
              return (
                <Card key={entry.updateTime} className="gap-0 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-foreground">
                      {entry.formattedUpdateTime || "SI data"}
                    </span>
                    {entry.action && (
                      <Badge variant="outline" size="sm">
                        {entry.action}
                      </Badge>
                    )}
                  </div>
                  {fields.length > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                      {fields.map((field) => (
                        <div key={field.label} className="min-w-0">
                          <dt className="text-[11.5px] text-muted-foreground">{field.label}</dt>
                          <dd className="mt-0.5 truncate text-[13px] font-medium text-foreground">
                            {field.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </Card>
              );
            })
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
