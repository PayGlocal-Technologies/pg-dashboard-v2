"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import type { PaymentButton } from "@/features/dashboard/payment-button/types";

export interface PaymentButtonRowActionHandlers {
  onCopyCode: (row: PaymentButton) => void;
  onEdit: (row: PaymentButton) => void;
  onDisable: (row: PaymentButton) => void;
}

/**
 * Copy code, for a row. Its own component so the table can draw it in a column
 * next to the data while the card list keeps it beside the menu. A disabled
 * button has no live script, so there is nothing to copy (pg-dashboard greys
 * its Preview Button Code the same way).
 */
export function CopyCodeButton({
  row,
  isCopying,
  onCopyCode,
}: {
  row: PaymentButton;
  isCopying?: boolean;
  onCopyCode: (row: PaymentButton) => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={row.status === "DISABLED"}
      isLoading={isCopying}
      leftIcon={<Icon name="copy" className="h-3.5 w-3.5" />}
      onClick={() => onCopyCode(row)}
      className="h-auto min-h-0 whitespace-nowrap rounded-md px-3 py-1.5 text-[12px]"
    >
      Copy code
    </Button>
  );
}

/**
 * The row's overflow menu: Edit and Disable. Neither applies to a button that
 * is already disabled, as in pg-dashboard. Clicks here never open the details
 * page: DataTable's row handler skips buttons and menus.
 *
 * `showCopyCode` puts Copy code beside the menu, for the card list; the table
 * draws Copy code in its own column instead (see buildPaymentButtonColumns).
 */
export function PaymentButtonRowActions({
  row,
  isCopying,
  showCopyCode = false,
  onCopyCode,
  onEdit,
  onDisable,
}: PaymentButtonRowActionHandlers & {
  row: PaymentButton;
  isCopying?: boolean;
  showCopyCode?: boolean;
}) {
  const isDisabled = row.status === "DISABLED";

  return (
    <div className="flex items-center gap-3">
      {showCopyCode && <CopyCodeButton row={row} isCopying={isCopying} onCopyCode={onCopyCode} />}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Actions for ${row.buttonId}`}
            className="h-7 w-7 min-h-0 min-w-0 rounded-md p-0 text-muted-foreground hover:text-foreground"
          >
            <Icon name="more-horizontal" className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          <DropdownMenuItem disabled={isDisabled} onClick={() => onEdit(row)}>
            <Icon name="pencil" className="h-3.5 w-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isDisabled} onClick={() => onDisable(row)}>
            <Icon name="ban" className="h-3.5 w-3.5" />
            Disable
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
