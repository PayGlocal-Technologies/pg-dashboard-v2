import { Suspense } from "react";
import { TemplateEditorFeature } from "@/features/dashboard/invoice-templates/editor";

export default async function EditInvoiceTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  return (
    <Suspense>
      <TemplateEditorFeature templateId={templateId} />
    </Suspense>
  );
}
