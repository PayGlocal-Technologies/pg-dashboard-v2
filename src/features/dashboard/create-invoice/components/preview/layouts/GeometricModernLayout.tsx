"use client";

import { Icon } from "@/components/icon";
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
 * Geometric Modern.
 *
 * Pill-shaped chips, an oversized amount, asterisks as section marks. Ported
 * from Nova, with one correction: Nova's headline reads "Invoice to ₹43,000",
 * which presses its `invoiceTo` label into service as a preposition and reads as
 * broken English (and worse once translated). This states the amount due under
 * its own label instead.
 */
export function GeometricModernLayout({ model, onLogoClick }: LayoutProps) {
  const { labels, totals, money, items, primary, accent } = model;

  const brandLabel = "mb-1 font-semibold normal-case tracking-normal";

  return (
    <div className="flex h-full flex-col bg-card px-10 py-9">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span
            className="inline-block rounded-full border px-3 py-1 text-[10.5px] font-medium text-foreground"
            style={{ borderColor: withAlpha(primary, 0.33) }}
          >
            {labels.invoiceNumber} {model.invoiceNumber}
          </span>

          {model.hasClient && (
            <div className="mt-3">
              <span
                className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-3 py-1 text-[11px] font-semibold text-foreground"
                style={{ backgroundColor: withAlpha(accent, 0.33) }}
              >
                {model.clientName}
              </span>
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            <LogoSlot url={model.logoUrl} onUpload={onLogoClick} size={32} tint={primary} />
            <span className="truncate text-[11px] text-muted-foreground">{model.billerName}</span>
          </div>
        </div>

        <span
          className="shrink-0 text-[38px] font-black uppercase tracking-tight"
          style={{ color: primary }}
        >
          {labels.invoice}
        </span>
      </div>

      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {labels.amountDue}
        </p>
        <p className="text-[26px] font-extrabold" style={{ color: primary }}>
          {money(totals.total)} {model.currency}
        </p>
        <MemoLine memo={model.memo} className="mt-1" />
      </div>

      <div className="mb-6 flex flex-wrap items-start gap-8 text-[11.5px]">
        <div>
          <p className="font-semibold text-foreground">{labels.issueDate}</p>
          <p className="text-muted-foreground">{model.issueDate}</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">{labels.dueDate}</p>
          <p className="text-muted-foreground">{model.dueDate || "-"}</p>
        </div>
        <PartyBlock
          label={labels.issuedBy}
          name={model.billerName}
          lines={model.billerLines}
          gstIn={model.billerGstIn}
          labelClassName={brandLabel}
          bodyClassName="text-[11px]"
        />
        <PartyBlock
          label={labels.billedTo}
          name={model.clientName}
          secondary={model.clientSecondary}
          lines={model.clientLines}
          labelClassName={brandLabel}
          bodyClassName="text-[11px]"
        />
      </div>

      <div
        className="mb-2 grid grid-cols-[1fr_36px_64px_80px] gap-2 border-b pb-2 text-[11px] font-semibold"
        style={{ borderColor: withAlpha(primary, 0.2), color: primary }}
      >
        <span>{labels.description}</span>
        <span className="text-center">{labels.qty}</span>
        <span className="text-right">{labels.unitPrice}</span>
        <span className="text-right">{labels.total}</span>
      </div>

      <div className="divide-y divide-border">
        {items.map((item) => (
          <div
            key={item.key}
            className="grid grid-cols-[1fr_36px_64px_80px] gap-2 py-2.5 text-[12px]"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium text-foreground">{item.name}</span>
              <ItemMeta item={item} />
            </span>
            <span className="text-center tabular-nums text-muted-foreground">{item.quantity}</span>
            <span className="text-right tabular-nums text-muted-foreground">{item.unitPrice}</span>
            <span className="text-right font-medium tabular-nums text-foreground">
              {item.amount}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5">
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

        <div className="mt-2 flex items-center gap-3">
          <Icon
            name="asterisk"
            className="h-5 w-5 shrink-0"
            style={{ color: accent }}
            aria-hidden
          />
          <span className="text-[12px] font-semibold text-foreground">{labels.amountDue}</span>
          <span
            className="ml-auto rounded-full px-4 py-1.5 text-[13px] font-bold tabular-nums text-foreground"
            style={{ backgroundColor: withAlpha(accent, 0.4) }}
          >
            {money(totals.total)}
          </span>
        </div>
      </div>

      <div
        className="mt-8 flex items-start justify-between gap-6 border-t pt-4"
        style={{ borderColor: withAlpha(primary, 0.2) }}
      >
        <NotesBlock notes={model.notes} lut={model.lut} className="min-w-0" />
        <AccountBlock
          labels={labels}
          account={model.account}
          columns={1}
          className="shrink-0 text-right"
          labelClassName={brandLabel}
        />
      </div>

      <SignatureBlock url={model.signatureUrl} className="mt-6" />
    </div>
  );
}
