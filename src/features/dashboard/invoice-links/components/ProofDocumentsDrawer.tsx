"use client";

import { useState } from "react";
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
import { PdfViewer } from "@/components/common/PdfViewer";
import { UnderlineTabs } from "@/components/common/UnderlineTabs";
import { useInvoicePaymentProof } from "@/features/dashboard/invoice-links/hooks";

/**
 * The proof-of-payment documents on an invoice paid offline, shown in place.
 *
 * Upstream (pg-dashboard's drawer, gcc-ui-temp's StatusModal) only lists the
 * file names and opens each in a new tab. Here the file itself is shown, the
 * way Preview Invoice shows the invoice: same drawer, same width, PDFs through
 * the shared PdfViewer. Proofs are PDF, JPG or PNG (the upload's own limits),
 * so an image is drawn inline instead. Several proofs get a tab each.
 *
 * Same read as upstream: GET …/payment-proof?id= → `{ [filename]: url }`.
 */
export function ProofDocumentsDrawer({
  open,
  onOpenChange,
  mid,
  invoiceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mid: string;
  invoiceId: string;
}) {
  const { data, isPending } = useInvoicePaymentProof(mid, invoiceId, open);
  const docs = Object.entries(data?.data ?? {}).map(([name, url]) => ({ name, url }));

  // Null until a tab is picked; the first document is shown until then.
  const [selected, setSelected] = useState<string | null>(null);
  const active = docs.find((doc) => doc.name === selected) ?? docs[0];
  const isPdf = !!active && active.name.toLowerCase().endsWith(".pdf");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      {/* Preview Invoice's width (InvoicePreviewDrawer): flux's right drawer
          is `sm:w-96`, so the width itself has to be overridden. */}
      <DrawerContent className="w-full sm:w-[70vw] lg:w-[700px]">
        <DrawerHeader>
          <DrawerTitle>Proof documents · Invoice {invoiceId}</DrawerTitle>
        </DrawerHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-4 pb-4">
          {isPending ? (
            <Shimmer className="h-[32rem] w-full rounded-lg" />
          ) : !active ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No proof documents found
            </p>
          ) : (
            <>
              {docs.length > 1 ? (
                <UnderlineTabs
                  tabs={docs.map((doc) => ({ value: doc.name, label: doc.name }))}
                  value={active.name}
                  onValueChange={setSelected}
                />
              ) : null}

              {!active.url ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {active.name} could not be loaded.
                </p>
              ) : isPdf ? (
                // Keyed so switching tabs loads the new file rather than
                // keeping the previous document's page state.
                <PdfViewer key={active.name} url={active.url} title={active.name} />
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Icon name="arrow-up-right" className="h-3.5 w-3.5" />}
                      onClick={() => window.open(active.url, "_blank", "noopener,noreferrer")}
                    >
                      Open in new tab
                    </Button>
                  </div>
                  <AppImage
                    key={active.name}
                    src={active.url}
                    alt={active.name}
                    width={1200}
                    height={1600}
                    unoptimized
                    className="h-auto w-full rounded-lg border border-border object-contain"
                  />
                </>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
