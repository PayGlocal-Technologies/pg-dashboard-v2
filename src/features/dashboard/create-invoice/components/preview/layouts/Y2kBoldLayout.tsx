"use client";

import { Icon } from "@/components/icon";
import { LogoSlot } from "@/features/dashboard/create-invoice/components/preview/LogoSlot";
import { withAlpha } from "@/features/dashboard/create-invoice/helpers";
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
 * Y2K Bold.
 *
 * Centred, uppercase, sparkles either side of the wordmark, accent-underlined
 * section heads. Ported from Nova; the sparkle comes from the icon registry
 * rather than a direct lucide-react import, per CLAUDE.md's icon rule.
 */
export function Y2kBoldLayout({ model, onLogoClick }: LayoutProps) {
  const { labels, totals, money, items, primary, accent } = model;

  const headLabel = "border-b-2 pb-1 mb-2 text-[11px] font-extrabold uppercase tracking-wide text-foreground";
  const headStyle = { borderColor: accent };

  return (
    <div className={`flex min-h-full w-full min-w-0 flex-col bg-card text-center ${PAGE_PADDING}`}>
      <div className="mb-2 flex items-center justify-center gap-2">
        <LogoSlot url={model.logoUrl} onUpload={onLogoClick} size={28} tint={primary} />
        <span className="text-[13px] font-extrabold uppercase tracking-widest text-foreground">
          {model.billerName}
        </span>
      </div>

      <div className="mb-8 flex items-center justify-center gap-3">
        <Icon name="sparkles" className="h-6 w-6" style={{ color: primary }} aria-hidden />
        <span className="text-[40px] font-black uppercase italic tracking-tight text-foreground">
          {labels.invoice}
        </span>
        <Icon name="sparkles" className="h-6 w-6" style={{ color: primary }} aria-hidden />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6 text-left">
        <PartyBlock
          label={`${labels.invoiceFrom}:`}
          name={model.billerName}
          lines={model.billerLines}
          gstIn={model.billerGstIn}
          labelClassName={headLabel}
          labelStyle={headStyle}
          bodyClassName="text-[11.5px] text-muted-foreground"
        />
        <PartyBlock
          label={`${labels.invoiceTo}:`}
          name={model.clientName}
          secondary={model.clientSecondary}
          lines={model.clientLines}
          labelClassName={headLabel}
          labelStyle={headStyle}
          bodyClassName="text-[11.5px] text-muted-foreground"
        />
      </div>

      <div className="mb-4 flex flex-wrap justify-between gap-3 text-left text-[11.5px] text-muted-foreground">
        <span>
          {labels.invoiceNumber}{" "}
          <span className="font-semibold text-foreground">{model.invoiceNumber}</span>
        </span>
        <span>
          {labels.issueDate}{" "}
          <span className="font-semibold text-foreground">{model.issueDate}</span>
        </span>
        <span>
          {labels.dueDate}{" "}
          <span className="font-semibold text-foreground">{model.dueDate || "-"}</span>
        </span>
      </div>

      {/* Memo sits with the amount, not in the footer. It says what this
          invoice covers; `notes` carries terms and payment instructions. Putting
          both at the bottom made the memo read as a second terms block. */}
      <MemoLine memo={model.memo} className="mb-4 text-left" />

      <div
        className="mb-2 grid grid-cols-[minmax(0,1fr)_44px_72px_80px] gap-2 border-b-2 pb-2 text-left text-[12px] font-extrabold uppercase tracking-wide text-foreground"
        style={{ borderColor: primary }}
      >
        <span>{labels.description}</span>
        <span className="text-center">{labels.qty}</span>
        <span className="text-right">{labels.unitPrice}</span>
        <span className="text-right">{labels.total}</span>
      </div>

      {items.map((item) => (
        <div
          key={item.key}
          className="grid grid-cols-[minmax(0,1fr)_44px_72px_80px] gap-2 border-b py-2.5 text-left text-[12px] text-foreground"
          style={{ borderColor: withAlpha(accent, 0.33) }}
        >
          <span className="flex min-w-0 items-start gap-1.5">
            <Icon
              name="sparkles"
              className="mt-0.5 h-3 w-3 shrink-0"
              style={{ color: accent }}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block truncate uppercase">{item.name}</span>
              <ItemMeta item={item} className="normal-case" />
            </span>
          </span>
          <span className="text-center tabular-nums">{item.quantity}</span>
          <span className="text-right tabular-nums">{item.unitPrice}</span>
          <span className="text-right font-bold tabular-nums">{item.amount}</span>
        </div>
      ))}

      <div className="mt-4 flex justify-end">
        <div className="w-full max-w-[240px] text-left">
          <TotalsRows
            labels={labels}
            subtotal={totals.subtotal}
            discountLabel={model.discountLabel}
            discountAmount={totals.discountAmount}
            taxLabel={model.taxLabel}
            taxAmount={totals.taxAmount}
            money={money}
            className="text-[12px] font-semibold uppercase text-foreground"
          />
          <div
            className="mt-1.5 flex items-center justify-between text-[15px] font-black uppercase"
            style={{ color: primary }}
          >
            <span>{labels.amountDue}</span>
            <span className="tabular-nums">{money(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Bank details spans the sheet in two columns rather than stacking in
          one half of a split row, which left the right half of the page empty. */}
      <AccountBlock
        labels={labels}
        account={model.account}
        columns={2}
        className="mt-8 text-left"
        labelClassName={headLabel}
        labelStyle={headStyle}
      />

      <NotesBlock notes={model.notes} lut={model.lut} className="mt-6 text-left" />

      <SignatureBlock url={model.signatureUrl} className="mt-6" />
    </div>
  );
}
