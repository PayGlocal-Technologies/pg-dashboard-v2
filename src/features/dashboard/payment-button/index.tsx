"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { MidGuard } from "@/components/common/MidGuard";
import { PaymentButtonTable } from "@/features/dashboard/payment-button/components/PaymentButtonTable";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { EnableProductAction, FeatureBanner } from "@/components/common/FeatureBanner";
import {
  CreatePaymentButtonDialog,
  EditPaymentButtonDialog,
} from "@/features/dashboard/payment-button/components/create/CreatePaymentButtonFeature";
import {
  useHasPaymentButtons,
  usePaymentButtonCreateScope,
  usePaymentButtonsEnabled,
} from "@/features/dashboard/payment-button/hooks";
import { MidScopedAction } from "@/components/common/MidScopedAction";
import {
  PAYMENT_BUTTON_PAGE_SUBTITLE,
  PAYMENT_BUTTONS_FEATURE,
} from "@/features/dashboard/payment-button/constants";
import type {
  PaymentButton,
  PaymentButtonEditTarget,
} from "@/features/dashboard/payment-button/types";

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
  const isEnabled = usePaymentButtonsEnabled();

  // Create opens in a modal over the list. With several eligible MIDs and none
  // selected, the button asks which one first (pg-dashboard's ChooseMidSelect);
  // otherwise it uses the selected or only eligible MID.
  const searchParams = useSearchParams();
  const {
    mid: defaultMid,
    needsMidChoice,
    midOptions,
  } = usePaymentButtonCreateScope(searchParams.get("mid"));
  // Seeded from ?create=1 (where /payment-button/create redirects, e.g. from
  // the header search). Read once on mount; with several MIDs and none in the
  // URL it stays closed, and the button asks for one as usual.
  const [createMid, setCreateMid] = useState<string | null>(() =>
    searchParams.get("create") === "1" ? defaultMid : null
  );
  const openCreate = (mid: string) => setCreateMid(mid || defaultMid);

  // Edit opens the same modal on the button's saved settings.
  const [editTarget, setEditTarget] = useState<PaymentButtonEditTarget | null>(null);
  const openEdit = (row: PaymentButton) => setEditTarget({ mid: row.mid, buttonId: row.buttonId });

  // Not enabled: the banner asks them to enable it, over an empty table (no
  // list call, nothing to create). Enabled with no button yet: the banner
  // leads, pointing at Create. Once a button exists the page is the list.
  const hasButtons = useHasPaymentButtons(isEnabled);
  const showBanner = !isEnabled || hasButtons === false;

  const createAction = (
    <MidScopedAction
      label="Create payment button"
      icon="plus"
      variant="primary"
      needsMidChoice={needsMidChoice}
      midOptions={midOptions}
      onRun={openCreate}
    />
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 page-enter">
      <PageHeader
        title="Payment Button"
        subtitle={PAYMENT_BUTTON_PAGE_SUBTITLE}
        actions={isEnabled ? createAction : undefined}
      />

      {showBanner && (
        <FeatureBanner
          imageSrc="/assets/banner-states/Payment%20button.png"
          title="Accept payments with a click"
          description="Add payment buttons to your website and other digital touchpoints with a simple, low-code integration. Accept payments without building a complete checkout experience."
          action={isEnabled ? createAction : <EnableProductAction product="Payment Button" />}
        />
      )}

      {isEnabled ? (
        <MidGuard productType="PA" feature={PAYMENT_BUTTONS_FEATURE}>
          <PaymentButtonTable onEdit={openEdit} />
        </MidGuard>
      ) : (
        <Card className="gap-0 p-0">
          <PlaceholderState
            variant="empty-table"
            title="No payment buttons yet"
            description="Payment buttons you create will show up here."
            className="py-16"
          />
        </Card>
      )}

      <EditPaymentButtonDialog
        target={editTarget}
        onOpenChange={(open) => !open && setEditTarget(null)}
      />

      <CreatePaymentButtonDialog
        mid={createMid}
        open={createMid !== null}
        onOpenChange={(open) => !open && setCreateMid(null)}
      />
    </div>
  );
}
