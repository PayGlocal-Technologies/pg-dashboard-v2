"use client";

import { LogoSlot } from "@/features/dashboard/create-invoice/components/preview/LogoSlot";
import { withAlpha } from "@/features/dashboard/create-invoice/helpers";
import {
  AccountBlock,
  ItemMeta,
  MemoLine,
  NotesBlock,
  PartyBlock,
  SignatureBlock,
  TotalsRows,
} from "@/features/dashboard/create-invoice/components/preview/layouts/parts";
import type { LayoutProps } from "@/features/dashboard/create-invoice/components/preview/layouts/types";

/**
 * Playful Border.
 *
 * A thick rounded frame in the primary colour with a wash of the accent inside
 * it, and a striped items table. Ported from Nova, with every raw hex-suffix
 * tint (`${accent}33` and friends) routed through `withAlpha`, so a shorthand or
 * malformed colour degrades to opaque rather than to CSS the browser discards.
 */
export function PlayfulBorderLayout({ model, onLogoClick }: LayoutProps) {
  const { labels, totals, money, items, primary, accent } = model;

  const brandLabel = "mb-1 font-bold";

  return (
    <div className="min-h-full w-full min-w-0 bg-card p-3">
      <div
        // Not PAGE_PADDING: the 10px frame is drawn inside the sheet's margin,
        // so the frame plus this inset together come to the same content inset
        // the other five themes get from p-10.
        className="flex min-h-full flex-col rounded-[28px] border-[10px] p-7"
        style={{ borderColor: primary, backgroundColor: withAlpha(accent, 0.08) }}
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <LogoSlot
              url={model.logoUrl}
              onUpload={onLogoClick}
              size={48}
              shape="circle"
              tint={primary}
            />
            <span
              className="truncate text-[12px] font-bold uppercase leading-tight"
              style={{ color: primary }}
            >
              {model.billerName}
            </span>
          </div>
          <span className="shrink-0 text-[30px] font-black italic tracking-tight text-foreground">
            {labels.invoice}
          </span>
        </div>

        <div
          className="mb-5 grid grid-cols-3 gap-2 text-[11px] font-semibold"
          style={{ color: primary }}
        >
          <p>
            {labels.invoiceNumber}{" "}
            <span className="font-normal text-foreground">{model.invoiceNumber}</span>
          </p>
          <p>
            {labels.issueDate}{" "}
            <span className="font-normal text-foreground">{model.issueDate}</span>
          </p>
          <p>
            {labels.dueDate}{" "}
            <span className="font-normal text-foreground">{model.dueDate || "-"}</span>
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-4">
          <PartyBlock
            label={labels.issuedBy}
            name={model.billerName}
            lines={model.billerLines}
            gstIn={model.billerGstIn}
            labelClassName={brandLabel}
            labelStyle={{ color: primary }}
          />
          <PartyBlock
            label={labels.billedTo}
            name={model.clientName}
            secondary={model.clientSecondary}
            lines={model.clientLines}
            labelClassName={brandLabel}
            labelStyle={{ color: primary }}
          />
        </div>

        {/* Memo sits with the amount, not in the footer. It says what this
            invoice covers; `notes` carries terms and payment instructions. Putting
            both at the bottom made the memo read as a second terms block. */}
        <MemoLine memo={model.memo} className="mb-4" />

        <div className="overflow-hidden rounded-2xl">
          <div
            className="grid grid-cols-[minmax(0,1fr)_48px_72px_84px] gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-white"
            style={{ backgroundColor: primary }}
          >
            <span>{labels.description}</span>
            <span className="text-center">{labels.qty}</span>
            <span className="text-right">{labels.unitPrice}</span>
            <span className="text-right">{labels.total}</span>
          </div>

          {items.map((item, index) => (
            <div
              key={item.key}
              className="grid grid-cols-[minmax(0,1fr)_48px_72px_84px] gap-2 px-4 py-2.5 text-[12.5px] text-foreground"
              style={{
                backgroundColor: index % 2 === 0 ? withAlpha(accent, 0.2) : "transparent",
              }}
            >
              <span className="min-w-0">
                <span className="block truncate">{item.name}</span>
                <ItemMeta item={item} />
              </span>
              <span className="text-center tabular-nums">{item.quantity}</span>
              <span className="text-right tabular-nums">{item.unitPrice}</span>
              <span className="text-right font-semibold tabular-nums">{item.amount}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-start justify-between gap-6">
          <AccountBlock
            labels={labels}
            account={model.account}
            columns={1}
            className="min-w-0"
            labelClassName={brandLabel}
            labelStyle={{ color: primary }}
          />

          <div className="w-full max-w-[200px] shrink-0 overflow-hidden rounded-xl">
            <div className="px-3 py-2" style={{ backgroundColor: withAlpha(accent, 0.28) }}>
              <TotalsRows
                labels={labels}
                subtotal={totals.subtotal}
                discountLabel={model.discountLabel}
                discountAmount={totals.discountAmount}
                taxLabel={model.taxLabel}
                taxAmount={totals.taxAmount}
                money={money}
                className="text-[12px] text-foreground"
              />
            </div>
            <div
              className="flex items-center justify-between px-3 py-2.5 text-[13px] font-bold text-white"
              style={{ backgroundColor: primary }}
            >
              <span className="uppercase">{labels.amountDue}</span>
              <span className="tabular-nums">{money(totals.total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-6">
          <NotesBlock notes={model.notes} lut={model.lut} className="max-w-[60%]" />
          <SignatureBlock url={model.signatureUrl} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}
