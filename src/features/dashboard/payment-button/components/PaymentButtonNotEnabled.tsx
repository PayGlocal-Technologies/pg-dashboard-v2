"use client";

import { toast } from "sonner";
import { Button, EmptyState } from "@/components/ui";
import {
  MERCHANT_SUPPORT_EMAIL,
  PAYMENT_BUTTON_NOT_ENABLED,
} from "@/features/dashboard/payment-button/constants";

/**
 * Shown wherever the merchant lacks the payment buttons product: the list page
 * and the create editor. pg-dashboard's EmptyEnableProduct, in flux: its copy,
 * and a Contact us that copies the support address rather than opening mail.
 */
export function PaymentButtonNotEnabled({ className }: { className?: string }) {
  return (
    <EmptyState
      title={PAYMENT_BUTTON_NOT_ENABLED.title}
      description={PAYMENT_BUTTON_NOT_ENABLED.description}
      action={
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() =>
            void navigator.clipboard
              .writeText(MERCHANT_SUPPORT_EMAIL)
              .then(() => toast.success("Support email copied to clipboard"))
              .catch(() => toast.error("Couldn't copy to clipboard"))
          }
        >
          Contact us
        </Button>
      }
      className={className}
    />
  );
}
