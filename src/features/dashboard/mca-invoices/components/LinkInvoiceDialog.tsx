"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Badge,
  Button,
  Callout,
  CalloutIcon,
  CalloutText,
  CalloutTitle,
  Checkbox,
  DataTable,
  Dialog,
  DialogContent,
  DialogTitle,
  StatusBadge,
  type Column,
} from "@/components/ui";
import { usePost, usePostQuery } from "@/lib/api/hooks";
import { usePacbMidScope } from "@/lib/hooks/usePacbMidScope";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { buildInvoiceRequestBody } from "@/features/dashboard/mca-invoices/helpers";
import {
  allInvoicesApi,
  linkInvoiceToTransactionApi,
} from "@/features/dashboard/mca-invoices/services";
import {
  getInvoiceStatusMeta,
  INVOICE_DATA_KEYS,
} from "@/features/dashboard/mca-invoices/constants";
import type { McaInvoiceRow, McaInvoicesResponse } from "@/features/dashboard/mca-invoices/types";
import type { BaseResponse } from "@/types/common";

const CANDIDATE_STATUSES = ["ACTIVE"];
const CANDIDATES_PAGE_LIMIT = 50;

/** The transaction side of the link — the minimum needed to address it and
 *  show what it is being linked against. */
export interface LinkableTransactionRef {
  gid: string;
  merchantId: string;
  amount: string;
  currency: string;
}

/**
 * Attaches an already-raised invoice to a transaction still waiting on one.
 *
 * Mirror image of LinkTransactionModal (which starts from an invoice and
 * picks a transaction): same endpoint either way —
 * `linkInvoiceToTransactionApi(mid, invoiceId, gid)` only cares which side
 * supplied the gid last, not which direction the merchant started from — so
 * this reuses it rather than adding a second one. Kept as its own component
 * instead of a `direction` prop on that one, since the anchor summary, the
 * candidate list (invoices vs. transactions) and their columns are entirely
 * different tables.
 *
 * A candidate invoice must already carry no `gid` of its own — one that does
 * is already attached elsewhere, and re-linking it here would silently move
 * it off that transaction instead of adding a second link that doesn't exist
 * in this domain (see McaInvoiceRow.gid's own doc).
 */
export function LinkInvoiceDialog({
  transaction,
  onOpenChange,
  onLinked,
}: {
  /** null closes the dialog. */
  transaction: LinkableTransactionRef | null;
  onOpenChange: (open: boolean) => void;
  onLinked: () => void;
}) {
  return (
    <Dialog open={!!transaction} onOpenChange={onOpenChange}>
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
  transaction: LinkableTransactionRef;
  onCancel: () => void;
  onLinked: () => void;
}) {
  const router = useRouter();
  const { selectMid } = usePacbMidScope();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);

  const body = buildInvoiceRequestBody(
    { status: CANDIDATE_STATUSES },
    { mids: [transaction.merchantId], pageLimit: CANDIDATES_PAGE_LIMIT, from: 0 }
  );
  const { data, isLoading } = usePostQuery<McaInvoicesResponse, typeof body>(
    ["link-invoice-candidates", transaction.merchantId],
    allInvoicesApi(transaction.merchantId),
    body,
    { staleTime: 0 },
    !!transaction.merchantId
  );

  // Already-linked invoices (gid set) belong to a different transaction —
  // see this file's own doc comment on why they're excluded rather than
  // shown disabled.
  const candidates = (data?.data?.data ?? []).filter((invoice) => !invoice.gid);

  // The one signal cheap enough to surface without a real recommendation
  // endpoint: an invoice raised for exactly this amount, in this currency,
  // is very likely the one this transaction is meant to settle. Flagged
  // rather than auto-selected — it's a hint, not a decision made for the
  // merchant.
  const isLikelyMatch = (invoice: McaInvoiceRow) =>
    invoice.currency === transaction.currency &&
    parseFloat(invoice.totalAmount) === parseFloat(transaction.amount);
  const hasMatch = candidates.some(isLikelyMatch);

  // Blank URL: the invoiceId is only known once a row is picked, so the real
  // target is supplied per call via dynamicUrl.
  const { mutate: linkInvoice, isPending } = usePost<
    BaseResponse<null>,
    { userLinkConsent: boolean }
  >("", { invalidateQueries: INVOICE_DATA_KEYS });

  const handleLink = () => {
    if (!selectedInvoiceId || !consent) return;

    linkInvoice(
      {
        dynamicUrl: linkInvoiceToTransactionApi(
          transaction.merchantId,
          selectedInvoiceId,
          transaction.gid
        ),
        userLinkConsent: consent,
      } as { userLinkConsent: boolean },
      {
        onSuccess: () => {
          toast.success("Invoice linked", {
            description: `Attached to ****${transaction.gid.slice(-6)}.`,
          });
          onLinked();
        },
        onError: (error) =>
          toast.error("Couldn't link the invoice", { description: error.message }),
      }
    );
  };

  const handleCreateInvoice = () => {
    if (transaction.merchantId) selectMid(transaction.merchantId);
    router.push(`/create-invoice?gid=${transaction.gid}`);
  };

  const columns: Column<McaInvoiceRow>[] = [
    {
      key: "select",
      header: "",
      width: "44px",
      render: (row) => (
        <span
          role="radio"
          aria-checked={row.id === selectedInvoiceId}
          aria-label={`Select invoice ${row.invoiceNumber}`}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full border-2",
            row.id === selectedInvoiceId ? "border-primary" : "border-border"
          )}
        >
          {row.id === selectedInvoiceId && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
      ),
    },
    {
      key: "invoiceNumber",
      header: "Invoice",
      minWidth: 150,
      render: (row) => (
        <span className="flex items-center gap-2">
          <span className="font-mono text-[12px] text-foreground">{row.invoiceNumber}</span>
          {isLikelyMatch(row) && (
            <Badge variant="success" size="sm" className="shrink-0">
              Matches transaction
            </Badge>
          )}
        </span>
      ),
    },
    {
      key: "client",
      header: "Client",
      minWidth: 170,
      render: (row) => (
        <span className="block w-[150px] truncate text-[13px] text-foreground">
          {row.clientBusinessName || row.clientName || "—"}
        </span>
      ),
    },
    {
      key: "totalAmount",
      header: "Amount",
      minWidth: 140,
      align: "right",
      render: (row) => (
        <span className="flex items-baseline justify-end gap-1.5 whitespace-nowrap">
          <span className="text-[13px] font-semibold tabular-nums text-foreground">
            {formatCurrency(parseFloat(row.totalAmount ?? "0"), row.currency ?? "INR", "en-IN")}
          </span>
          <span className="text-[11px] text-muted-foreground">{row.currency}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      minWidth: 120,
      render: (row) => {
        const { label, variant } = getInvoiceStatusMeta(row.status);
        return <StatusBadge variant={variant} size="sm" label={label} />;
      },
    },
  ];

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-4 rounded-xl border border-border bg-muted/20 p-4">
          <p className="font-mono text-[13.5px] font-semibold text-foreground">{transaction.gid}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {formatCurrency(parseFloat(transaction.amount ?? "0"), transaction.currency, "en-IN")}{" "}
            {transaction.currency}
          </p>
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
          data={candidates}
          isLoading={isLoading}
          skeletonRows={5}
          rowKey={(row) => row.id}
          onRowClick={(row) => setSelectedInvoiceId(row.id)}
          emptyTitle="No invoices to link"
          emptyDescription="Raise a new invoice for this transaction instead."
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
            By proceeding with this action, you authorize the platform to attach the selected
            invoice to this transaction. You acknowledge that the accuracy and suitability of this
            linkage are solely your responsibility.
          </span>
        </label>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-5 py-4">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handleCreateInvoice}>
          Create invoice instead
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={!selectedInvoiceId || !consent || isPending}
          onClick={handleLink}
        >
          {isPending ? "Linking…" : "Link invoice"}
        </Button>
      </div>
    </>
  );
}
