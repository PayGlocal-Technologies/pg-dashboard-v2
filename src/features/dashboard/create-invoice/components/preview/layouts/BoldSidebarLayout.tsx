"use client";

import { LogoSlot } from "@/features/dashboard/create-invoice/components/preview/LogoSlot";
import {
  AccountBlock,
  ItemMeta,
  MemoLine,
  NotesBlock,
  PAGE_PADDING,
  PartyBlock,
  SignatureBlock,
  TotalsRows,
} from "@/features/dashboard/create-invoice/components/preview/layouts/parts";
import type { LayoutProps } from "@/features/dashboard/create-invoice/components/preview/layouts/types";

/**
 * Bold Sidebar.
 *
 * A vertical rail carrying the biller's name and the word "invoice" rotated,
 * with the document proper to its right. Ported from Nova. Nova's QR corner is
 * not here because v2 has no QR field on the invoice (parity ledger entry 19).
 */
export function BoldSidebarLayout({ model, onLogoClick }: LayoutProps) {
  const { labels, totals, money, items, primary, accent } = model;

  const brandLabel = "mb-1 font-bold uppercase tracking-wide";

  return (
    <div className="grid min-h-full w-full min-w-0 grid-cols-[64px_minmax(0,1fr)] bg-card">
      <div className="relative border-r" style={{ borderColor: primary }}>
        <p
          className="absolute left-1/2 top-6 max-h-[55%] -translate-x-1/2 overflow-hidden whitespace-nowrap text-[15px] font-semibold tracking-wide"
          style={{ writingMode: "vertical-rl", color: primary }}
        >
          {model.billerName}
        </p>
        <p
          className="absolute bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[34px] font-black italic tracking-tight"
          style={{ writingMode: "vertical-rl", color: primary }}
        >
          {labels.invoice.toLowerCase()}
        </p>
      </div>

      <div className={`flex min-w-0 flex-col ${PAGE_PADDING}`}>
        <div
          className="mb-6 flex items-start justify-between gap-6 border-b pb-6"
          style={{ borderColor: primary }}
        >
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <LogoSlot url={model.logoUrl} onUpload={onLogoClick} size={40} tint={primary} />
            <PartyBlock
              label={labels.issuedBy}
              name={model.billerName}
              lines={model.billerLines}
              gstIn={model.billerGstIn}
              labelClassName={brandLabel}
              labelStyle={{ color: primary }}
            />
          </div>

          <div className="min-w-0 flex-1 text-right text-[12px]">
            <p style={{ color: primary }}>
              {labels.invoiceNumber} {model.invoiceNumber}
            </p>
            <p style={{ color: primary }}>
              {labels.issueDate} {model.issueDate}
            </p>
            {model.dueDate && (
              <p style={{ color: primary }}>
                {labels.dueBy} {model.dueDate}
              </p>
            )}

            <PartyBlock
              label={labels.billedTo}
              name={model.clientName}
              secondary={model.clientSecondary}
              lines={model.clientLines}
              className="mt-3"
              labelClassName={`${brandLabel} underline underline-offset-2`}
              labelStyle={{ color: primary }}
            />
          </div>
        </div>

        {/* Memo sits with the amount, not in the footer. It says what this
            invoice covers; `notes` carries terms and payment instructions. Putting
            both at the bottom made the memo read as a second terms block. */}
        <MemoLine memo={model.memo} className="mb-5" />

        <div className="mb-6 border-b pb-4" style={{ borderColor: primary }}>
          <div
            className="mb-2.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wide"
            style={{ color: primary }}
          >
            <span>{labels.description}</span>
            <span>{labels.total}</span>
          </div>

          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.key} className="flex items-baseline justify-between gap-4 text-[13px]">
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{item.name}</span>
                  <span className="block text-[10.5px] text-muted-foreground">
                    {item.quantity} × {item.unitPrice}
                  </span>
                  <ItemMeta item={item} />
                </span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {item.amount}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex justify-end border-t pt-3" style={{ borderColor: primary }}>
            <div className="w-full max-w-[240px]">
              <TotalsRows
                labels={labels}
                subtotal={totals.subtotal}
                discountLabel={model.discountLabel}
                discountAmount={totals.discountAmount}
                taxLabel={model.taxLabel}
                taxAmount={totals.taxAmount}
                money={money}
                className="text-[12px]"
              />
              <div
                className="mt-1.5 flex items-center justify-between text-[14px] font-bold"
                style={{ color: primary }}
              >
                <span className="uppercase tracking-wide">{labels.amountDue}</span>
                <span className="tabular-nums">{money(totals.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between gap-6">
          <div className="min-w-0" style={{ color: accent }}>
            <AccountBlock
              labels={labels}
              account={model.account}
              columns={1}
              labelClassName={`${brandLabel} underline underline-offset-2`}
              labelStyle={{ color: accent }}
            />
            <NotesBlock notes={model.notes} lut={model.lut} className="mt-4" />
          </div>

          <SignatureBlock url={model.signatureUrl} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}
