"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { PaymentEtaModal } from "@/features/dashboard/mca-transactions/payment-eta/components/PaymentEtaModal";
import { ETA_SAMPLE_INITIATED_DATE } from "@/features/dashboard/mca-transactions/payment-eta/constants";
import {
  todayDateKey,
  type EtaFormValues,
} from "@/features/dashboard/mca-transactions/payment-eta/eta";

const INITIAL_VALUES: EtaFormValues = {
  initiatedDate: ETA_SAMPLE_INITIATED_DATE,
  currency: "USD",
  accountId: "",
  paymentMode: "",
};

/**
 * "Check transaction status" (opens the payment ETA check), beside Settlement calendar in the Transactions header.
 * Same outline, size and text colour as its neighbour. Today's date is read when it's clicked (not during render), and each
 * open mounts a fresh modal so a new check starts from the defaults.
 */
export function PaymentEtaButton() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState({ id: 0, todayKey: "" });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        leftIcon={<Icon name="clock" className="h-3.5 w-3.5" aria-hidden />}
        onClick={() => {
          setSession((s) => ({ id: s.id + 1, todayKey: todayDateKey() }));
          setOpen(true);
        }}
        aria-label="Check transaction status"
        className="max-sm:gap-0 max-sm:px-2.5"
      >
        {/* Icon-only on phones, so it and Settlement calendar still fit on
            the title row. */}
        <span className="hidden sm:inline">Check transaction status</span>
      </Button>

      {session.id > 0 && (
        <PaymentEtaModal
          key={session.id}
          open={open}
          onOpenChange={setOpen}
          initialValues={INITIAL_VALUES}
          todayKey={session.todayKey}
        />
      )}
    </>
  );
}
