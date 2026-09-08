import { Suspense } from "react";
import { TemplateEditorFeature } from "@/features/dashboard/invoice-templates/editor";

/**
 * A blank template.
 *
 * Nothing is created on the server until Save: unlike /create-invoice, which
 * POSTs a draft on mount, opening this route and backing out leaves no trace.
 */
export default function NewInvoiceTemplatePage() {
  return (
    <Suspense>
      <TemplateEditorFeature />
    </Suspense>
  );
}
