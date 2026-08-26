import { FREQUENCY_LABELS } from "@/features/dashboard/mca-invoices/constants";
import type { InvoiceData, LinkedTxnDetails } from "@/features/dashboard/create-invoice/types";

export interface DetailField {
  label: string;
  value: string;
  /** Tailwind text colour class; defaults to foreground. */
  tone?: string;
}

/**
 * The invoice facts shown above the fold, from pg-dashboard's
 * formatInvoiceData. Empty fields are dropped rather than rendered as dashes,
 * which is what keeps Frequency off a one-off invoice and "Payment received on"
 * off anything not settled outside PayGlocal.
 */
export function formatInvoiceData(invoice: InvoiceData | undefined): DetailField[] {
  if (!invoice) return [];

  const fields: { label: string; value: string | undefined; tone?: string }[] = [
    {
      label: "Invoice Amount",
      value:
        invoice.totalAmount !== undefined
          ? `${invoice.currency ?? ""} ${invoice.totalAmount}`.trim()
          : undefined,
      tone: invoice.status === "ACTIVE" ? "text-primary" : "text-success",
    },
    { label: "Client", value: invoice.clientName },
    {
      label: "Frequency",
      value: invoice.recurringType ? FREQUENCY_LABELS[invoice.recurringType] : undefined,
    },
    { label: "Invoice Issue Date", value: invoice.invoiceDate },
    { label: "Invoice Due Date", value: invoice.dueDate },
    {
      label: "Payment received on",
      value: invoice.status === "PAID_OUTSIDE" ? invoice.paidDate : undefined,
    },
  ];

  return fields.filter((f): f is DetailField => !!f.value);
}

/** The linked transaction's facts, from formatTxnData. */
export function formatTxnData(txn: LinkedTxnDetails | undefined): DetailField[] {
  return [
    {
      label: "Amount",
      value: txn?.amount ? `${txn.currency} ${txn.amount}` : "--",
      tone: "text-success",
    },
    { label: "Transaction ID", value: txn?.gid || "--" },
    { label: "Remitter", value: txn?.customerFullName || "--" },
    {
      label: "Issue Date",
      value: txn?.creationTime
        ? new Date(Number(txn.creationTime)).toISOString().slice(0, 10)
        : "--",
    },
    { label: "Country", value: txn?.partnerCustomerCountry || "--" },
  ];
}

/**
 * Whole days an invoice is past its due date, floored at zero.
 *
 * Both dates are normalised to local midnight first, exactly as production
 * does: comparing raw timestamps would make an invoice due today read as one
 * day overdue from the afternoon onwards.
 */
export function daysOverdue(dueDate: string | undefined, now: Date): number {
  if (!dueDate) return 0;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const days = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(days, 0);
}
