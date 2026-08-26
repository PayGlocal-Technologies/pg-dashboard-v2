"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  DataTable,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  StatusBadge,
  type Column,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency, formatTransactionDateOnly } from "@/lib/utils/format";
import { clientAmountLocale } from "@/features/dashboard/client-management/constants";
import {
  useClientInvoices,
  useInvoiceRowActions,
} from "@/features/dashboard/client-management/hooks";
import type {
  ClientInvoice,
  ClientInvoiceStatus,
} from "@/features/dashboard/client-management/types";

/**
 * The five statuses an invoice can be in, with the labels and the order
 * pg-dashboard's own ledger filter uses (CLIENT_LEDGER_FILTERS).
 */
const INVOICE_STATUS_OPTIONS: { value: ClientInvoiceStatus; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "ACTIVE", label: "Active" },
  { value: "OUTSTANDING", label: "Outstanding" },
  { value: "PAID", label: "Paid" },
  { value: "PAID_OUTSIDE", label: "Paid Outside" },
];

/** How each status reads as a badge. Paid states are successes, outstanding is
 *  the one that wants attention, and a draft has not been raised yet. */
const INVOICE_STATUS_TONE: Record<ClientInvoiceStatus, "success" | "warning" | "info" | "muted"> = {
  DRAFT: "muted",
  ACTIVE: "info",
  OUTSTANDING: "warning",
  PAID: "success",
  PAID_OUTSIDE: "success",
};

const INVOICE_STATUS_LABEL: Record<ClientInvoiceStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  OUTSTANDING: "Outstanding",
  PAID: "Paid",
  PAID_OUTSIDE: "Paid Outside",
};

/** The row's overflow menu: the three actions production offers here. Built the
 *  same way SkuRowActions is — a flux Button as an `asChild` trigger with its
 *  open state held locally, so only one menu is ever open. */
function InvoiceRowActions({
  invoice,
  onDuplicate,
  onDelete,
  onDownload,
}: {
  invoice: ClientInvoice;
  onDuplicate: (invoice: ClientInvoice) => void;
  onDelete: (invoice: ClientInvoice) => void;
  onDownload: (invoice: ClientInvoice) => void;
}) {
  const [open, setOpen] = useState(false);

  // Every item closes the menu before acting, so nothing is left stacked over
  // whatever the action opens.
  const select = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  const item = (
    icon: "copy" | "download" | "trash-2",
    label: string,
    onSelect: () => void,
    destructive = false
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onSelect}
      // Through leftIcon, not as a child alongside the label. Button wraps its
      // children in a plain non-flex <span>, and preflight renders an <svg> as
      // display:block — so an Icon passed as a child takes a line of its own above
      // the label, and the button's own gap/items-center never reach it. The
      // leftIcon slot is a direct flex child of the button, which is what puts the
      // two on one line.
      leftIcon={<Icon name={icon} className="h-3.5 w-3.5 shrink-0" />}
      className={cn(
        "h-auto min-h-0 w-full justify-start gap-2 rounded-md px-2 py-1.5 text-[13px] font-normal",
        destructive && "text-destructive hover:text-destructive"
      )}
    >
      {label}
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={`Actions for invoice ${invoice.invoiceNumber}`}
          aria-haspopup="menu"
          className="h-8 w-8 min-h-0 shrink-0 rounded-lg p-0 text-muted-foreground hover:text-foreground [&>span]:flex [&>span]:items-center [&>span]:justify-center"
        >
          <Icon name="more-horizontal" className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={8} className="w-44 p-1">
        {item(
          "download",
          "Download invoice",
          select(() => onDownload(invoice))
        )}
        {item(
          "copy",
          "Duplicate invoice",
          select(() => onDuplicate(invoice))
        )}
        {/* Delete is fenced off from the two reversible actions above it. */}
        <Separator className="my-1" />
        {item(
          "trash-2",
          "Delete invoice",
          select(() => onDelete(invoice)),
          true
        )}
      </PopoverContent>
    </Popover>
  );
}

interface ClientInvoicesSectionProps {
  clientId: string;
  /** Statuses to narrow to, owned by the details view so the KPI cards above can
   *  set it. Empty means every status. */
  statuses: string[];
  onStatusesChange: (next: string[]) => void;
}

/**
 * One client's invoice ledger — the list production shows on its client details
 * page, ported with the three row actions and the status filter it carries.
 *
 * The client link is exact: the invoice search takes `fieldSearch.clientId`, so
 * these really are this client's invoices. (The transactions section this replaced
 * could only match on business name, since no transaction carries a client id.)
 *
 * Row click is deliberately inert. Production navigates to an invoice detail page
 * (or to the invoice editor for a draft), and v2 has neither route — so rather
 * than a click that goes nowhere, the row's actions are the whole interaction.
 */
export function ClientInvoicesSection({
  clientId,
  statuses,
  onStatusesChange,
}: ClientInvoicesSectionProps) {
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);

  const { invoices, totalCount, isLoading, isFetching, refetch } = useClientInvoices({
    clientId,
    statuses,
    page,
  });
  const { duplicateInvoice, deleteInvoice, downloadInvoice } = useInvoiceRowActions();

  const toggleStatus = (value: string) => {
    onStatusesChange(
      statuses.includes(value) ? statuses.filter((s) => s !== value) : [...statuses, value]
    );
    setPage(1);
  };

  const columns: Column<ClientInvoice>[] = [
    {
      key: "invoiceNumber",
      header: "Invoice",
      minWidth: 160,
      render: (row) => (
        <span className="flex items-center gap-1.5">
          {/* Same Zoho marker the client list carries, for the same reason: an
              imported record is one the merchant did not raise here. */}
          {row.source === "ZOHO" ? (
            <Icon name="zoho-logo" className="h-3 w-3 shrink-0" aria-label="Imported from Zoho" />
          ) : null}
          <span className="text-[13px] font-medium whitespace-nowrap text-foreground">
            {row.invoiceNumber || "—"}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      minWidth: 130,
      render: (row) => (
        <StatusBadge
          variant={INVOICE_STATUS_TONE[row.status]}
          size="sm"
          label={INVOICE_STATUS_LABEL[row.status] ?? row.status}
        />
      ),
    },
    {
      key: "totalAmount",
      header: "Amount",
      minWidth: 130,
      align: "right",
      render: (row) => {
        const amount = Number(row.totalAmount);
        return (
          <span className="text-[13px] font-medium tabular-nums whitespace-nowrap text-foreground">
            {Number.isFinite(amount)
              ? formatCurrency(amount, row.currency, clientAmountLocale(row.currency))
              : "—"}
          </span>
        );
      },
    },
    {
      key: "invoiceDate",
      header: "Invoice date",
      minWidth: 130,
      render: (row) => (
        <span className="text-[13px] whitespace-nowrap text-muted-foreground">
          {row.invoiceDate ? formatTransactionDateOnly(row.invoiceDate) : "—"}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due date",
      minWidth: 130,
      render: (row) => (
        <span className="text-[13px] whitespace-nowrap text-muted-foreground">
          {row.dueDate ? formatTransactionDateOnly(row.dueDate) : "—"}
        </span>
      ),
    },
  ];

  const activeCount = statuses.length;

  return (
    <section>
      <h3 className="mb-3 text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
        Invoices
      </h3>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Status filter and refresh, the two controls production's own ledger
            toolbar carries. */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Icon name="filter" className="h-3.5 w-3.5" />}
              >
                Status
                {activeCount > 0 ? (
                  <Badge variant="secondary" size="sm" className="ml-1.5">
                    {activeCount}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-1">
              {INVOICE_STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleStatus(option.value)}
                  // A check marks the chosen ones rather than a checkbox column, so
                  // the row stays one line at this width — and it rides the leftIcon
                  // slot rather than being a child beside the label, which is what
                  // keeps it on that line. Button puts its children in a plain
                  // non-flex <span>, where preflight's display:block <svg> breaks to
                  // a line of its own; leftIcon is a direct flex child instead.
                  //
                  // Transparent rather than absent when unselected, so every row's
                  // label starts at the same x whatever is ticked.
                  leftIcon={
                    <Icon
                      name="check"
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        statuses.includes(option.value) ? "text-primary" : "text-transparent"
                      )}
                    />
                  }
                  className="h-auto min-h-0 w-full justify-start gap-2 rounded-md px-2 py-1.5 text-[13px] font-normal"
                >
                  {option.label}
                </Button>
              ))}
              {activeCount > 0 ? (
                <>
                  <Separator className="my-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onStatusesChange([]);
                      setPage(1);
                    }}
                    className="h-auto min-h-0 w-full justify-start rounded-md px-2 py-1.5 text-[13px] font-normal text-muted-foreground"
                  >
                    Clear
                  </Button>
                </>
              ) : null}
            </PopoverContent>
          </Popover>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Refresh invoices"
            disabled={isFetching}
            leftIcon={
              <Icon name="refresh" className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
            }
            onClick={refetch}
            className="ml-auto shrink-0"
          >
            Refresh
          </Button>
        </div>

        <DataTable
          className="rounded-none border-0 [&_td.sticky]:z-[2] [&_td.sticky>span]:opacity-100"
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          emptyTitle="No invoices yet"
          emptyDescription={
            activeCount > 0
              ? "No invoices match the selected statuses"
              : "Invoices raised against this client will appear here"
          }
          rowKey={(row) => row.id}
          rowAction={(row) => (
            <InvoiceRowActions
              invoice={row}
              onDuplicate={duplicateInvoice}
              onDelete={deleteInvoice}
              onDownload={downloadInvoice}
            />
          )}
          pageSize={5}
          totalRows={totalCount}
          page={page}
          onPageChange={setPage}
          tableLayout="content"
          density="compact"
        />
      </div>
    </section>
  );
}
