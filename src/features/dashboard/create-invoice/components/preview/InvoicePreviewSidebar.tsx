"use client";

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { InvoiceDocumentPreview } from "@/features/dashboard/create-invoice/components/preview/InvoiceDocumentPreview";
import { EmailInvoicePreview } from "@/features/dashboard/create-invoice/components/preview/EmailInvoicePreview";
import type { PreviewSource } from "@/features/dashboard/create-invoice/components/preview/previewModel";

/** Live preview of the document and the notification email, as Nova arranges it. */
export function InvoicePreviewSidebar({
  source,
  onLogoClick,
  onCustomiseClick,
}: {
  source: PreviewSource;
  /** Passed to the document so its logo placeholder is the upload affordance. */
  onLogoClick?: () => void;
  /** Opens BrandingSection below — the shortcut now sits inline beside the
   *  "Preview" heading, with the Document/Email switcher moved to the
   *  heading row's other end (its old spot). */
  onCustomiseClick?: () => void;
}) {
  return (
    <Tabs defaultValue="pdf" className="w-full">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Preview
          </h2>
          {/* Plain text-weight trigger, not a filled/outlined button — this
              sits right beside the "Preview" label and only needs to read as
              a secondary shortcut, not compete with it for visual weight. */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="pencil" className="h-3 w-3" />}
            onClick={onCustomiseClick}
            className="h-auto min-h-0 shrink-0 gap-1 px-1.5 py-1 text-[12px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground hover:underline"
          >
            Customise template
          </Button>
        </div>

        {/* Segmented pill switcher — flux's Tabs default (filled active chip
            on a muted track) rather than the underline treatment, in the
            "Customise template" button's old top-right spot. */}
        <TabsList className="h-8 shrink-0 p-0.5">
          <TabsTrigger value="pdf" className="px-2.5 py-1 text-[12px]">
            Document
          </TabsTrigger>
          <TabsTrigger value="email" className="px-2.5 py-1 text-[12px]">
            Email
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="pdf">
        {/* Zoomed out a touch — mx-auto keeps it centred in the column
            rather than pinned to the left edge as it shrinks. */}
        <div className="mx-auto w-[88%]">
          <InvoiceDocumentPreview source={source} onLogoClick={onLogoClick} />
        </div>
      </TabsContent>

      <TabsContent value="email">
        <EmailInvoicePreview source={source} />
      </TabsContent>
    </Tabs>
  );
}
