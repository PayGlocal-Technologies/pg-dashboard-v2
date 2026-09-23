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
  /** Opens BrandingSection below — the "Customise template" shortcut takes
   *  the segmented tab switcher's old spot beside the heading, since that
   *  switcher moved to its own row (see the line tabs below). */
  onCustomiseClick?: () => void;
}) {
  return (
    <Tabs defaultValue="pdf" className="w-full">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
          Preview
        </h2>
        {/* "outline", not "ghost": this sits on the sidebar's own muted
            wash, where a borderless ghost button read as plain text rather
            than something to press. The outline variant's card fill plus
            border gives it an edge against that surface. */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<Icon name="pencil" className="h-3.5 w-3.5" />}
          onClick={onCustomiseClick}
        >
          Customise template
        </Button>
      </div>

      {/* Line tabs, not the segmented pill the design system defaults to —
          an underline under the active label instead of a filled chip, so
          this reads as a lighter, secondary switch under the heading rather
          than competing with "Customise template" above it for weight. */}
      {/* border-0 first: TabsList's own base class sets `border` (all four
          sides), which border-b alone doesn't cancel — tailwind-merge treats
          them as different utility groups, so without border-0 the other
          three sides kept a stray stroke around the whole row. */}
      <TabsList className="mb-3 h-auto gap-4 rounded-none border-0 border-b border-border bg-transparent p-0">
        <TabsTrigger
          value="pdf"
          className="rounded-none border-b-2 border-transparent px-0.5 pb-2 pt-0 text-[13px] text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          Document
        </TabsTrigger>
        <TabsTrigger
          value="email"
          className="rounded-none border-b-2 border-transparent px-0.5 pb-2 pt-0 text-[13px] text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          Email
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pdf">
        <InvoiceDocumentPreview source={source} onLogoClick={onLogoClick} />
      </TabsContent>

      <TabsContent value="email">
        <EmailInvoicePreview source={source} />
      </TabsContent>
    </Tabs>
  );
}
