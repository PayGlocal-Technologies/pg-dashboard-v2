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
 * Classic.
 *
 * The only layout the server's generate-invoice currently renders, so this is
 * the one that must not drift. Structure is v2's original preview markup; the
 * shared parts were extracted from it, which is why it reads as the reference
 * arrangement for the other five.
 *
 * Restrained about the brand colours — a hairline and the amount, nothing more —
 * because the generated PDF has no colour parameters yet. The moment it does,
 * this is where they go.
 */
export function ClassicLayout({ model, onLogoClick }: LayoutProps) {
  const { labels, totals, money, items, primary } = model;

  return (
    <div className={`flex min-h-full w-full min-w-0 flex-col bg-card ${PAGE_PADDING}`}>
      <div className="mb-5 flex items-center gap-4">
        <LogoSlot url={model.logoUrl} onUpload={onLogoClick} tint={primary} />
        <span className="text-[22px] font-bold tracking-tight text-foreground">
          {labels.invoice}
        </span>
      </div>

      <div className="mb-7 flex flex-wrap items-start gap-8 text-[12px]">
        <div>
          <p className="text-muted-foreground">{labels.invoiceNumber}</p>
          <p className="font-semibold text-foreground">{model.invoiceNumber}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{labels.issueDate}</p>
          <p className="font-semibold text-foreground">{model.issueDate}</p>
        </div>
        <div>
          <p className="text-muted-foreground">{labels.dueDate}</p>
          <p className="font-semibold text-foreground">{model.dueDate || "-"}</p>
        </div>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-4">
        <PartyBlock
          label={labels.issuedBy}
          name={model.billerName}
          lines={model.billerLines}
          gstIn={model.billerGstIn}
        />
        <PartyBlock
          label={labels.billedTo}
          name={model.clientName}
          secondary={model.clientSecondary}
          lines={model.clientLines}
        />
      </div>

      <p className="text-[18px] font-bold tracking-tight" style={{ color: primary }}>
        {money(totals.total)} {model.currency}
        {model.dueDate && ` ${labels.dueBy.toLowerCase()} ${model.dueDate}`}
      </p>
      <MemoLine memo={model.memo} className="mt-1" />

      <div className="mt-4 overflow-hidden border border-border">
        <div className="grid grid-cols-[minmax(0,1fr)_48px_80px_44px_84px] gap-2 border-b border-border bg-muted/30 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>{labels.description}</span>
          <span className="text-center">{labels.qty}</span>
          <span className="text-right">{labels.unitPrice}</span>
          <span className="text-right">{labels.tax}</span>
          <span className="text-right">{labels.total}</span>
        </div>

        <div className="divide-y divide-border">
          {items.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">No items yet.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.key}
                className="grid grid-cols-[minmax(0,1fr)_48px_80px_44px_84px] gap-2 px-3 py-2.5 text-[12px]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-foreground">{item.name}</span>
                  <ItemMeta item={item} />
                </span>
                <span className="text-center tabular-nums text-muted-foreground">
                  {item.quantity}
                </span>
                <span className="text-right tabular-nums text-muted-foreground">
                  {item.unitPrice}
                </span>
                <span className="text-right tabular-nums text-muted-foreground">
                  {item.gstLabel || "-"}
                </span>
                <span className="text-right font-medium tabular-nums text-foreground">
                  {item.amount}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-2 flex justify-end">
        <div className="w-full max-w-[220px]">
          <TotalsRows
            labels={labels}
            subtotal={totals.subtotal}
            discountLabel={model.discountLabel}
            discountAmount={totals.discountAmount}
            taxLabel={model.taxLabel}
            taxAmount={totals.taxAmount}
            money={money}
          />
          <div
            className="mt-1.5 flex items-center justify-between border-t pt-2 text-[16px] font-bold text-foreground"
            style={{ borderColor: primary }}
          >
            <span>{labels.amountDue}</span>
            <span className="tabular-nums">{money(totals.total)}</span>
          </div>
        </div>
      </div>

      <AccountBlock
        labels={labels}
        account={model.account}
        columns={2}
        className="mt-6 border-t border-border pt-4"
        labelClassName="mb-2 font-semibold"
      />

      <NotesBlock
        notes={model.notes}
        lut={model.lut}
        className="mt-6 border-t border-border pt-4"
      />

      <SignatureBlock url={model.signatureUrl} className="mt-6" />
    </div>
  );
}
