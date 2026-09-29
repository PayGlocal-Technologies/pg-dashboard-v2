"use client";

import { toast } from "sonner";
import { Button, DatePicker, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { useAppForm } from "@/components/form/AppForm";
import { required, rules } from "@/components/form/rules";
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
  const { mutate: markAsPaid, isPending } = usePost<BaseResponse<null>, { paidDate: string }>(
    invoice ? markInvoicePaidApi(invoice.mid, invoice.id) : "",
    // Moves the invoice out of Outstanding and into Paid, so both the list and
    // the counts above it are stale until they refetch.
    { invalidateQueries: INVOICE_DATA_KEYS }
  );

  // The date is required but the button stays enabled (the app-wide rule).
  const form = useAppForm({
    defaultValues: { paidDate: today },
    onSubmit: ({ value: { paidDate } }) => {
      if (!invoice) return;
      markAsPaid(
        { paidDate },
        {
          onSuccess: () => {
            toast.success("Invoice marked as paid", { description: invoice.invoiceNumber });
            onDone();
            onOpenChange(false);
          },
          onError: (error) =>
            toast.error("Couldn't mark it as paid", { description: error.message }),
        }
      );
    },
  });

  return (
    <Dialog open={!!invoice} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-sm flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>Mark as paid</DialogTitle>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {invoice ? (
              <>
                Records <span className="font-medium text-foreground">{invoice.invoiceNumber}</span>{" "}
                as settled outside PayGlocal, for {invoice.currency} {invoice.totalAmount}.
              </>
            ) : null}
          </p>
        </div>

        <form.AppForm>
          <form.Form className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
              <form.AppField
                name="paidDate"
                validators={{ onChange: rules(required("Payment date")) }}
              >
                {(field) => (
                  <field.CustomField<string>
                    id="mark-paid-date"
                    label="Payment date"
                    description="The date the money actually arrived."
                  >
                    {({ value, invalid, onChange }) => (
                      // DatePicker takes no id or aria-invalid; the wrapper
                      // carries the invalid state so a failed save can focus it.
                      <div aria-invalid={invalid || undefined}>
                        <DatePicker value={value} onChange={onChange} />
                      </div>
                    )}
                  </field.CustomField>
                )}
              </form.AppField>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <form.SubmitButton pending={isPending}>
                {isPending ? "Saving…" : "Paid outside PayGlocal"}
              </form.SubmitButton>
            </div>
          </form.Form>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  );
}
