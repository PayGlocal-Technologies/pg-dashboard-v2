"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Badge,
  Callout,
  CalloutIcon,
  CalloutText,
  CalloutTitle,
  DataTable,
  Dialog,
  DialogContent,
  DialogTitle,
  type Column,
} from "@/components/ui";
import { useGet, usePost } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import {
  linkInvoiceToTransactionApi,
  linkableInvoicesApi,
} from "@/features/dashboard/mca-invoices/services";
import { INVOICE_DATA_KEYS } from "@/features/dashboard/mca-invoices/constants";
import { LinkConsentFooter } from "@/features/dashboard/mca-invoices/components/LinkConsentFooter";
import type { LinkableTransaction } from "@/features/dashboard/mca-transactions/types";
import type { BaseResponse } from "@/types/common";

/** The invoice shape pg-dashboard's LINK_INVOICE_COLUMNS reads. */
interface LinkableInvoice {
  id: string;
  invoiceNumber: string;
  clientName?: string | null;
  totalAmount: string;
  currency: string;
  country?: string | null;
  invoiceDate?: string | null;
}

type LinkableInvoicesResponse = BaseResponse<{ data: LinkableInvoice[] }>;

/**
 * Attaches an existing invoice to a settled transaction — the transactions
 * table's "Link Invoice" row action.
 *
 * Ported from pg-dashboard's mca-link-invoice feature (a drawer there, a modal
 * here, as with its mirror image). It is the exact inverse of
 * LinkTransactionModal: that one starts from an invoice and picks a
 * transaction, this one starts from a transaction and picks an invoice, and
 * both finish with the same POST. Three things production does are load
 * bearing and kept: the candidate list is fetched per transaction rather than
 * being the invoice list filtered client-side, only one invoice can be chosen
 * (a radio, not checkboxes), and the link is refused until the consent box is
 * ticked, with `userLinkConsent` travelling in the request body.
 *
 * This replaces a `router.push("/mca-invoices?linkTo=…")` that landed the
 * merchant on the plain invoice list: nothing there read `linkTo`, so the
 * action read as "Link Invoice sends me to Invoices and forgets why".
 */
export function LinkInvoiceModal({
  transaction,
  onOpenChange,
  onLinked,
}: {
  /** null closes the modal. */
  transaction: LinkableTransaction | null;
  onOpenChange: (open: boolean) => void;
  onLinked: () => void;
}) {
  return (
    <Dialog open={!!transaction} onOpenChange={onOpenChange}>
      {/* Wide and tall: the body holds an invoice table that is unusable
          squeezed into a standard modal width. */}
      <DialogContent className="flex h-[85vh] max-h-[52rem] w-[95vw] max-w-4xl flex-col overflow-hidden p-0">
        <DialogTitle className="shrink-0 border-b border-border px-5 py-4 text-[16px] font-semibold">
          Link an invoice
        </DialogTitle>
        {transaction && (
          // Remount per transaction so the selection and consent tick never
          // carry over from a previously opened row.
          <LinkInvoiceBody
            key={transaction.gid}
            transaction={transaction}
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

function LinkInvoiceBody({
  transaction,
  onCancel,
  onLinked,
}: {
  transaction: LinkableTransaction;
  onCancel: () => void;
  onLinked: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const url = linkableInvoicesApi(transaction.merchantId, transaction.gid);
  const { data, isLoading } = useGet<LinkableInvoicesResponse>(
    ["linkable-invoices", transaction.merchantId, transaction.gid],
    url,
    undefined,
    { enabled: !!url }
  );

  const invoices = data?.data?.data ?? [];
  const selected = invoices.find((invoice) => invoice.id === selectedId) ?? null;

  // Blank URL: the invoice id is only known once a row is picked, so the real
  // target is supplied per call via dynamicUrl.
  //
  // Linking settles the invoice against the transaction, so it moves the
  // invoice between status buckets as well: the invoice list and its summary
  // counts have to refetch alongside the transactions table, which the caller
  // refreshes through onLinked.
  const { mutate: linkInvoice, isPending } = usePost<
    BaseResponse<null>,
    { userLinkConsent: boolean }
  >("", { invalidateQueries: INVOICE_DATA_KEYS });

  const handleLink = () => {
    if (!selected || !consent) return;

    linkInvoice(
      {
        dynamicUrl: linkInvoiceToTransactionApi(
          transaction.merchantId,
          selected.id,
          transaction.gid
        ),
        userLinkConsent: consent,
      } as { userLinkConsent: boolean },
      {
        onSuccess: () => {
          toast.success("Invoice linked", {
            description: `${selected.invoiceNumber} is now attached to ****${transaction.gid.slice(-6)}.`,
          });
          onLinked();
        },
        onError: (error) =>
          toast.error("Couldn't link the invoice", { description: error.message }),
      }
    );
  };

  /**
   * The one signal cheap enough to surface without a recommendation endpoint:
   * an invoice raised for exactly this amount, in this currency, is very
   * likely the one this transaction is meant to settle. Flagged rather than
   * auto-selected — it is a hint, not a decision made for the merchant.
   */
  const isLikelyMatch = (invoice: LinkableInvoice) =>
    invoice.currency === transaction.currency &&
    parseFloat(invoice.totalAmount ?? "0") === parseFloat(transaction.amount ?? "0");
  const hasMatch = invoices.some(isLikelyMatch);

  /** Why "Link invoice" cannot run yet — shown as its tooltip, and what
   *  disables it. Production tooltips the consent case; the selection case is
   *  the same question asked one step earlier. */
  let linkDisabledReason: string | null = null;
  if (!selectedId) linkDisabledReason = "Select the invoice you want to link to this transaction.";
  else if (!consent) linkDisabledReason = "Please agree to the terms before linking an invoice.";

  const columns: Column<LinkableInvoice>[] = [
    {
      key: "select",
      header: "",
      width: "44px",
      render: (row) => (
        <span
          role="radio"
          aria-checked={row.id === selectedId}
          aria-label={`Select invoice ${row.invoiceNumber}`}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full border-2",
            row.id === selectedId ? "border-primary" : "border-border"
          )}
        >
          {row.id === selectedId && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
      ),
    },
    {
      key: "invoiceNumber",
      header: "Invoice number",
      minWidth: 190,
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">{row.invoiceNumber}</span>
          {isLikelyMatch(row) && (
            <Badge variant="success" size="sm" className="shrink-0">
              Matches transaction
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "clientName",
      header: "Client name",
      minWidth: 170,
      render: (row) => (
        <span className="block w-[150px] truncate text-[13px] text-foreground">
          {row.clientName || "—"}
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "Total invoice amount",
      minWidth: 160,
      align: "right",
      render: (row) => (
        <span className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
          <span className="text-[13px] font-semibold tabular-nums text-foreground">
            {formatCurrency(parseFloat(row.totalAmount ?? "0"), row.currency ?? "USD", "en-US")}
          </span>
          <span className="text-[11px] text-muted-foreground">{row.currency}</span>
        </span>
      ),
    },
    {
      key: "country",
      header: "Country",
      minWidth: 120,
      render: (row) => (
        <span className="text-[13px] text-muted-foreground">{row.country || "—"}</span>
      ),
    },
    {
      key: "invoiceDate",
      header: "Issue date",
      minWidth: 140,
      render: (row) => (
        <span className="whitespace-nowrap text-[13px] text-muted-foreground">
          {row.invoiceDate || "—"}
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {/* What is being linked TO — production leads its drawer with the same
            four facts (TxnDetails), because an invoice number means nothing
            without the transaction it is about to be attached to. */}
        <div className="mb-4 grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-4">
          <TransactionFact label="Transaction ID" value={`****${transaction.gid.slice(-6)}`} mono />
          <TransactionFact label="Remitter name" value={transaction.partnerCustomerFullName} />
          <TransactionFact
            label="Total amount"
            value={`${formatCurrency(parseFloat(transaction.amount ?? "0"), transaction.currency ?? "USD", "en-US")} ${transaction.currency ?? ""}`}
          />
          <TransactionFact
            label="Transaction date"
            value={transaction.formattedTransactionCreationDateTime}
          />
        </div>

        {hasMatch && (
          <Callout variant="discovery" className="mb-4">
            <CalloutIcon variant="discovery" />
            <div>
              <CalloutTitle>Smart insights</CalloutTitle>
              <CalloutText>
                We found an invoice for this transaction&apos;s exact amount and currency — look for
                the &ldquo;Matches transaction&rdquo; tag below.
              </CalloutText>
            </div>
          </Callout>
        )}

        <DataTable
          columns={columns}
          data={invoices}
          isLoading={isLoading}
          skeletonRows={5}
          rowKey={(row) => row.id}
          // Selecting is what a row click does here, and the whole row is the
          // target — including the radio in the first column, which carries no
          // handler of its own and is only the current selection made visible.
          onRowClick={(row) => setSelectedId(row.id)}
          emptyTitle="No invoices available"
          emptyDescription="There are no unlinked invoices for this transaction yet."
          density="compact"
          tableLayout="content"
        />
      </div>

      <LinkConsentFooter
        consent={consent}
        onConsentChange={setConsent}
        disabledReason={linkDisabledReason}
        isPending={isPending}
        actionLabel="Link invoice"
        pendingLabel="Linking…"
        onCancel={onCancel}
        onConfirm={handleLink}
      />
    </>
  );
}
/** One label/value pair in the transaction summary above the table. */
function TransactionFact({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-[13px] font-medium text-foreground",
          mono && "font-mono"
        )}
      >
        {value || "—"}
      </p>
    </div>
  );
}
