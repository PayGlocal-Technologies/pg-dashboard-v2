"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  Separator,
  Shimmer,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { useGet } from "@/lib/api/hooks";
import { cn } from "@/lib/utils";
import { getInvoiceDetailsApi } from "@/features/dashboard/create-invoice/services";
import { useInvoiceMerchantId } from "@/features/dashboard/create-invoice/hooks";
import { InvoiceEmailModal } from "@/features/dashboard/create-invoice/components/success/InvoiceEmailModal";
import { MarkAsPaidDialog } from "@/features/dashboard/mca-invoices/components/MarkAsPaidDialog";
import { LinkTransactionModal } from "@/features/dashboard/mca-invoices/components/LinkTransactionModal";
import { getInvoiceStatusMeta } from "@/features/dashboard/mca-invoices/constants";
import { toDateKey } from "@/features/dashboard/create-invoice/components/InvoiceHeaderChips";
import { ZohoSyncLine } from "@/features/dashboard/mca-invoice-details/components/ZohoSyncLine";
import { InvoiceDocumentPanel } from "@/features/dashboard/mca-invoice-details/components/InvoiceDocumentPanel";
import {
  daysOverdue,
  formatInvoiceData,
  formatTxnData,
  type DetailField,
} from "@/features/dashboard/mca-invoice-details/helpers";
import type { InvoiceDetailsResponse } from "@/features/dashboard/create-invoice/types";
import type { InvoiceRef } from "@/features/dashboard/mca-invoices/types";

const ACTIONABLE_STATUSES = ["ACTIVE", "OUTSTANDING"];

export function McaInvoiceDetailsFeature() {
  return (
    <MidGuard productType="PACB">
      <InvoiceDetails />
    </MidGuard>
  );
}

/** One label/value pair from the details grid. */
function DetailItem({
  field,
  overdueDays,
}: {
  field: DetailField;
  /** Non-zero only on the due-date field of an overdue invoice. */
  overdueDays: number;
}) {
  return (
    // `min-w-0` plus a wrap rule, because one of these values is a transaction
    // gid: a 20-character unbroken string at 17px that, in a grid cell whose
    // default min-width is min-content, widened its own column and ran straight
    // into the Remitter beside it.
    <div className="min-w-0">
      <p className="mb-1 text-[12px] font-medium text-muted-foreground">{field.label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <p
          className={cn(
            "min-w-0 text-[17px] font-semibold [overflow-wrap:anywhere]",
            field.tone ?? "text-foreground"
          )}
        >
          {field.value}
        </p>
        {overdueDays > 0 && (
          <StatusBadge
            variant="danger"
            label={`${overdueDays} ${overdueDays === 1 ? "day" : "days"} overdue`}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}

function InvoiceDetails() {
  const router = useRouter();
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params?.invoiceId ?? "";
  const merchantId = useInvoiceMerchantId();

  const [emailOpen, setEmailOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  // Read once on mount: the overdue count must not shift mid-session, and the
  // clock is not allowed in render.
  const [today] = useState(() => new Date());

  const url = getInvoiceDetailsApi(merchantId, invoiceId);
  const { data, isPending, refetch } = useGet<InvoiceDetailsResponse>(
    ["invoice-details", merchantId, invoiceId],
    url,
    undefined,
    { enabled: !!url }
  );

  const invoice = data?.data?.invoice;
  const linkedTxn = data?.data?.linkedTransaction;
  const status = invoice?.status ?? "";

  const invoiceFields = formatInvoiceData(invoice);
  const txnFields = formatTxnData(linkedTxn);
  const overdue = status === "OUTSTANDING" ? daysOverdue(invoice?.dueDate, today) : 0;

  // Everything the shared dialogs need, without them depending on this page's
  // fuller record.
  const invoiceRef: InvoiceRef | null = invoice
    ? {
        id: invoice.id,
        mid: invoice.mid,
        invoiceNumber: invoice.invoiceNumber,
        currency: invoice.currency,
        totalAmount: String(invoice.totalAmount ?? "0"),
        clientName: invoice.clientName,
        clientBusinessName: invoice.clientBusinessName,
      }
    : null;

  const statusMeta = status ? getInvoiceStatusMeta(status) : null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        leftIcon={<Icon name="chevron-left" className="h-3.5 w-3.5" />}
        onClick={() => router.push("/mca-invoices")}
      >
        Back to invoices
      </Button>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
        <Card>
          <CardContent className="p-6">
            {isPending ? (
              <div className="space-y-4">
                <Shimmer className="h-7 w-64" />
                <Shimmer className="h-20 w-full" />
                <Shimmer className="h-20 w-full" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {invoice?.type === "RECURRING" && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center text-primary">
                              <Icon name="recurring-outlined" className="h-5 w-5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Recurring invoice</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}

                    <h1 className="text-[20px] font-semibold tracking-tight text-foreground">
                      Invoice #{invoice?.invoiceNumber || "—"}
                    </h1>

                    {statusMeta && (
                      <StatusBadge
                        variant={statusMeta.variant}
                        label={statusMeta.label}
                        size="sm"
                      />
                    )}

                    {invoice?.source === "ZOHO" && (
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1">
                              <Icon name="zoho-logo" className="h-3.5 w-3.5" />
                              <span className="text-[11.5px] font-medium text-muted-foreground">
                                Zoho
                              </span>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Imported from Zoho</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>

                <div className="mt-2">
                  <ZohoSyncLine
                    merchantId={merchantId}
                    invoiceId={invoiceId}
                    invoiceStatus={status}
                    zohoPaymentSyncStatus={invoice?.zohoPaymentSyncStatus}
                    onSynced={() => void refetch()}
                  />
                </div>

                <div className="mt-8 grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-3">
                  {invoiceFields.map((field) => (
                    <DetailItem
                      key={field.label}
                      field={field}
                      overdueDays={field.label === "Invoice Due Date" ? overdue : 0}
                    />
                  ))}
                </div>

                {ACTIONABLE_STATUSES.includes(status) && (
                  <>
                    <div className="mt-10">
                      <Button
                        type="button"
                        variant="primary"
                        leftIcon={<Icon name="mail" className="h-4 w-4" />}
                        onClick={() => setEmailOpen(true)}
                      >
                        Email / remind client
                      </Button>
                    </div>

                    <Separator className="my-8" />

                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                          <Icon name="circle-dollar-sign" className="h-5 w-5" />
                        </span>
                        <span className="text-[14px] font-semibold text-foreground">
                          Already received the payment,
                        </span>
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0"
                          onClick={() => setMarkPaidOpen(true)}
                        >
                          paid outside PayGlocal?
                        </Button>
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        leftIcon={<Icon name="link-custom-outlined" className="h-4 w-4" />}
                        onClick={() => setLinkOpen(true)}
                      >
                        Link transaction
                      </Button>
                    </div>
                  </>
                )}

                {status === "PAID" && (
                  <>
                    <div className="my-8 flex items-center gap-3">
                      <Separator className="flex-1" />
                      <Icon name="link-green-filled" className="h-10 w-10 shrink-0" />
                      <Separator className="flex-1" />
                    </div>

                    <div className="mb-6 flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-primary">
                        <Icon name="circle-dollar-sign" className="h-5 w-5" />
                      </span>
                      <h2 className="text-[15px] font-semibold text-foreground">
                        Transaction details
                      </h2>
                    </div>

                    <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-3">
                      {txnFields.map((field) => (
                        <DetailItem key={field.label} field={field} overdueDays={0} />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <InvoiceDocumentPanel
          merchantId={merchantId}
          invoiceId={invoiceId}
          invoiceNumber={invoice?.invoiceNumber ?? ""}
        />
      </div>

      {invoiceRef && (
        <>
          <InvoiceEmailModal
            open={emailOpen}
            onOpenChange={setEmailOpen}
            invoiceId={invoiceRef.id}
            invoiceNumber={invoiceRef.invoiceNumber}
            clientId={invoice?.clientId ?? ""}
            clientName={invoiceRef.clientBusinessName || invoiceRef.clientName || ""}
          />

          <MarkAsPaidDialog
            invoice={markPaidOpen ? invoiceRef : null}
            today={toDateKey(today)}
            onOpenChange={(open) => setMarkPaidOpen(open)}
            onDone={() => {
              setMarkPaidOpen(false);
              void refetch();
            }}
          />

          <LinkTransactionModal
            invoice={linkOpen ? invoiceRef : null}
            onOpenChange={(open) => setLinkOpen(open)}
            onLinked={() => {
              setLinkOpen(false);
              void refetch();
            }}
          />
        </>
      )}
    </div>
  );
}
