"use client";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  type Column,
} from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { RowClick } from "@/components/common/table/RowClick";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import {
  FREQUENCY_LABELS,
  getInvoiceStatusMeta,
} from "@/features/dashboard/mca-invoices/constants";
import type { McaInvoiceRow } from "@/features/dashboard/mca-invoices/types";

export interface InvoiceRowHandlers {
  /** Row click and the primary CTA: drafts reopen in the editor, the rest
   *  open their document. */
  onOpenRow: (row: McaInvoiceRow) => void;
  onLinkTransaction: (row: McaInvoiceRow) => void;
  onDelete: (row: McaInvoiceRow) => void;
  onDuplicate: (row: McaInvoiceRow) => void;
  onDownload: (row: McaInvoiceRow) => void;
  onMarkAsPaid: (row: McaInvoiceRow) => void;
}

interface RowAction {
  key: string;
  label: string;
  icon: IconName;
  onSelect: () => void;
}

/**
 * Which actions a row offers, by status.
 *
 * Copied from pg-dashboard's getMenuItems, including that Duplicate is
 * withheld from UPLOADED invoices (there is no draft to copy for a document
 * the merchant uploaded rather than composed) and that a DRAFT has neither
 * Download nor Mark as Paid, since no document exists and nothing is owed yet.
 */
export function buildInvoiceRowActions(
  row: McaInvoiceRow,
  handlers: InvoiceRowHandlers
): RowAction[] {
  const duplicate: RowAction = {
    key: "duplicate",
    label: "Duplicate invoice",
    icon: "copy",
    onSelect: () => handlers.onDuplicate(row),
  };
  const remove: RowAction = {
    key: "delete",
    label: "Delete invoice",
    icon: "trash-2",
    onSelect: () => handlers.onDelete(row),
  };
  const download: RowAction = {
    key: "download",
    label: "Download invoice",
    icon: "download",
    onSelect: () => handlers.onDownload(row),
  };

  switch (row.status) {
    case "ACTIVE":
    case "OUTSTANDING":
      return [
        {
          key: "link-transaction",
          label: "Link transaction",
          icon: "link",
          onSelect: () => handlers.onLinkTransaction(row),
        },
        remove,
        ...(row.type !== "UPLOADED" ? [duplicate] : []),
        download,
        {
          key: "mark-as-paid",
          label: "Mark as paid",
          icon: "check-circle",
          onSelect: () => handlers.onMarkAsPaid(row),
        },
      ];
    case "DRAFT":
      return [remove, duplicate];
    case "PAID":
    case "PAID_OUTSIDE":
      return [...(row.type !== "UPLOADED" ? [duplicate] : []), download];
    default:
      return [];
  }
}

function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  if (actions.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton
          aria-label="More actions"
          variant="ghost"
          size="sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Icon name="more-horizontal" className="h-4 w-4" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {actions.map((action) => (
          // No preventDefault: calling it in Radix's onSelect suppresses the
          // menu's own close behaviour, which left the menu sitting open behind
          // the confirmation dialog. That pattern is only needed when the
          // dialog is rendered inside the menu; these are siblings at table
          // level, so letting the menu close normally is correct.
          <DropdownMenuItem key={action.key} onSelect={() => action.onSelect()}>
            <Icon name={action.icon} className="mr-2 h-3.5 w-3.5" />
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Imported from Zoho", production's own mark beside the invoice number. */
function ZohoMark() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex shrink-0 items-center">
            <Icon name="zoho-logo" className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Imported from Zoho</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RecurringMark() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex shrink-0 items-center text-primary" aria-label="Recurring invoice">
            <Icon name="recurring-outlined" className="h-3.5 w-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Recurring invoice</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Invoice list columns.
 *
 * Column set, order and conditional visibility are pg-dashboard's
 * MCA_INVOICES_COLUMNS; the cell rendering follows the MCA transactions table
 * so the two read as one product (RowClick-wrapped cells, 13px body text,
 * StatusBadge, a hover-revealed CTA plus an overflow menu in Actions).
 */
export function buildInvoiceColumns(
  handlers: InvoiceRowHandlers,
  options: { showMid: boolean; showFrequency: boolean }
): Column<McaInvoiceRow>[] {
  const { showMid, showFrequency } = options;
  const open = handlers.onOpenRow;

  const cols: Column<McaInvoiceRow>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice Number",
      minWidth: 190,
      render: (row) => (
        <RowClick onClick={() => open(row)}>
          <div className="flex items-center gap-2">
            {row.source === "ZOHO" && <ZohoMark />}
            <span className="truncate text-[13px] font-medium text-foreground">
              {row.invoiceNumber || "—"}
            </span>
            {row.type === "RECURRING" && <RecurringMark />}
          </div>
        </RowClick>
      ),
    },
    {
      key: "totalAmount",
      header: "Amount",
      minWidth: 150,
      align: "right",
      render: (row) => {
        const amount = parseFloat(row.totalAmount ?? "0");
        const currency = row.currency ?? "INR";
        return (
          <RowClick onClick={() => open(row)} align="right">
            <span className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-[13px] font-semibold tabular-nums text-foreground">
                {formatCurrency(amount, currency, "en-IN")}
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">{currency}</span>
            </span>
          </RowClick>
        );
      },
    },
    {
      key: "clientName",
      header: "Client Name",
      minWidth: 170,
      render: (row) => (
        <RowClick onClick={() => open(row)}>
          <span className="block w-[150px] truncate text-[13px] text-foreground">
            {row.clientName || "—"}
          </span>
        </RowClick>
      ),
    },
    {
      key: "clientBusinessName",
      header: "Business Name",
      minWidth: 180,
      render: (row) => (
        <RowClick onClick={() => open(row)}>
          <span className="block w-[160px] truncate text-[13px] text-muted-foreground">
            {row.clientBusinessName || "—"}
          </span>
        </RowClick>
      ),
    },
    {
      key: "status",
      header: "Status",
      minWidth: 140,
      render: (row) => {
        const { label, variant } = getInvoiceStatusMeta(row.status);
        return (
          <RowClick onClick={() => open(row)}>
            <StatusBadge variant={variant} label={label} size="sm" />
          </RowClick>
        );
      },
    },
    {
      key: "invoiceDate",
      header: "Invoice Date",
      minWidth: 140,
      render: (row) => (
        <RowClick onClick={() => open(row)}>
          <span className="whitespace-nowrap text-[13px] text-muted-foreground">
            {row.invoiceDate ? formatDate(row.invoiceDate) : "—"}
          </span>
        </RowClick>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      minWidth: 140,
      render: (row) => (
        <RowClick onClick={() => open(row)}>
          <span className="whitespace-nowrap text-[13px] text-muted-foreground">
            {row.dueDate ? formatDate(row.dueDate) : "—"}
          </span>
        </RowClick>
      ),
    },
    {
      key: "action",
      header: "Actions",
      minWidth: 175,
      align: "left",
      render: (row) => {
        const actions = buildInvoiceRowActions(row, handlers);
        const isDraft = row.status === "DRAFT";

        return (
          <RowClick onClick={() => open(row)}>
            <div className="flex items-center gap-1">
              {/* A draft's one obvious next step is finishing it, so that
                  stays a labelled button rather than hiding behind "…" —
                  the same treatment Upload Invoice gets on transactions.
                  Everything else reveals a View button on hover only, so
                  the column stays quiet while scanning.

                  The CTA sits in a shared min-width slot: "Continue" is the
                  wider of the two labels, and without a common footprint the
                  overflow "…" landed at a different x on draft rows than on
                  active/paid ones. min-w rather than w so an unexpectedly wide
                  label pushes the menu out instead of overlapping it. */}
              <span className="flex min-w-[84px] shrink-0 items-center">
                {isDraft ? (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Icon name="pencil" className="h-3 w-3" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      open(row);
                    }}
                    className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px]"
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Icon name="eye" className="h-3 w-3" />}
                    onClick={(e) => {
                      e.stopPropagation();
                      open(row);
                    }}
                    className="h-auto min-h-0 gap-1 whitespace-nowrap rounded-md px-2 py-1 text-[11px] opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100"
                  >
                    View
                  </Button>
                )}
              </span>

              {/* Fixed slot too: PAID_OUTSIDE/UPLOADED rows can end up with no
                  menu items at all, and an absent trigger would otherwise pull
                  the column's right edge in on those rows alone. */}
              <span className="flex w-8 shrink-0 items-center justify-center">
                <RowActionsMenu actions={actions} />
              </span>
            </div>
          </RowClick>
        );
      },
    },
  ];

  // Frequency sits right after the number, and only on the Recurring view —
  // production gates it on `selectedTag === "recurring"`.
  if (showFrequency) {
    cols.splice(1, 0, {
      key: "recurringType",
      header: "Frequency",
      minWidth: 160,
      render: (row) => (
        <RowClick onClick={() => open(row)}>
          <span className="whitespace-nowrap text-[13px] text-muted-foreground">
            {row.recurringType ? (FREQUENCY_LABELS[row.recurringType] ?? row.recurringType) : "—"}
          </span>
        </RowClick>
      ),
    });
  }

  // Only meaningful when the merchant actually has several MIDs in one list.
  if (showMid) {
    cols.unshift({
      key: "mid",
      header: "Merchant ID",
      minWidth: 150,
      render: (row) => (
        <RowClick onClick={() => open(row)}>
          <span className="whitespace-nowrap text-[13px] text-muted-foreground">
            {row.mid || "—"}
          </span>
        </RowClick>
      ),
    });
  }

  return cols;
}
