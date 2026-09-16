"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Field,
  FieldError,
  FieldLabel,
  Input,
} from "@/components/ui";
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

/** All four fields are required, matching pg-dashboard's AddBankAccount drawer. */
function required(label: string) {
  return (value: string) => (value.trim() ? undefined : `${label} is required`);
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
      <DialogContent className="max-w-md">
        <DialogTitle>Add new bank details</DialogTitle>
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

  const form = useForm({
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
    <form
      noValidate
      className="mt-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="bankName"
        validators={{ onSubmit: ({ value }) => required("Bank name")(value) }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="bank-name">Bank name</FieldLabel>
            <Input
              id="bank-name"
              placeholder="Enter bank name"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <form.Field
        name="accountHolderName"
        validators={{ onSubmit: ({ value }) => required("Account holder name")(value) }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="bank-holder">Account holder name</FieldLabel>
            <Input
              id="bank-holder"
              placeholder="Enter account holder name"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <form.Field
        name="accountNumber"
        validators={{ onSubmit: ({ value }) => required("Account number")(value) }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="bank-account-number">Account number</FieldLabel>
            <Input
              id="bank-account-number"
              placeholder="Enter account number"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              className="font-mono"
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <form.Field
        name="ifscCode"
        validators={{ onSubmit: ({ value }) => required("IFSC code")(value) }}
      >
        {(field) => (
          <Field>
            <FieldLabel htmlFor="bank-ifsc">IFSC code</FieldLabel>
            <Input
              id="bank-ifsc"
              placeholder="Enter IFSC code"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onChange={(e) => field.handleChange(e.target.value.toUpperCase())}
              onBlur={field.handleBlur}
              className="font-mono"
            />
            <FieldError>{field.state.meta.errors[0]}</FieldError>
          </Field>
        )}
      </form.Field>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={isPending}>
          {isPending ? "Adding…" : "Add"}
        </Button>
      </div>
    </form>
  );
}
