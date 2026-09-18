import { Suspense } from "react";
import { McaInvoicesFeature } from "@/features/dashboard/mca-invoices";

export default function McaInvoicesPage() {
  // Suspense boundary: the table below reads the header search's ?q= handoff
  // via useSearchParams, which Next requires be wrapped so the page can still
  // be statically prerendered.
  return (
    <Suspense>
      <McaInvoicesFeature />
    </Suspense>
  );
}
