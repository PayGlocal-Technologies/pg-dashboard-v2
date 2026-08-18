"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Callout, CalloutText, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useDelete } from "@/lib/api/hooks";
import { deleteBankAccountApi } from "@/features/dashboard/create-invoice/services";
import {
  useInvoiceBankAccounts,
  useInvoiceMerchantId,
  type BankAccountRow,
} from "@/features/dashboard/create-invoice/hooks";
import { AddBankAccountDialog } from "@/features/dashboard/create-invoice/components/AddBankAccountDialog";
import type { BaseResponse } from "@/types/common";

/**
 * "How you'll be paid".
 *
 * Nova lets the merchant type bank details freely onto each invoice. This does
 * not: the API stores a single `accountNo` pointing at an account the merchant
 * already holds, so the card is a chooser over the PayGlocal-provisioned
 * accounts plus any added by hand. Free-typed account numbers would have
 * nowhere to persist and would break settlement reconciliation.
 *
 * Nova's other three payment methods — hosted payment link, external payment
 * link, virtual-account QR — are deliberately absent. None has a field on the
 * invoice or an endpoint behind it, and Nova's QR is a decorative placeholder
 * rather than a scannable code.
 */
export function PaymentDetailsSection({
  invoiceId,
  accountNo,
  onAccountNoChange,
}: {
  invoiceId: string;
  accountNo: string;
  onAccountNoChange: (accountNo: string) => void;
}) {
  const merchantId = useInvoiceMerchantId();
  const [addOpen, setAddOpen] = useState(false);

  const { rows, isLoading, refetchAdded } = useInvoiceBankAccounts(invoiceId);

  const { mutate: deleteAccount } = useDelete<BaseResponse<null>, { uniqueId: string }>(
    deleteBankAccountApi(merchantId),
    { invalidateQueries: false }
  );

  const handleDelete = (row: BankAccountRow) => {
    if (!row.uniqueId) return;
    deleteAccount(
      { uniqueId: row.uniqueId },
      {
        onSuccess: () => {
          toast.success("Bank account deleted");
          // Clear the selection if the account just removed was the chosen one.
          if (row.accountNumber === accountNo) onAccountNoChange("");
          refetchAdded();
        },
        onError: (error) =>
          toast.error("Couldn't delete the account", { description: error.message }),
      }
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon name="building-2" className="h-4 w-4" />
        </span>
        <h2 className="text-[15px] font-semibold text-foreground">How you&apos;ll be paid</h2>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="space-y-2">
          <Shimmer className="h-20 w-full rounded-lg" />
          <Shimmer className="h-20 w-full rounded-lg" />
        </div>
      ) : rows.length === 0 ? (
        <Callout variant="info">
          <CalloutText>
            No receiving accounts are available yet. Add one to put bank details on the invoice.
          </CalloutText>
        </Callout>
      ) : (
        <div className="space-y-2" role="radiogroup" aria-label="Receiving account">
          {rows.map((row) => {
            const selected = row.accountNumber === accountNo;
            return (
              // Card-shaped radio option. flux's RadioGroup has no card variant
              // that can host a nested delete action, so a Button carries the
              // role and aria-checked explicitly.
              <Button
                key={row.uniqueId ?? `${row.title}-${row.accountNumber}`}
                type="button"
                variant="outline"
                role="radio"
                aria-checked={selected}
                onClick={() => onAccountNoChange(row.accountNumber)}
                className={cn(
                  "h-auto w-full justify-start rounded-lg p-3 text-left",
                  selected ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <span className="flex w-full items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                      selected ? "border-primary" : "border-border"
                    )}
                  >
                    {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[13.5px] font-medium text-foreground">{row.title}</span>
                      {row.isRecommended && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Recommended
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-[12px] text-muted-foreground">
                      {row.accountHolderName}
                    </span>
                    <span className="block font-mono text-[12px] text-muted-foreground">
                      {row.accountNumber}
                    </span>
                    <span className="block text-[11.5px] text-muted-foreground">
                      {[row.bankName, row.routing].filter(Boolean).join(" · ")}
                    </span>
                  </span>

                  {row.uniqueId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${row.bankName} account`}
                      className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                      onClick={(event) => {
                        // Otherwise the click also selects the card being removed.
                        event.stopPropagation();
                        handleDelete(row);
                      }}
                    >
                      <Icon name="trash-2" className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </span>
              </Button>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        variant="link"
        size="sm"
        className="mt-3 h-auto p-0"
        leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
        onClick={() => setAddOpen(true)}
      >
        Add new bank details
      </Button>

      <AddBankAccountDialog open={addOpen} onOpenChange={setAddOpen} onAdded={refetchAdded} />
    </div>
  );
}
