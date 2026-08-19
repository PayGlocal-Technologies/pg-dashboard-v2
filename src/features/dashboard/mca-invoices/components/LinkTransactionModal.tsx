"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  Checkbox,
  DataTable,
  Dialog,
  DialogContent,
  DialogTitle,
  type Column,
} from "@/components/ui";
import { RowClick } from "@/components/common/table/RowClick";
import { useGet, usePost } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import {
  linkInvoiceToTransactionApi,
  linkableTransactionsApi,
} from "@/features/dashboard/mca-invoices/services";
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

const CONSENT_TEXT = {
  short:
    "By proceeding with this action, you authorize the platform to attach the generated invoice to the selected transaction.",
  more: "You acknowledge that the accuracy and suitability of this linkage are solely your responsibility. PayGlocal Technologies Private Limited does not review, validate, or assume any liability for incorrect, incomplete, or inappropriate linkage or for any disputes or consequences arising from it.",
};

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
  const [showMore, setShowMore] = useState(false);

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
  const { mutate: linkTransaction, isPending } = usePost<
    BaseResponse<null>,
    { userLinkConsent: boolean }
  >("", { invalidateQueries: ["mca-invoices"] });

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

  const columns: Column<LinkableTransaction>[] = [
    {
      key: "select",
      header: "",
      width: "44px",
      render: (row) => (
        <RowClick onClick={() => setSelectedGid(row.gid)}>
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
        </RowClick>
      ),
    },
    {
      key: "gid",
      header: "Transaction ID",
      minWidth: 170,
      render: (row) => (
        <RowClick onClick={() => setSelectedGid(row.gid)}>
          <span className="font-mono text-[12px] text-foreground">{row.gid}</span>
        </RowClick>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      minWidth: 140,
      align: "right",
      render: (row) => (
        <RowClick onClick={() => setSelectedGid(row.gid)} align="right">
          <span className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
            <span className="text-[13px] font-semibold tabular-nums text-foreground">
              {formatCurrency(parseFloat(row.amount ?? "0"), row.currency ?? "USD", "en-US")}
            </span>
            <span className="text-[11px] text-muted-foreground">{row.currency}</span>
          </span>
        </RowClick>
      ),
    },
    {
      key: "partnerCustomerFullName",
      header: "Remitter",
      minWidth: 170,
      render: (row) => (
        <RowClick onClick={() => setSelectedGid(row.gid)}>
          <span className="block w-[150px] truncate text-[13px] text-foreground">
            {row.partnerCustomerFullName || "—"}
          </span>
        </RowClick>
      ),
    },
    {
      key: "partnerCustomerCountry",
      header: "Country",
      minWidth: 120,
      render: (row) => (
        <RowClick onClick={() => setSelectedGid(row.gid)}>
          <span className="text-[13px] text-muted-foreground">
            {row.partnerCustomerCountry || "—"}
          </span>
        </RowClick>
      ),
    },
    {
      key: "formattedCreationDateTime",
      header: "Transaction Time",
      minWidth: 170,
      render: (row) => (
        <RowClick onClick={() => setSelectedGid(row.gid)}>
          <span className="whitespace-nowrap text-[13px] text-muted-foreground">
            {row.formattedCreationDateTime || "—"}
          </span>
        </RowClick>
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
          emptyTitle="No transactions available"
          emptyDescription="There are no unlinked transactions for this invoice yet."
          density="compact"
          tableLayout="content"
        />

        <label className="mt-5 flex cursor-pointer items-start gap-3">
          <Checkbox
            checked={consent}
            onCheckedChange={(next) => setConsent(next === true)}
            className="mt-0.5"
          />
          <span className="text-[12.5px] text-muted-foreground">
            {CONSENT_TEXT.short}
            {showMore && <> {CONSENT_TEXT.more}</>}{" "}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 align-baseline text-[12.5px]"
              onClick={(e) => {
                // The label wraps this, so a bare click would also toggle the box.
                e.preventDefault();
                setShowMore((v) => !v);
              }}
            >
              {showMore ? "Show less" : "Show more"}
            </Button>
          </span>
        </label>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!selectedGid || !consent || isPending}
          onClick={handleLink}
        >
          {isPending ? "Linking…" : "Link transaction"}
        </Button>
      </div>
    </>
  );
}
