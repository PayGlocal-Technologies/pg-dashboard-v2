"use client";

import { useState } from "react";
import { toast } from "sonner";
import { DataTable, Dialog, DialogContent, DialogTitle, type Column } from "@/components/ui";
import { useGet, usePost } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import {
  linkInvoiceToTransactionApi,
  linkableTransactionsApi,
} from "@/features/dashboard/mca-invoices/services";
import { INVOICE_DATA_KEYS } from "@/features/dashboard/mca-invoices/constants";
import { LinkConsentFooter } from "@/features/dashboard/mca-invoices/components/LinkConsentFooter";
import type { InvoiceRef } from "@/features/dashboard/mca-invoices/types";
import type { BaseResponse } from "@/types/common";

/** The transaction shape LINK_TXN_COLUMNS reads in pg-dashboard. */
interface LinkableTransaction {
  gid: string;
  amount: string;
  currency: string;
  partnerCustomerCountry?: string | null;
  partnerCustomerFullName?: string | null;
  formattedCreationDateTime?: string | null;
}

type LinkableTransactionsResponse = BaseResponse<{ data: LinkableTransaction[] }>;

/**
 * Attaches a finished invoice to a settled transaction.
 *
 * Ported from pg-dashboard's mca-link-transaction feature, as a modal rather than
 * its drawer. Two things are load
 * bearing and kept exactly: only one transaction can be chosen (production uses
 * a radio, not checkboxes), and the link is refused until the consent box is
 * ticked, with `userLinkConsent` travelling in the request body.
 */
export function LinkTransactionModal({
  invoice,
  onOpenChange,
  onLinked,
}: {
  /** null closes the drawer. */
  invoice: InvoiceRef | null;
  onOpenChange: (open: boolean) => void;
  onLinked: () => void;
}) {
  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      {/* Wide and tall: the body holds a transaction table that is unusable
          squeezed into a standard modal width. */}
      <DialogContent className="flex h-[85vh] max-h-[52rem] w-[95vw] max-w-4xl flex-col overflow-hidden p-0">
        <DialogTitle className="shrink-0 border-b border-border px-5 py-4 text-[16px] font-semibold">
          Link a transaction
        </DialogTitle>
        {invoice && (
          // Remount per invoice so the selection and consent tick never carry
          // over from a previously opened row.
          <LinkTransactionBody
            key={invoice.id}
            invoice={invoice}
            onCancel={() => onOpenChange(false)}
            onLinked={() => {
              onLinked();
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function LinkTransactionBody({
  invoice,
  onCancel,
  onLinked,
}: {
  invoice: InvoiceRef;
  onCancel: () => void;
  onLinked: () => void;
}) {
  const [selectedGid, setSelectedGid] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const url = linkableTransactionsApi(invoice.mid, invoice.id);
  const { data, isLoading } = useGet<LinkableTransactionsResponse>(
    ["linkable-transactions", invoice.mid, invoice.id],
    url,
    undefined,
    { enabled: !!url }
  );

  const transactions = data?.data?.data ?? [];

  // Blank URL: the gid is only known once a row is picked, so the real target
  // is supplied per call via dynamicUrl.
  //
  // Linking settles the invoice against the transaction, so it changes which
  // status bucket the invoice counts in as well as the row itself: both the
  // list and the summary cards above it have to refetch.
  const { mutate: linkTransaction, isPending } = usePost<
    BaseResponse<null>,
    { userLinkConsent: boolean }
  >("", { invalidateQueries: INVOICE_DATA_KEYS });

  const handleLink = () => {
    if (!selectedGid || !consent) return;

    linkTransaction(
      {
        dynamicUrl: linkInvoiceToTransactionApi(invoice.mid, invoice.id, selectedGid),
        userLinkConsent: consent,
      } as { userLinkConsent: boolean },
      {
        onSuccess: () => {
          toast.success("Transaction linked", {
            description: `${invoice.invoiceNumber} is now attached to ****${selectedGid.slice(-6)}.`,
          });
          onLinked();
        },
        onError: (error) =>
          toast.error("Couldn't link the transaction", { description: error.message }),
      }
    );
  };

  /** Why "Link transaction" cannot run yet — its tooltip, and what disables
   *  it. Mirrors LinkInvoiceModal's, from the other end. */
  let linkDisabledReason: string | null = null;
  if (!selectedGid) linkDisabledReason = "Select the transaction you want to link this invoice to.";
  else if (!consent) linkDisabledReason = "Please agree to the terms before linking a transaction.";

  const columns: Column<LinkableTransaction>[] = [
    {
      key: "select",
      header: "",
      width: "44px",
      render: (row) => (
        <span
          role="radio"
          aria-checked={row.gid === selectedGid}
          aria-label={`Select transaction ${row.gid}`}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full border-2",
            row.gid === selectedGid ? "border-primary" : "border-border"
          )}
        >
          {row.gid === selectedGid && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
      ),
    },
    {
      key: "gid",
      header: "Transaction ID",
      minWidth: 170,
      render: (row) => <span className="font-mono text-[12px] text-foreground">{row.gid}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      minWidth: 140,
      align: "right",
      render: (row) => (
        <span className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
          <span className="text-[13px] font-semibold tabular-nums text-foreground">
            {formatCurrency(parseFloat(row.amount ?? "0"), row.currency ?? "USD", "en-US")}
          </span>
          <span className="text-[11px] text-muted-foreground">{row.currency}</span>
        </span>
      ),
    },
    {
      key: "partnerCustomerFullName",
      header: "Remitter",
      minWidth: 170,
      render: (row) => (
        <span className="block w-[150px] truncate text-[13px] text-foreground">
          {row.partnerCustomerFullName || "—"}
        </span>
      ),
    },
    {
      key: "partnerCustomerCountry",
      header: "Country",
      minWidth: 120,
      render: (row) => (
        <span className="text-[13px] text-muted-foreground">
          {row.partnerCustomerCountry || "—"}
        </span>
      ),
    },
    {
      key: "formattedCreationDateTime",
      header: "Transaction Time",
      minWidth: 170,
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] text-muted-foreground">
          {row.formattedCreationDateTime || "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-4 rounded-xl border border-border bg-muted/20 p-4">
          <p className="text-[13.5px] font-semibold text-foreground">{invoice.invoiceNumber}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {invoice.clientBusinessName || invoice.clientName || "Client"} ·{" "}
            {formatCurrency(parseFloat(invoice.totalAmount ?? "0"), invoice.currency, "en-IN")}{" "}
            {invoice.currency}
          </p>
        </div>

        <DataTable
          columns={columns}
          data={transactions}
          isLoading={isLoading}
          skeletonRows={5}
          rowKey={(row) => row.gid}
          // Selecting is what a row click does here, and the whole row is the
          // target — including the radio in the first column, which carries no
          // handler of its own and is only the current selection made visible.
          onRowClick={(row) => setSelectedGid(row.gid)}
          // Deliberately plain: the merchant is mid-task inside a dialog, so
          // this explains why the list is empty rather than pitching a feature.
          emptyTitle="No transactions to link"
          emptyDescription="Every transaction in this currency is already linked to an invoice."
          density="compact"
          tableLayout="content"
        />
      </div>

      <LinkConsentFooter
        consent={consent}
        onConsentChange={setConsent}
        disabledReason={linkDisabledReason}
        isPending={isPending}
        actionLabel="Link transaction"
        pendingLabel="Linking…"
        onCancel={onCancel}
        onConfirm={handleLink}
      />
    </>
  );
}
