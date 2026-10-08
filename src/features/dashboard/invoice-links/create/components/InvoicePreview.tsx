"use client";

import { Icon } from "@/components/icon";
import { AppImage } from "@/components/common/AppImage";
import { LOGO_ACCEPT_ATTR } from "@/features/dashboard/invoice-links/create/constants";
import {
  getAmount,
  getDiscountAmount,
  getSubTotalAmount,
  getTotalAmount,
} from "@/features/dashboard/invoice-links/create/helpers";
import type {
  AddressValues,
  InvoiceFormValues,
  InvoiceLineItem,
} from "@/features/dashboard/invoice-links/create/types";

/** Upstream's buildFormattedAddress: non-empty parts, in this order, comma-joined. */
function formatAddress(address: AddressValues): string {
  return [
    address.streetAddress,
    address.landmark,
    address.city,
    address.state,
    address.zipcode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function Money({ symbol, amount }: { symbol: string; amount: string }) {
  return (
    <span className="tabular-nums">
      {symbol} {amount}
    </span>
  );
}

/**
 * The live invoice document, beside the form.
 *
 * This is pg-dashboard's "Customer Preview" pane (components/invoicePdf/) —
 * header letterhead, customer block, the items table and the note — rebuilt
 * from the same watched values, so every keystroke in the form shows up here
 * the way it does in production.
 *
 * It is not decoration: it is the only place the merchant sees what the
 * customer will receive before issuing it, which is why the form occupies just
 * half the screen upstream.
 *
 * The logo slot is a live uploader — see useInvoiceLogo for the two legs and
 * for the source defect that is deliberately not reproduced.
 */
export function InvoicePreview({
  values,
  items,
  merchantName,
  currencySymbol,
  todayLabel,
  logoUrl,
  isLogoUploading,
  onLogoSelected,
}: {
  values: InvoiceFormValues;
  items: InvoiceLineItem[];
  merchantName: string;
  currencySymbol: string;
  todayLabel: string;
  /** Stored logo, or the local preview once one has been uploaded. */
  logoUrl: string | null;
  isLogoUploading: boolean;
  onLogoSelected: (file: File) => void | Promise<void>;
}) {
  const subTotal = getSubTotalAmount(items).toFixed(2);
  const discountAmount = getDiscountAmount(subTotal, values.discount || "0", values.discountType);
  const total = getTotalAmount(items, values.discount || "0", values.discountType);

  // Upstream only shows the discount line once both the amount and the type
  // are set.
  const showDiscount = !!values.discount && !!values.discountType;

  const billTo = formatAddress(values.billing);
  const shipTo = values.shippingSameAsBilling ? billTo : formatAddress(values.shipping);

  const dueDateLabel = values.dueDate
    ? new Date(values.dueDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* ── Letterhead ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 bg-primary/5 p-6 sm:grid-cols-2">
        <div className="space-y-3">
          {/* PNG or JPG, under 100MB — enforced in useInvoiceLogo before
              anything is requested. `accept` and the validator read the same
              constant, so the picker can never offer a type the upload then
              rejects. */}
          <input
            id="invoice-logo-upload"
            type="file"
            accept={LOGO_ACCEPT_ATTR}
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Cleared so re-picking the same file fires change again.
              e.target.value = "";
              if (file) void onLogoSelected(file);
            }}
          />
          {/* Bare <button> per CLAUDE.md's exemption: this is an image drop
              target that must render the logo at full bleed, which <Button>'s
              padding and variant styling actively fight. */}
          <button
            type="button"
            aria-label={logoUrl ? "Replace logo" : "Add logo"}
            disabled={isLogoUploading}
            onClick={() => document.getElementById("invoice-logo-upload")?.click()}
            className="group relative flex h-24 w-36 items-center justify-center overflow-hidden rounded-md border border-dashed border-primary/40 text-primary transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
          >
            {isLogoUploading ? (
              <span className="text-[12px]">Uploading…</span>
            ) : logoUrl ? (
              <>
                <AppImage
                  src={logoUrl}
                  alt="Invoice logo"
                  width={144}
                  height={96}
                  unoptimized
                  className="h-full w-full object-contain"
                />
                <span className="absolute inset-0 hidden items-center justify-center bg-background/80 text-[12px] font-medium group-hover:flex">
                  Replace
                </span>
              </>
            ) : (
              <span className="text-center">
                <Icon name="plus" className="mx-auto h-4 w-4" />
                <span className="mt-1 block text-[12px]">Add Logo</span>
              </span>
            )}
          </button>
          <p className="text-[15px] font-semibold text-foreground">{merchantName}</p>
        </div>

        <div className="space-y-5">
          <h3 className="text-xl font-semibold text-foreground">Invoice</h3>

          <div className="flex flex-wrap justify-between gap-5">
            <div>
              <p className="text-[13px] text-foreground">Invoice Number:</p>
              {values.invoiceNo ? (
                <p className="text-[13px] text-muted-foreground">#{values.invoiceNo}</p>
              ) : null}
            </div>
            <div>
              <p className="text-[13px] text-foreground">Due Date:</p>
              {/* Upstream renders the due date in its critical colour. */}
              <p className="text-[13px] text-destructive">{dueDateLabel}</p>
            </div>
          </div>

          <div>
            <p className="text-[13px] text-foreground">Invoice Issue Date:</p>
            <p className="text-[13px] text-muted-foreground">{todayLabel}</p>
          </div>
        </div>
      </div>

      {/* ── Customer ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
        <div>
          <p className="text-[13px] text-foreground">{values.fullName}</p>
          {values.phoneNumber ? (
            <p className="text-[13px] text-muted-foreground">
              {values.callingCode} {values.phoneNumber}
            </p>
          ) : null}
          <p className="text-[13px] text-muted-foreground">{values.emailId}</p>
        </div>
        {values.memo ? (
          <div>
            <p className="text-[13px] text-foreground">Memo</p>
            <p className="text-[13px] text-muted-foreground">{values.memo}</p>
          </div>
        ) : null}
        {billTo ? (
          <div>
            <p className="text-[13px] text-foreground">Bill to:</p>
            <p className="text-[13px] text-muted-foreground">{billTo}</p>
          </div>
        ) : null}
        {shipTo ? (
          <div>
            <p className="text-[13px] text-foreground">Ship to:</p>
            <p className="text-[13px] text-muted-foreground">{shipTo}</p>
          </div>
        ) : null}
      </div>

      {/* ── Items ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_52px_52px_52px_88px] gap-2 bg-primary/5 px-6 py-2.5 text-[11px] font-semibold text-foreground">
        <span>DESCRIPTION &amp; ITEM CODE</span>
        <span>PPU</span>
        <span>QTY</span>
        <span>TAX</span>
        <span className="text-right">AMOUNT</span>
      </div>

      {items.map((item) => (
        <div
          key={item.key}
          className="grid grid-cols-[1fr_52px_52px_52px_88px] gap-2 px-6 py-2.5 text-[13px] text-muted-foreground"
        >
          <div className="flex flex-col">
            <span>{item.description}</span>
            {item.itemCode ? <span>#{item.itemCode}</span> : null}
          </div>
          <span>{item.ppu || "0"}</span>
          <span>{item.qty || "0"}</span>
          <span>{item.tax || "0"}</span>
          <span className="text-right text-foreground">
            <Money
              symbol={currencySymbol}
              amount={getAmount(item.ppu || "0", item.qty || "0", item.tax || "0").toFixed(2)}
            />
          </span>
        </div>
      ))}

      {/* ── Totals ───────────────────────────────────────────────────────── */}
      <div className="px-6 pb-6">
        <div className="ml-auto w-full max-w-xs space-y-2 border-t border-foreground/60 pt-3 text-[13px]">
          <div className="flex justify-between">
            <span className="text-foreground">Subtotal Amount</span>
            <span className="text-foreground">
              <Money symbol={currencySymbol} amount={subTotal} />
            </span>
          </div>

          {showDiscount ? (
            <div className="flex justify-between">
              <span className="text-foreground">Discount</span>
              <span className="text-foreground">
                <Money symbol={currencySymbol} amount={discountAmount} />
              </span>
            </div>
          ) : null}

          <div className="flex justify-between">
            <span className="text-foreground">Total Amount</span>
            <span className="text-foreground">
              <Money symbol={currencySymbol} amount={total} />
            </span>
          </div>

          <div className="flex justify-between border-t border-foreground/60 pt-2 font-semibold">
            <span className="text-foreground">Amount Due</span>
            <span className="text-foreground">
              <Money symbol={currencySymbol} amount={total} />
            </span>
          </div>
        </div>
      </div>

      {/* ── Note ─────────────────────────────────────────────────────────── */}
      {values.merchantNote ? (
        <div className="px-6 pb-6 text-[13px]">
          <span className="font-semibold text-foreground">Note: </span>
          <span className="text-muted-foreground">{values.merchantNote}</span>
        </div>
      ) : null}
    </div>
  );
}
