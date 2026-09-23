"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
import { SuccessTick } from "@/components/common/SuccessTick";
import { usePost } from "@/lib/api/hooks";
import { formatDate } from "@/lib/utils/format";
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
 * Layout mirrors EbrcRequestReceivedOverlay's own success card — one
 * floating, centered, rounded-2xl card over the same full-bleed background,
 * with the tick animation + heading + subtitle hero at its top — rather than
 * a left-aligned page that starts at the top of the viewport. The invoice
 * amount/due-date row and the email/download/back actions are this flow's
 * own content, nested inside that same card instead of a second stacked one,
 * so there's a single elevated surface rather than a card floating over
 * another card. Two fields the earlier reference this borrowed from showed
 * that ours doesn't exist for yet: "sent to" recipient emails and a
 * shareable payment link — neither exists in this flow's data (invoices are
 * emailed via the modal below, not to any address until then, and there's no
 * payment-link concept in this API response), so this only borrows the
 * visual structure it has real data for.
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
  dueDate,
}: {
  invoiceId: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  total: string;
  currency: string;
  symbol: string;
  dueDate?: string;
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

  const goToInvoices = () => router.push("/mca-invoices");

  return (
    <div className="relative flex min-h-full items-center justify-center overflow-y-auto p-6">
      {/* Decorative full-bleed background — the card and text above it carry
          all the real content, so alt="". */}
      <AppImage
        src="/assets/bg image.png"
        alt=""
        fill
        sizes="100vw"
        priority
        className="object-cover"
      />

      <Card className="relative w-full max-w-sm rounded-2xl p-6 shadow-lg">
        <IconButton
          aria-label="Close"
          variant="ghost"
          size="sm"
          className="absolute right-4 top-4"
          onClick={goToInvoices}
        >
          <Icon name="x" className="h-4 w-4" />
        </IconButton>

        <div className="text-center">
          <SuccessTick className="mx-auto h-16 w-16" />
          <h1 className="mt-1 text-lg font-semibold text-foreground">
            Invoice generated successfully
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            #{invoiceNumber || "-"}
            {clientName ? ` for ${clientName}` : ""}
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-border px-5 py-4 text-center">
          <p className="text-[12.5px] text-muted-foreground">Invoice to {clientName || "client"}</p>
          <p className="mt-1.5 text-[28px] font-bold tabular-nums text-foreground">
            {symbol}
            {Number(total).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-[16px] font-semibold text-muted-foreground">{currency}</span>
          </p>

          {dueDate && (
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[12.5px] font-medium text-foreground">
              <Icon name="calendar-days" className="h-3.5 w-3.5 text-muted-foreground" />
              Due on {formatDate(dueDate, { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <Button
            type="button"
            variant="primary"
            className="w-full"
            leftIcon={<Icon name="mail" className="h-3.5 w-3.5" />}
            onClick={() => setEmailOpen(true)}
          >
            Email invoice to client
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isDownloading}
            leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
            onClick={handleDownload}
          >
            {isDownloading ? "Preparing…" : "Download PDF"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={goToInvoices}>
            Back to invoices
          </Button>
        </div>
      </Card>

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
