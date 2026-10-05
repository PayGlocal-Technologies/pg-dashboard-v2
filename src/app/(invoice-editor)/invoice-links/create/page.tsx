import { type Metadata } from "next";
import { Suspense } from "react";
import { InvoiceLinkEditorFeature } from "@/features/dashboard/invoice-links/create";

export const metadata: Metadata = {
  title: "Create Invoice Link",
};

export default function CreateInvoiceLinkPage() {
  // Full-bleed editor, so it lives in (invoice-editor) rather than (dashboard)
  // — same treatment as /create-invoice and /payment-button/create.
  return (
    <Suspense>
      <InvoiceLinkEditorFeature />
    </Suspense>
  );
}
