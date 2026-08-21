"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { InvoiceDocumentPreview } from "@/features/dashboard/create-invoice/components/preview/InvoiceDocumentPreview";
import { EmailInvoicePreview } from "@/features/dashboard/create-invoice/components/preview/EmailInvoicePreview";
import type { PreviewSource } from "@/features/dashboard/create-invoice/components/preview/previewModel";

/** Live preview of the document and the notification email, as Nova arranges it. */
export function InvoicePreviewSidebar({
  source,
  onLogoClick,
}: {
  source: PreviewSource;
  /** Passed to the document so its logo placeholder is the upload affordance. */
  onLogoClick?: () => void;
}) {
  return (
    <Tabs defaultValue="pdf" className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Preview
        </h2>
        <TabsList>
          <TabsTrigger value="pdf">Document</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="pdf">
        <InvoiceDocumentPreview source={source} onLogoClick={onLogoClick} />
      </TabsContent>

      <TabsContent value="email">
        <EmailInvoicePreview source={source} />
      </TabsContent>
    </Tabs>
  );
}
