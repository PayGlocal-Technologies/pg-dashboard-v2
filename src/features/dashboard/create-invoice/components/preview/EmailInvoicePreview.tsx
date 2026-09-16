"use client";

import { Icon } from "@/components/icon";
import { LogoSlot } from "@/features/dashboard/create-invoice/components/preview/LogoSlot";
import {
  buildPreviewModel,
  type PreviewSource,
} from "@/features/dashboard/create-invoice/components/preview/previewModel";

/**
 * What the client receives in their inbox.
 *
 * An approximation of the notification email, so the merchant can sanity-check
 * the amount, due date and payee name before sending. The email template itself
 * lives server-side, so this is a likeness and not a rendering of it.
 *
 * The ground is the merchant's primary colour rather than the product's, which
 * is the whole reason Nova's email tab looks like branded mail and v2's looked
 * like a neutral card. Labels come from the same fixed set for the same reason
 * the document's do.
 */
export function EmailInvoicePreview({ source }: { source: PreviewSource }) {
  const model = buildPreviewModel(source);
  const { labels, money, totals, primary } = model;
  const firstItem = model.items[0];

  return (
    /**
     * A neutral email with the sender's colour used sparingly.
     *
     * This was a full flood: the whole card painted in the brand colour with
     * white text on it. A DQA pass called it "too blue", and the reason is that
     * the colour was carrying no information — it was the background, so it said
     * nothing about what to do next. Now it appears exactly where it means
     * something: the band that identifies the sender, and the one button the
     * recipient is meant to press.
     *
     * Inline styles rather than theme classes for those two, because a merchant's
     * brand colour is a runtime value; everything else is theme tokens so the
     * card reads correctly in dark mode too.
     */
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
      <div className="h-1 w-full" style={{ backgroundColor: primary }} aria-hidden />

      <div className="px-6 py-8">
        {model.logoUrl && (
          <div className="mb-4 flex justify-center">
            <LogoSlot url={model.logoUrl} size={44} shape="circle" />
          </div>
        )}

        <p className="mb-1.5 text-center text-[14px] text-muted-foreground">
          {model.billerName} sent you an invoice
        </p>
        <p className="mb-5 text-center text-[26px] font-bold text-foreground">
          {money(totals.total)} {model.currency}
        </p>

        <div
          className="mx-auto mb-2 flex h-11 w-full max-w-xs items-center justify-center rounded-lg text-[14px] font-semibold text-white shadow-sm"
          style={{ backgroundColor: primary }}
        >
          Pay now
        </div>
        <p className="mb-6 text-center text-[12px] text-muted-foreground">
          {model.dueDate ? `${labels.dueBy} ${model.dueDate}` : "No due date set"}
        </p>

        <div className="mx-auto w-full max-w-sm rounded-xl border border-border bg-muted/40 p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">
              {labels.invoice} {model.invoiceNumber}
              {model.hasClient ? ` · ${model.clientName}` : ""}
            </p>
            <span
              className="shrink-0 text-[12px] font-medium underline underline-offset-2"
              style={{ color: primary }}
            >
              Download PDF
            </span>
          </div>

          {firstItem && (
            <div className="mb-3 flex items-start justify-between gap-3 border-b border-border pb-3">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="shrink-0 text-[12px] text-muted-foreground">
                  {firstItem.quantity} &times;
                </span>
                <p className="truncate text-[13px] font-medium text-foreground">{firstItem.name}</p>
              </div>
              {model.items.length > 1 && (
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  +{model.items.length - 1} more
                </span>
              )}
            </div>
          )}

          <div className="space-y-1.5 text-[12.5px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>{labels.subtotal}</span>
              <span className="tabular-nums">{money(totals.subtotal)}</span>
            </div>
            {Number(totals.discountAmount) > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{model.discountLabel}</span>
                <span className="tabular-nums">-{money(totals.discountAmount)}</span>
              </div>
            )}
            {Number(totals.taxAmount) > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{model.taxLabel}</span>
                <span className="tabular-nums">{money(totals.taxAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-2 text-[13.5px] font-semibold text-foreground">
              <span>{labels.amountDue}</span>
              <span className="tabular-nums">
                {money(totals.total)} {model.currency}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-1.5 text-muted-foreground">
          <Icon name="shield-check" className="h-3.5 w-3.5" />
          <span className="text-[12px]">Powered by PayGlocal</span>
        </div>
      </div>
    </div>
  );
}
