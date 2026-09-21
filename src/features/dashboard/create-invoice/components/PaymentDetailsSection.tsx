"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useDelete } from "@/lib/api/hooks";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { deleteBankAccountApi } from "@/features/dashboard/create-invoice/services";
import {
  useInvoiceBankAccounts,
  useInvoiceMerchantId,
  type BankAccountRow,
} from "@/features/dashboard/create-invoice/hooks";
import { AddBankAccountDialog } from "@/features/dashboard/create-invoice/components/AddBankAccountDialog";
import type { BaseResponse } from "@/types/common";
import type { CurrencyData } from "@/features/dashboard/create-invoice/types";

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
  currency,
  currencies,
  accountNo,
  onAccountNoChange,
}: {
  invoiceId: string;
  /** The currency the server's copy of the draft holds, see
   * useInvoiceBankAccounts — changing it re-resolves the suggested account. */
  currency: string;
  /** Where the chosen currency's flag comes from, for the local account row —
   *  same list "What you sold" reads its own currency flags from. */
  currencies: CurrencyData[];
  accountNo: string;
  onAccountNoChange: (accountNo: string) => void;
}) {
  const merchantId = useInvoiceMerchantId();
  const [addOpen, setAddOpen] = useState(false);

  const { rows, isLoading, refetchAdded } = useInvoiceBankAccounts(invoiceId, currency);
  const currencyIso2 = currencies.find(
    (option) => option.currencyCode === currency
  )?.iso2CountryCode;

  const { mutate: deleteAccount } = useDelete<BaseResponse<null>, { uniqueId: string }>(
    deleteBankAccountApi(merchantId),
    { invalidateQueries: false }
  );

  /**
   * What sits in front of the account's title: the local account's currency
   * flag, a globe for the global account, and — when the bank is one we
   * recognise — its mark, so a merchant with several accounts at the same
   * type (two settlement accounts, say) can tell them apart by bank rather
   * than by reading the account number.
   */
  const accountMark = (row: BankAccountRow) => {
    if (row.title === "Local account" && currencyIso2) return <CountryFlag iso2={currencyIso2} />;
    if (row.title === "Global account") {
      return <Icon name="globe" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
    }
    const bank = row.bankName?.toLowerCase() ?? "";
    if (bank.includes("hdfc")) return <Icon name="hdfc-logo" className="h-4 w-4 shrink-0" />;
    if (bank.includes("icici")) return <Icon name="icici-logo" className="h-4 w-4 shrink-0" />;
    return null;
  };

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
    <div className="rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="building-2" className="h-4 w-4" />
          </span>
          <h2 className="text-[15px] font-semibold text-foreground">How you&apos;ll be paid</h2>
        </div>

        {/* Same undecorated pill as "Add new client"/"Add line item" —
            Create Invoice's own "Add due date" chip, 13px with a leading
            plus, no fill or border. Used to be a secondary button under the
            account list; moved up here for the same reason those two
            moved to their headers. */}
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/5"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          Add bank details
        </button>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="space-y-2">
          <Shimmer className="h-20 w-full rounded-lg" />
          <Shimmer className="h-20 w-full rounded-lg" />
        </div>
      ) : rows.length === 0 ? (
        /* Plain empty-state copy, not an info callout. Nothing has gone wrong
           and there is nothing to be advised about: the section simply has no
           accounts yet, and a tinted panel with an icon overstated that. */
        <p className="rounded-lg border border-border px-4 py-6 text-center text-[13px] text-muted-foreground">
          No receiving accounts yet. Add one to put bank details on the invoice.
        </p>
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
                  // Button wraps its children in a plain, non-flex <span> (see
                  // the leftIcon note on ReadinessChecklist's own Button
                  // usage) — without forcing that wrapper to flex/w-full
                  // itself, it shrinks to fit its content and the
                  // `justify-between` below has no slack to push the radio
                  // into, so it ends up sitting right beside the text instead
                  // of at the card's trailing edge.
                  "h-auto w-full justify-start rounded-lg p-3 text-left shadow-none [&>span]:flex [&>span]:w-full",
                  selected ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      {accountMark(row)}
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

                  {/* Radio moved to the trailing edge, beside delete: the row
                      reads left-to-right as "here's the account, here's what
                      you can do with it" rather than leading with a bare
                      circle before anything has been named. */}
                  <span className="flex shrink-0 items-center gap-1">
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
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                        selected ? "border-primary" : "border-border"
                      )}
                    >
                      {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </span>
                  </span>
                </span>
              </Button>
            );
          })}
        </div>
      )}

      <AddBankAccountDialog open={addOpen} onOpenChange={setAddOpen} onAdded={refetchAdded} />
    </div>
  );
}
