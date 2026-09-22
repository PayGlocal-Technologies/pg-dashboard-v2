"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
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
 * Layout follows a reference the user supplied (full-bleed soft-gradient
 * background, left-aligned heading with a close button, a bordered card with
 * an amount/due-date row) — content itself is unchanged, not rewritten to
 * match that reference's own copy. Two fields it shows that ours doesn't
 * exist for yet: "sent to" recipient emails and a shareable payment link —
 * neither exists in this flow's data (invoices are emailed via the modal
 * below, not to any address until then, and there's no payment-link concept
 * in this API response), so this only borrows the visual structure it has
 * real data for.
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
    <div className="relative min-h-full overflow-y-auto">
      {/* Decorative full-bleed background — the card and text above it carry
          all the real content, so alt="". */}
      <AppImage
        src="/assets/bg image.png"
        alt=""
        fill
        sizes="100vw"
        priority
        className="-z-10 object-cover"
      />

      <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-semibold leading-snug text-foreground">
              Invoice generated successfully
            </h1>
            <p className="mt-1 text-[13.5px] text-muted-foreground">
              #{invoiceNumber || "-"}
              {clientName ? ` for ${clientName}` : ""}
            </p>
          </div>
          <IconButton aria-label="Close" variant="ghost" size="sm" onClick={goToInvoices}>
            <Icon name="x" className="h-4 w-4" />
          </IconButton>
        </div>

        <Card className="mt-6 overflow-hidden rounded-2xl p-0">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-6 py-5 sm:px-8">
            <div>
              <p className="text-[12.5px] text-muted-foreground">
                Invoice to {clientName || "client"}
              </p>
              <p className="mt-2 text-[28px] font-bold tabular-nums text-foreground">
                {symbol}
                {Number(total).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                <span className="text-[16px] font-semibold text-muted-foreground">{currency}</span>
              </p>
            </div>

            {dueDate && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-[12.5px] font-medium text-foreground">
                <Icon name="calendar-days" className="h-3.5 w-3.5 text-muted-foreground" />
                Due on {formatDate(dueDate, { day: "2-digit", month: "short", year: "numeric" })}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 px-6 py-5 sm:px-8">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Icon name="mail" className="h-3.5 w-3.5" />}
              onClick={() => setEmailOpen(true)}
            >
              Email invoice to client
            </Button>
          </div>
        </Card>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="secondary"
            className="rounded-full"
            disabled={isDownloading}
            leftIcon={<Icon name="download" className="h-3.5 w-3.5" />}
            onClick={handleDownload}
          >
            {isDownloading ? "Preparing…" : "Download PDF"}
          </Button>
          <Button type="button" variant="primary" className="rounded-full" onClick={goToInvoices}>
            View all invoices
          </Button>
        </div>
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
