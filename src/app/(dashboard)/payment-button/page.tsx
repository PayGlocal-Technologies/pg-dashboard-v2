import { Suspense } from "react";
import { PaymentButtonFeature } from "@/features/dashboard/payment-button";

export default function PaymentButtonPage() {
  // Suspense boundary: the table reads the header search's ?q= handoff (and the
  // page its ?action=) via useSearchParams, which Next requires be wrapped so
  // the page can still be statically prerendered.
  return (
    <Suspense>
      <PaymentButtonFeature />
    </Suspense>
  );
}
