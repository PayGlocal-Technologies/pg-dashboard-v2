"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui";
import { usePost } from "@/lib/api/hooks";
import { markInvoicePaidApi } from "@/features/dashboard/mca-invoices/services";
import { INVOICE_DATA_KEYS } from "@/features/dashboard/mca-invoices/constants";
import type { InvoiceRef } from "@/features/dashboard/mca-invoices/types";
import type { BaseResponse } from "@/types/common";

/**
 * Records a payment that happened outside PayGlocal.
 *
 * Payload is `{ paidDate }` in YYYY-MM-DD, matching pg-dashboard's MarkAsPaid
 * drawer. The MID comes off the row, not the current selection, because the
 * list can span MIDs.
 */
export function MarkAsPaidDialog({
  invoice,
  onOpenChange,
  onDone,
  today,
}: {
  /** null closes the dialog; a row opens it for that invoice. */
  invoice: InvoiceRef | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
  today: string;
}) {
  const [paidDate, setPaidDate] = useState(today);

  const { mutate: markAsPaid, isPending } = usePost<BaseResponse<null>, { paidDate: string }>(
    invoice ? markInvoicePaidApi(invoice.mid, invoice.id) : "",
    // Moves the invoice out of Outstanding and into Paid, so both the list and
    // the counts above it are stale until they refetch.
    { invalidateQueries: INVOICE_DATA_KEYS }
  );

  const handleConfirm = () => {
    if (!invoice) return;
    markAsPaid(
      { paidDate },
      {
        onSuccess: () => {
          toast.success("Invoice marked as paid", { description: invoice.invoiceNumber });
          onDone();
          onOpenChange(false);
        },
        onError: (error) => toast.error("Couldn't mark it as paid", { description: error.message }),
      }
    );
  };

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogTitle>Mark as paid</DialogTitle>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {invoice ? (
            <>
              Records <span className="font-medium text-foreground">{invoice.invoiceNumber}</span>{" "}
              as settled outside PayGlocal, for {invoice.currency} {invoice.totalAmount}.
            </>
          ) : null}
        </p>

        <div className="mt-4">
          <Field>
            <FieldLabel>Payment date</FieldLabel>
            <DatePicker value={paidDate} onChange={setPaidDate} />
            <FieldDescription>The date the money actually arrived.</FieldDescription>
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button type="button" variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isPending || !paidDate}
            onClick={handleConfirm}
          >
            {isPending ? "Saving…" : "Paid outside PayGlocal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
