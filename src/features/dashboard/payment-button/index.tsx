"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { MidGuard } from "@/components/common/MidGuard";
import { PaymentButtonTable } from "@/features/dashboard/payment-button/components/PaymentButtonTable";
import { PaymentButtonNotEnabled } from "@/features/dashboard/payment-button/components/PaymentButtonNotEnabled";
import {
  usePaymentButtonCreateScope,
  usePaymentButtonsEnabled,
} from "@/features/dashboard/payment-button/hooks";
import { MidScopedAction } from "@/components/common/MidScopedAction";
import {
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
  const isEnabled = usePaymentButtonsEnabled();

  // Create is its own full-screen route (see (invoice-editor)/payment-button).
  // With several eligible MIDs and none selected, the button asks which one
  // first (pg-dashboard's ChooseMidSelect) and the choice rides as ?mid=.
  const { needsMidChoice, midOptions } = usePaymentButtonCreateScope();
  const openCreate = (mid: string) =>
    router.push(
      mid ? `/payment-button/create?mid=${encodeURIComponent(mid)}` : "/payment-button/create"
    );

  // TODO: Edit lands with its design.
  const openEdit = (_row: PaymentButton) => {};

  if (!isEnabled) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
        <PageHeader title="Payment Button" subtitle={PAYMENT_BUTTON_PAGE_SUBTITLE} />
        <PaymentButtonNotEnabled className="rounded-xl border border-border bg-card" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="Payment Button"
        subtitle={PAYMENT_BUTTON_PAGE_SUBTITLE}
        actions={
          <MidScopedAction
            label="Create payment button"
            icon="plus"
            variant="primary"
            needsMidChoice={needsMidChoice}
            midOptions={midOptions}
            onRun={openCreate}
          />
        }
      />

      <MidGuard productType="PA" feature={PAYMENT_BUTTONS_FEATURE}>
        <PaymentButtonTable onEdit={openEdit} />
      </MidGuard>
    </div>
  );
}
