"use client";

import { toast } from "sonner";
import { Button, Dialog, DialogContent, DialogTitle } from "@/components/ui";
import { useAppForm } from "@/components/form/AppForm";
import { required, rules } from "@/components/form/rules";
import { usePost } from "@/lib/api/hooks";
import { addBankAccountApi } from "@/features/dashboard/create-invoice/services";
import { useInvoiceMerchantId } from "@/features/dashboard/create-invoice/hooks";
import type { BaseResponse } from "@/types/common";

interface AddBankRequest {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
}

export function AddBankAccountDialog({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-w-md flex-col gap-0 overflow-hidden p-0">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-14">
          <DialogTitle>Add new bank details</DialogTitle>
        </div>
        <AddBankBody
          key={open ? "open" : "closed"}
          onCancel={() => onOpenChange(false)}
          onAdded={() => {
            onAdded();
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

function AddBankBody({ onCancel, onAdded }: { onCancel: () => void; onAdded: () => void }) {
  const merchantId = useInvoiceMerchantId();

  const { mutate: addAccount, isPending } = usePost<BaseResponse<null>, AddBankRequest>(
    addBankAccountApi(merchantId),
    { invalidateQueries: false }
  );

  // All four fields are required, matching pg-dashboard's AddBankAccount drawer.
  const form = useAppForm({
    defaultValues: { bankName: "", accountHolderName: "", accountNumber: "", ifscCode: "" },
    onSubmit: ({ value }) => {
      addAccount(
        {
          bankName: value.bankName.trim(),
          accountHolderName: value.accountHolderName.trim(),
          accountNumber: value.accountNumber.trim(),
          ifscCode: value.ifscCode.trim().toUpperCase(),
        },
        {
          onSuccess: () => {
            toast.success("Bank account added");
            onAdded();
          },
          onError: (error) =>
            toast.error("Couldn't add the account", { description: error.message }),
        }
      );
    },
  });

  return (
    <form.AppForm>
      <form.Form className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
          <form.AppField name="bankName" validators={{ onChange: rules(required("Bank name")) }}>
            {(field) => (
              <field.TextField id="bank-name" label="Bank name" placeholder="Enter bank name" />
            )}
          </form.AppField>

          <form.AppField
            name="accountHolderName"
            validators={{ onChange: rules(required("Account holder name")) }}
          >
            {(field) => (
              <field.TextField
                id="bank-holder"
                label="Account holder name"
                placeholder="Enter account holder name"
              />
            )}
          </form.AppField>

          <form.AppField
            name="accountNumber"
            validators={{ onChange: rules(required("Account number")) }}
          >
            {(field) => (
              <field.TextField
                id="bank-account-number"
                label="Account number"
                placeholder="Enter account number"
              />
            )}
          </form.AppField>

          <form.AppField name="ifscCode" validators={{ onChange: rules(required("IFSC code")) }}>
            {(field) => (
              <field.TextField
                id="bank-ifsc"
                label="IFSC code"
                placeholder="Enter IFSC code"
                parse={(raw) => raw.toUpperCase()}
              />
            )}
          </form.AppField>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
          <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <form.SubmitButton pending={isPending}>{isPending ? "Adding…" : "Add"}</form.SubmitButton>
        </div>
      </form.Form>
    </form.AppForm>
  );
}
