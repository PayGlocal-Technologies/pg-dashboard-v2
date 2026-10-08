import { type Metadata } from "next";
import { Suspense } from "react";
import { InvoiceLinkEditorFeature } from "@/features/dashboard/invoice-links/create";

export const metadata: Metadata = {
  title: "Edit Invoice Link",
};

export default async function EditInvoiceLinkPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;

  // The editor also reads ?status= to tell an issued invoice from a draft,
  // which decides PUT …/edit vs POST … on submit — hence the Suspense.
  return (
    <Suspense>
      <InvoiceLinkEditorFeature invoiceId={invoiceId} />
    </Suspense>
  );
}
