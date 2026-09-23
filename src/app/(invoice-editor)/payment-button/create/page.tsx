import { Suspense } from "react";
import { CreatePaymentButtonFeature } from "@/features/dashboard/payment-button/components/create/CreatePaymentButtonFeature";

// In the (invoice-editor) group for its full-screen shell: no sidebar or
// header, the editor's own header carries the close back to /payment-button.
// Suspense because the editor reads ?mid= (the account picked on the list)
// via useSearchParams.
export default function CreatePaymentButtonPage() {
  return (
    <Suspense>
      <CreatePaymentButtonFeature />
    </Suspense>
  );
}
