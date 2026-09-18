"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, CardContent, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { usePost } from "@/lib/api/hooks";
import { downloadInvoiceApi } from "@/features/dashboard/create-invoice/services";
import { useInvoiceMerchantId } from "@/features/dashboard/create-invoice/hooks";
import { InvoiceEmailModal } from "@/features/dashboard/create-invoice/components/success/InvoiceEmailModal";
import type { BaseResponse } from "@/types/common";

/**
 * Post-generation screen.
 *
 * Nova ends the flow with a toast; production ends it here, because generating
 * the document and delivering it are separate decisions. Emailing, downloading
 * and getting back to the list all hang off this screen.
 *
 * One production affordance is missing: "Link transaction", which attaches a
 * finished invoice to a payment after the fact. That is the mca-link-transaction
 * feature, not part of the create flow, and has not been migrated yet. Creating
 * an invoice already linked to a transaction (the ?gid= entry point) is
 * supported and skips this screen entirely.
 */
export function CreateInvoiceSuccess({
  invoiceId,
  invoiceNumber,
  clientId,
  clientName,
  total,
  currency,
  symbol,
}: {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  total: string;
  currency: string;
  symbol: string;
}) {
  const router = useRouter();
  const merchantId = useInvoiceMerchantId();
  const [emailOpen, setEmailOpen] = useState(false);

  const { mutate: downloadInvoice, isPending: isDownloading } = usePost<
    BaseResponse<{ url: string }>,
    undefined
  >(downloadInvoiceApi(merchantId, invoiceId), { invalidateQueries: false });

  const handleDownload = () => {
    downloadInvoice(undefined, {
      onSuccess: (response) => {
        const url = response?.data?.url;
        if (!url) {
          toast.error("Couldn't open the invoice", { description: "No document link came back." });
          return;
        }
        // The server returns a presigned link; opening it is the download.
        window.open(url, "_blank", "noopener,noreferrer");
      },
      onError: (error) => toast.error("Couldn't open the invoice", { description: error.message }),
    });
  };

  return (
    <div className="flex min-h-full items-start justify-center px-4 py-10">
      <div className="w-full max-w-xl">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mb-4"
          leftIcon={<Icon name="chevron-left" className="h-3.5 w-3.5" />}
          onClick={() => router.push("/mca-invoices")}
        >
          Back to invoices
        </Button>

        <Card>
          <CardContent className="flex flex-col items-center gap-1 px-6 py-10 text-center sm:px-10">
            <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
              <Icon name="check-circle" className="h-7 w-7" />
            </span>

            <h1 className="text-[20px] font-semibold text-foreground">
              Invoice generated successfully
            </h1>
            <p className="text-[13.5px] text-muted-foreground">
              #{invoiceNumber || "-"}
              {clientName ? ` for ${clientName}` : ""}
            </p>

            <p className="mt-5 text-[28px] font-bold tabular-nums text-foreground">
              {symbol}
              {Number(total).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-[16px] font-semibold text-muted-foreground">{currency}</span>
            </p>

            <Button
              type="button"
              variant="primary"
              className="mt-6"
              leftIcon={<Icon name="mail" className="h-4 w-4" />}
              onClick={() => setEmailOpen(true)}
            >
              Email invoice to client
            </Button>

            <div className="mt-5 flex items-center gap-3">
              <Button
                type="button"
                variant="link"
                size="sm"
                disabled={isDownloading}
                leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
                onClick={handleDownload}
              >
                {isDownloading ? "Preparing…" : "Download PDF"}
              </Button>

              <Separator orientation="vertical" className="h-4" />

              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => router.push("/mca-invoices")}
              >
                View all invoices
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <InvoiceEmailModal
        open={emailOpen}
        onOpenChange={setEmailOpen}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        clientId={clientId}
        clientName={clientName}
      />
    </div>
  );
}
