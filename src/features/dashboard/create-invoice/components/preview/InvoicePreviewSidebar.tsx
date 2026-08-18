"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import {
  InvoiceDocumentPreview,
  type PreviewSource,
} from "@/features/dashboard/create-invoice/components/preview/InvoiceDocumentPreview";
import { EmailInvoicePreview } from "@/features/dashboard/create-invoice/components/preview/EmailInvoicePreview";

/** Live preview of the document and the notification email, as Nova arranges it. */
export function InvoicePreviewSidebar({ source }: { source: PreviewSource }) {
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
        <InvoiceDocumentPreview source={source} />
      </TabsContent>

      <TabsContent value="email">
        <EmailInvoicePreview source={source} />
      </TabsContent>
    </Tabs>
  );
}
