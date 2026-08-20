"use client";

import { LogoSlot } from "@/features/dashboard/create-invoice/components/preview/LogoSlot";
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
    <div className="flex h-full flex-col bg-card px-10 py-10">
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
            <span className="block truncate text-[15px] font-extrabold uppercase tracking-wide text-foreground">
              {model.billerName}
            </span>
            {model.billerGstIn && (
              <span className="block text-[11px] text-muted-foreground">
                GSTIN {model.billerGstIn}
              </span>
            )}
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
            <AccountBlock
              labels={labels}
              account={model.account}
              columns={1}
              labelClassName={LABEL}
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

            <PartyBlock
              label={`${labels.issuedBy}:`}
              name={model.billerName}
              lines={model.billerLines}
              className="mt-5 text-right"
              labelClassName={LABEL}
              bodyClassName="text-[12.5px] text-muted-foreground"
            />
          </div>
        </div>
      </div>

      <div className="mb-2 grid grid-cols-[1fr_72px_48px_80px] gap-2 border-b-2 border-foreground pb-2 text-[11px] font-bold uppercase tracking-wide text-foreground">
        <span>{labels.description}</span>
        <span className="text-right">{labels.unitPrice}</span>
        <span className="text-center">{labels.qty}</span>
        <span className="text-right">{labels.total}</span>
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div key={item.key} className="grid grid-cols-[1fr_72px_48px_80px] gap-2 py-3 text-[13px]">
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

      <MemoLine memo={model.memo} className="mt-4" />

      <div className="mt-8 flex items-end justify-between gap-6">
        <NotesBlock notes={model.notes} lut={model.lut} className="max-w-[60%]" />
        <div className="shrink-0 text-right">
          <p className="text-[12px] font-bold uppercase tracking-wide text-foreground">
            {labels.thankYou}
          </p>
          <SignatureBlock url={model.signatureUrl} className="mt-1" />
        </div>
      </div>
    </div>
  );
}
