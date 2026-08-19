"use client";

import { Icon } from "@/components/icon";
import { formatDate } from "@/lib/utils/format";
import { getInvoiceTotals } from "@/features/dashboard/create-invoice/helpers";
import type { PreviewSource } from "@/features/dashboard/create-invoice/components/preview/InvoiceDocumentPreview";

function formatMoney(symbol: string, amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `${symbol}${(Number.isFinite(value) ? value : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * What the client receives in their inbox.
 *
 * An approximation of the notification email, so the merchant can sanity-check
 * the amount, due date and payee name before sending. Rendered in the product's
 * own theme rather than the email's, since the email template lives server-side
 * and is not something this screen can faithfully reproduce.
 */
export function EmailInvoicePreview({ source }: { source: PreviewSource }) {
  const { form, biller, client, symbol } = source;
  const { subtotal, taxAmount, total } = getInvoiceTotals(form);
  const firstItem = form.lineItems[0];

  return (
    <div className="rounded-2xl bg-primary px-6 py-10 shadow-md">
      <p className="mb-2 text-center text-[15px] font-semibold text-primary-foreground">
        {biller?.legalName || "Your business"} sent you an invoice
      </p>
      <p className="mb-5 text-center text-[26px] font-bold text-primary-foreground">
        {formatMoney(symbol, total)} {form.currency}
      </p>

      <div className="mx-auto mb-2 flex h-11 w-full max-w-xs items-center justify-center rounded-lg bg-card text-[14px] font-semibold text-primary shadow-sm">
        Pay now
      </div>
      <p className="mb-6 text-center text-[12px] text-primary-foreground/80">
        {form.dueDate
          ? `Due by ${formatDate(form.dueDate, { day: "2-digit", month: "long", year: "numeric" })}`
          : "No due date set"}
      </p>

      <div className="mx-auto w-full max-w-sm rounded-xl bg-card p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">
            Invoice {form.invoiceNumber || "-"}
            {client?.businessName ? ` for ${client.businessName}` : ""}
          </p>
          <span className="shrink-0 text-[12px] font-medium text-primary underline underline-offset-2">
            Download PDF
          </span>
        </div>

        {firstItem && (
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-border pb-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="shrink-0 text-[12px] text-muted-foreground">
                {firstItem.quantity || "1"} &times;
              </span>
              <p className="truncate text-[13px] font-medium text-foreground">
                {firstItem.description || "Item"}
              </p>
            </div>
            {form.lineItems.length > 1 && (
              <span className="shrink-0 text-[11px] text-muted-foreground">
                +{form.lineItems.length - 1} more
              </span>
            )}
          </div>
        )}

        <div className="space-y-1.5 text-[12.5px]">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMoney(symbol, subtotal)}</span>
          </div>
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Tax</span>
            <span className="tabular-nums">{formatMoney(symbol, taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2 text-[13.5px] font-semibold text-foreground">
            <span>Amount due</span>
            <span className="tabular-nums">
              {formatMoney(symbol, total)} {form.currency}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-center gap-1.5 text-primary-foreground/70">
        <Icon name="shield-check" className="h-3.5 w-3.5" />
        <span className="text-[12px]">Powered by PayGlocal</span>
      </div>
    </div>
  );
}
