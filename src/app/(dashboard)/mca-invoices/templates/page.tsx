import { Suspense } from "react";
import { InvoiceTemplatesFeature } from "@/features/dashboard/invoice-templates";

/**
 * Saved templates, the second half of invoice management.
 *
 * A static segment beside the existing `[invoiceId]` one. Next resolves static
 * before dynamic, so this wins; the only consequence is that no invoice can be
 * addressed at /mca-invoices/templates, and invoice ids are server-minted.
 */
export default function InvoiceTemplatesPage() {
  return (
    <Suspense>
      <InvoiceTemplatesFeature />
    </Suspense>
  );
}
