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

/** Uppercase, bold, tracked — this theme's voice for a section label. */
const LABEL = "mb-2 text-[11px] font-bold uppercase tracking-wide text-foreground";

/**
 * Minimal Mono.
 *
 * Ported from Nova. Heavy rules, uppercase labels, a round logo mark. The
 * bank block reads the selected receiving account rather than Nova's
 * free-typed details, and every field the merchant filled is printed via the
 * shared parts.
 */
export function MinimalMonoLayout({ model, onLogoClick }: LayoutProps) {
  const { labels, totals, money, items, primary } = model;

  return (
    <div className={`flex min-h-full w-full min-w-0 flex-col bg-card ${PAGE_PADDING}`}>
      <div className="mb-9 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <LogoSlot
            url={model.logoUrl}
            onUpload={onLogoClick}
            size={44}
            shape="circle"
            tint={primary}
          />
          <span className="min-w-0 leading-tight">
            {/* Wordmark only. GSTIN lives in the Issued-by block below, which is
                the statutory statement of who raised this invoice; printing it
                twice on one page was redundant. */}
            <span className="block truncate text-[15px] font-extrabold uppercase tracking-wide text-foreground">
              {model.billerName}
            </span>
          </span>
        </div>
        <span className="shrink-0 text-[30px] font-extrabold uppercase tracking-tight text-foreground">
          {labels.invoice}
        </span>
      </div>

      <div className="mb-7 rounded-xl bg-muted/50 p-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="min-w-0 space-y-5">
            <PartyBlock
              label={`${labels.billedTo}:`}
              name={model.clientName}
              secondary={model.clientSecondary}
              lines={model.clientLines}
              labelClassName={LABEL}
              bodyClassName="text-[12.5px] text-muted-foreground"
            />
            <PartyBlock
              label={`${labels.issuedBy}:`}
              name={model.billerName}
              lines={model.billerLines}
              gstIn={model.billerGstIn}
              labelClassName={LABEL}
              bodyClassName="text-[12.5px] text-muted-foreground"
            />
          </div>

          <div className="min-w-0">
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">
                {labels.invoiceNumber}:{" "}
                <span className="font-extrabold">{model.invoiceNumber}</span>
              </p>
              <p className="mt-1.5 text-[12.5px] text-muted-foreground">
                {labels.issueDate}:{" "}
                <span className="font-medium text-foreground">{model.issueDate}</span>
              </p>
              <p className="text-[12.5px] text-muted-foreground">
                {labels.dueDate}:{" "}
                <span className="font-medium text-foreground">{model.dueDate || "-"}</span>
              </p>
            </div>

            <AccountBlock
              labels={labels}
              account={model.account}
              columns={1}
              className="mt-5 text-right"
              labelClassName={LABEL}
            />
          </div>
        </div>
      </div>

      <MemoLine memo={model.memo} className="mb-4" />

      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_72px_48px_80px] gap-2 border-b-2 border-foreground pb-2 text-[11px] font-bold uppercase tracking-wide text-foreground">
        <span>{labels.description}</span>
        <span className="text-right">{labels.unitPrice}</span>
        <span className="text-center">{labels.qty}</span>
        <span className="text-right">{labels.total}</span>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div
            key={item.key}
            className="grid grid-cols-[minmax(0,1fr)_72px_48px_80px] gap-2 py-3 text-[13px]"
          >
            <span className="min-w-0">
              <span className="block truncate text-foreground">{item.name}</span>
              <ItemMeta item={item} />
            </span>
            <span className="text-right tabular-nums text-muted-foreground">{item.unitPrice}</span>
            <span className="text-center tabular-nums text-muted-foreground">{item.quantity}</span>
            <span className="text-right font-medium tabular-nums text-foreground">
              {item.amount}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex justify-end border-t border-foreground pt-3">
        <div className="w-full max-w-[240px]">
          <TotalsRows
            labels={labels}
            subtotal={totals.subtotal}
            discountLabel={model.discountLabel}
            discountAmount={totals.discountAmount}
            taxLabel={model.taxLabel}
            taxAmount={totals.taxAmount}
            money={money}
            rowClassName="uppercase tracking-wide"
          />
          <div
            className="mt-1.5 flex items-center justify-between gap-6 text-[16px] font-extrabold uppercase"
            style={{ color: primary }}
          >
            <span>{labels.amountDue}</span>
            <span className="tabular-nums">{money(totals.total)}</span>
          </div>
        </div>
      </div>

      {/* Notes across the full width, then the sign-off on the left.
          Previously both shared a justify-between row, so with no notes the
          sign-off collapsed to the left edge while its own text stayed
          right-aligned — reading as neither one side nor the other. */}
      <NotesBlock notes={model.notes} lut={model.lut} className="mt-8" />

      <div className="mt-8">
        <p className="text-[12px] font-bold uppercase tracking-wide text-foreground">
          {labels.thankYou}
        </p>
        <SignatureBlock url={model.signatureUrl} align="left" className="mt-1" />
      </div>
    </div>
  );
}
