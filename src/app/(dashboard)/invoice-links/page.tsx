import { type Metadata } from "next";
import { Suspense } from "react";
import { InvoiceLinksFeature } from "@/features/dashboard/invoice-links";

export const metadata: Metadata = {
  title: "Invoice Links",
};

export default function InvoiceLinksPage() {
  // Suspense boundary: the table seeds its Invoice Id filter from the header
  // search's ?q= handoff via useSearchParams, which Next requires be wrapped
  // so the page can still be statically prerendered.
  return (
    <Suspense>
      <InvoiceLinksFeature />
    </Suspense>
  );
}
