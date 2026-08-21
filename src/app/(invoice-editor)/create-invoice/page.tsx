import { Suspense } from "react";
import { CreateInvoiceFeature } from "@/features/dashboard/create-invoice";

// Suspense because the editor reads invoiceId / gid / clientId / status from
// useSearchParams. Route and query-parameter names are kept identical to
// pg-dashboard so existing links into the create flow keep working.
export default function CreateInvoicePage() {
  return (
    <Suspense>
      <CreateInvoiceFeature />
    </Suspense>
  );
}
