"use client";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  IconButton,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { PaLinkedTransactionsTable } from "@/features/dashboard/pa-transactions/components/PaLinkedTransactionsTable";
import type { Mandate } from "@/features/dashboard/manage-mandates/types";

/**
 * The payments collected under one SI: pg-dashboard opens its PA transactions
 * table searched by the SI ID, scoped to the mandate's MID, in a wide drawer.
 * Same here, with the shared linked-transactions table.
 */
export function SiTransactionsDrawer({
  row,
  onOpenChange,
}: {
  row: Mandate | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Drawer open={!!row} onOpenChange={onOpenChange}>
      <DrawerContent className="w-full sm:w-[80rem] sm:max-w-[92vw] [&>button:last-child]:hidden">
        <DrawerHeader className="flex shrink-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <DrawerTitle className="pr-0 text-lg">SI transactions</DrawerTitle>
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

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {row && (
            <PaLinkedTransactionsTable
              mid={row.mid}
              searchQuery={row.siId}
              emptyDescription="Each payment collected on this SI lands here with its status and method."
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
