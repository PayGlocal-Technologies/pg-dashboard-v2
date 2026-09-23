"use client";

import { useRouter } from "next/navigation";
import { Button, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { PaymentButtonTable } from "@/features/dashboard/payment-button/components/PaymentButtonTable";
import { PAYMENT_BUTTON_PAGE_SUBTITLE } from "@/features/dashboard/payment-button/constants";
import type { PaymentButton } from "@/features/dashboard/payment-button/types";

/**
 * Payment buttons, at /payment-button. A PA product (pg-dashboard gates it on
 * PAYMENT_BUTTONS and the selected MID's applicability), so the table sits
 * behind MidGuard for PA: a PACB MID selected in the header shows the standard
 * "not available for this MID" view instead.
 *
 * Same shell as MCA Links: title + supporting line with the primary CTA flush
 * right, then the one table surface.
 */
export function PaymentButtonFeature() {
  const router = useRouter();

  // Create is its own full-screen route (see (invoice-editor)/payment-button).
  const openCreate = () => router.push("/payment-button/create");

  // TODO: Edit lands with its design.
  const openEdit = (_row: PaymentButton) => {};

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

      <MidGuard productType="PA">
        <PaymentButtonTable onEdit={openEdit} />
      </MidGuard>
    </div>
  );
}
