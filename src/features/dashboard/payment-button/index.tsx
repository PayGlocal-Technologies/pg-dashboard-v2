"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, EmptyState, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { PaymentButtonTable } from "@/features/dashboard/payment-button/components/PaymentButtonTable";
import { useApp } from "@/stores/useApp";
import {
  MERCHANT_SUPPORT_EMAIL,
  PAYMENT_BUTTON_NOT_ENABLED,
  PAYMENT_BUTTON_PAGE_SUBTITLE,
  PAYMENT_BUTTONS_FEATURE,
} from "@/features/dashboard/payment-button/constants";
import type { PaymentButton } from "@/features/dashboard/payment-button/types";

/**
 * Payment buttons, at /payment-button, gated the way pg-dashboard gates it:
 *
 *  - The merchant must have PAYMENT_BUTTONS in `merchantEnabledProducts
 *    .paymentProducts`; otherwise the page explains the product and offers
 *    Contact us (pg-dashboard's EmptyEnableProduct), with no Create button.
 *  - A selected MID must be PA and carry the PAYMENT_BUTTONS feature, else
 *    MidGuard shows the standard "not available for this MID" view.
 *
 * Same shell as MCA Links: title + supporting line with the primary CTA flush
 * right, then the one table surface.
 */
export function PaymentButtonFeature() {
  const router = useRouter();
  const paymentProducts = useApp((s) => s.merchantEnabledProducts?.paymentProducts);
  const isEnabled = !!paymentProducts?.includes(PAYMENT_BUTTONS_FEATURE);

  // Create is its own full-screen route (see (invoice-editor)/payment-button).
  const openCreate = () => router.push("/payment-button/create");

  // TODO: Edit lands with its design.
  const openEdit = (_row: PaymentButton) => {};

  if (!isEnabled) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
        <PageHeader title="Payment Button" subtitle={PAYMENT_BUTTON_PAGE_SUBTITLE} />
        <EmptyState
          title={PAYMENT_BUTTON_NOT_ENABLED.title}
          description={PAYMENT_BUTTON_NOT_ENABLED.description}
          action={
            // Copies the support address, as pg-dashboard's button does.
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
          className="rounded-xl border border-border bg-card"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="Payment Button"
        subtitle={PAYMENT_BUTTON_PAGE_SUBTITLE}
        actions={
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onClick={openCreate}
          >
            Create payment button
          </Button>
        }
      />

      <MidGuard productType="PA" feature={PAYMENT_BUTTONS_FEATURE}>
        <PaymentButtonTable onEdit={openEdit} />
      </MidGuard>
    </div>
  );
}
