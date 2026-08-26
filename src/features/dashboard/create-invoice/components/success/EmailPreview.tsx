"use client";

import { Card, CardContent, Separator, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useInvoiceBankAccounts } from "@/features/dashboard/create-invoice/hooks";
import type { InvoiceData } from "@/features/dashboard/create-invoice/types";

/** The address invoice mail is sent from, as production hard-codes it. */
const SENDER = "client-alerts@payglocal.com";

function Row({ label, value, labelWidth }: { label: string; value: string; labelWidth: string }) {
  return (
    <div className="flex gap-2 text-[12px]">
      <span className="shrink-0 text-muted-foreground" style={{ width: labelWidth }}>
        {label}:
      </span>
      <span className="min-w-0 break-words text-foreground">{value || "--"}</span>
    </div>
  );
}

/**
 * "Client's View": what the invoice email will actually look like.
 *
 * Ported from pg-dashboard's EmailPreview. This is the pane the v2 drawer was
 * missing entirely, which is why the email surface looked empty next to
 * production's.
 *
 * The account block resolves through useInvoiceBankAccounts rather than the
 * suggested-accounts endpoint alone: production filters only the suggested
 * list, so an invoice paid into a manually added account shows blank bank
 * details in its own preview. This looks the payee up across both lists.
 */
export function EmailPreview({ invoice }: { invoice: InvoiceData | undefined }) {
  // `invoice` here is the saved record straight from the server, so its own
  // currency is by definition the persisted one.
  const { rows: accounts } = useInvoiceBankAccounts(invoice?.id ?? "", invoice?.currency ?? "");

  if (!invoice) {
    return (
      <div className="space-y-3 p-6">
        <Shimmer className="h-5 w-40" />
        <Shimmer className="h-64 w-full" />
      </div>
    );
  }

  const biller = invoice.billerDetails?.legalName || "Your business";
  const amount = `${invoice.currency ?? ""} ${invoice.totalAmount ?? ""}`.trim();
  const account = accounts.find((row) => row.accountNumber === invoice.accountNo);

  const invoiceRows = [
    { label: "Invoice Number", value: invoice.invoiceNumber ?? "" },
    { label: "Invoice date", value: invoice.invoiceDate ?? "" },
    { label: "Amount", value: amount },
    { label: "Due date", value: invoice.dueDate ?? "" },
  ];

  const accountRows = [
    { label: "Account Holder Name", value: account?.accountHolderName ?? "" },
    { label: "Account Number", value: account?.accountNumber ?? "" },
    { label: "Routing Code", value: account?.routing ?? "" },
    { label: "Bank Name", value: account?.bankName ?? "" },
  ];

  return (
    <div className="h-full overflow-y-auto bg-muted/40 p-5">
      <p className="mb-3 text-center text-[13px] font-semibold text-muted-foreground">
        Client&apos;s View
      </p>

      <Card>
        <CardContent className="space-y-5 p-5">
          <div>
            <div className="flex gap-2 text-[12px]">
              <span className="text-muted-foreground">From:</span>
              <span className="text-foreground">{SENDER}</span>
            </div>
            <Separator className="my-3" />
            <div className="flex gap-2 text-[12px]">
              <span className="shrink-0 text-muted-foreground">Subject:</span>
              <span className="min-w-0 break-words text-foreground">
                Invoice raised by {biller} : Invoice no. {invoice.invoiceNumber} for {amount}
              </span>
            </div>
            <Separator className="mt-3" />
          </div>

          <h3 className="text-[15px] font-semibold text-foreground">Invoice Raised by {biller}</h3>
          <p className="text-[13px] text-foreground">Dear team {invoice.clientName},</p>

          <div>
            <p className="text-[13px] text-foreground">
              An invoice has been raised by {biller}. Please find the details of the outstanding
              invoice and {biller}&apos;s provided payment method below:
            </p>
            <Separator className="mt-3" />
          </div>

          <div>
            <p className="text-[12px] text-muted-foreground">Outstanding amount</p>
            <p className="text-[20px] font-bold text-success">{amount}</p>

            <div className="mt-3 space-y-1">
              {invoiceRows.map((row) => (
                <Row key={row.label} label={row.label} value={row.value} labelWidth="35%" />
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-4">
            <p className="mb-2 text-[13px] font-semibold text-foreground">
              {biller}&apos;s Account details
            </p>
            <div className="space-y-1">
              {accountRows.map((row) => (
                <Row key={row.label} label={row.label} value={row.value} labelWidth="45%" />
              ))}
            </div>
          </div>

          <div>
            <p className="text-[12px] text-muted-foreground">On behalf of,</p>
            <p className="text-[12px] text-foreground">{biller}</p>
            <Separator className="mt-3" />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Powered by
            </span>
            <Icon name="shield-check" className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11.5px] font-semibold text-primary">PayGlocal</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
