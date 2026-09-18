"use client";

import type { CSSProperties, ReactNode } from "react";
import { AppImage as Image } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";
import type { BankAccountRow } from "@/features/dashboard/create-invoice/hooks";
import type { InvoiceLabels } from "@/features/dashboard/create-invoice/labels";
import type { PreviewItem } from "@/features/dashboard/create-invoice/components/preview/previewModel";

/**
 * The parts every layout must print, in one place.
 *
 * Six themes were each hand-writing their own version of "the fine print", and
 * five of them quietly dropped fields the merchant had filled in: signature,
 * memo, LUT, GSTIN, the biller's address, HSN/SAC codes, per-line GST. Switching
 * theme silently deleted content from the document.
 *
 * These components exist so that cannot recur. A layout decides *where* the
 * blocks go and how they are tinted; it does not decide *whether* a field
 * appears. Add a field to the model, add it here, and all six themes carry it.
 *
 * Every part takes className / labelClassName / labelStyle so a theme can keep
 * its own voice — uppercase and bold in Minimal Mono, brand-coloured in Bold
 * Sidebar — without owning the content.
 */

/**
 * The sheet's margin, shared by every theme.
 *
 * One value rather than six hand-picked ones (p-10, px-10 py-9, px-9 py-9 …), so
 * the document's inset is the same whichever theme is selected and matches what
 * the server's renderer will use. Playful Border is the single exception, and
 * only because its 10px frame is drawn inside this margin.
 */
export const PAGE_PADDING = "p-10";

/**
 * Applied to every field a merchant can type into.
 *
 * `overflow-wrap: anywhere` is the load-bearing half. A pasted IBAN, a URL in the
 * notes or a German compound in a memo is one unbreakable word, and one such word
 * wider than its column pushes the whole sheet sideways — which is how adding a
 * memo could shove "Authorised signatory" off the right edge of the paper. This
 * breaks mid-word as a last resort instead, so text can never set the page width.
 */
const WRAPS = "[overflow-wrap:anywhere] break-words";

type Tone = {
  className?: string;
  labelClassName?: string;
  labelStyle?: CSSProperties;
  bodyClassName?: string;
};

/** A section eyebrow, shared so every block's label lines up tonally. */
function PartLabel({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <p
      className={cn("mb-1 text-[11px] uppercase tracking-wide text-muted-foreground", className)}
      style={style}
    >
      {children}
    </p>
  );
}

/**
 * One party: who is billing, or who is being billed.
 *
 * Name, the contact under a business name, every address line, and GSTIN. The
 * biller's GSTIN in particular is a statutory field on an Indian invoice, and
 * four of the six themes were leaving it off.
 */
export function PartyBlock({
  label,
  name,
  secondary,
  lines,
  gstIn,
  className,
  labelClassName,
  labelStyle,
  bodyClassName,
}: Tone & {
  label: string;
  name: string;
  secondary?: string;
  lines: string[];
  gstIn?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <PartLabel className={labelClassName} style={labelStyle}>
        {label}
      </PartLabel>
      <p className={cn("text-[13px] font-semibold text-foreground", WRAPS)}>{name}</p>
      {secondary && (
        <p className={cn("text-[12px] text-muted-foreground/80", WRAPS, bodyClassName)}>
          {secondary}
        </p>
      )}
      {lines.map((line, index) => (
        <p
          key={`${line}-${index}`}
          className={cn("text-[12px] leading-snug text-muted-foreground/80", WRAPS, bodyClassName)}
        >
          {line}
        </p>
      ))}
      {gstIn && (
        <p className={cn("mt-0.5 text-[12px] text-muted-foreground/80", WRAPS, bodyClassName)}>
          GSTIN {gstIn}
        </p>
      )}
    </div>
  );
}

/**
 * The HSN/SAC code and GST rate that sit under a line item's name.
 *
 * Both are tax-compliance data the merchant typed in deliberately, so no theme
 * gets to drop them. Rendered as plain text rather than chips, which suits a
 * document better than the editor's pills.
 */
export function ItemMeta({ item, className }: { item: PreviewItem; className?: string }) {
  if (!item.codeLabel && !item.gstLabel) return null;

  return (
    <span className={cn("block truncate text-[10.5px] text-muted-foreground", className)}>
      {[item.codeLabel, item.gstLabel && `GST ${item.gstLabel}`].filter(Boolean).join(" · ")}
    </span>
  );
}

/**
 * Subtotal, discount and invoice-level tax.
 *
 * Not the grand total: that is the one number each theme is entitled to style
 * distinctively, so the layouts render it themselves. Discount and tax rows
 * appear only when they carry a value, exactly as in the editor's footer.
 */
export function TotalsRows({
  labels,
  subtotal,
  discountLabel,
  discountAmount,
  taxLabel,
  taxAmount,
  money,
  className,
  rowClassName,
}: {
  labels: InvoiceLabels;
  subtotal: string;
  discountLabel: string;
  discountAmount: string;
  taxLabel: string;
  taxAmount: string;
  money: (amount: string | number) => string;
  className?: string;
  rowClassName?: string;
}) {
  const row = (label: string, value: string) => (
    <div className={cn("flex items-center justify-between gap-4", rowClassName)}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );

  return (
    <div className={cn("space-y-1.5 text-[12.5px] text-muted-foreground", className)}>
      {row(labels.subtotal, money(subtotal))}
      {Number(discountAmount) > 0 && row(discountLabel, `-${money(discountAmount)}`)}
      {Number(taxAmount) > 0 && row(taxLabel, money(taxAmount))}
    </div>
  );
}

/**
 * Where the money goes: all four fields of the selected receiving account.
 *
 * Three themes were printing only the bank name and account number, which is
 * not enough for an international transfer — the holder's name and the
 * IFSC/routing code are what a payer's bank actually asks for.
 */
export function AccountBlock({
  labels,
  account,
  columns = 2,
  className,
  labelClassName,
  labelStyle,
}: Tone & {
  labels: InvoiceLabels;
  account: BankAccountRow | undefined;
  /** 2 for a grid, 1 to stack in a narrow column. */
  columns?: 1 | 2;
}) {
  if (!account) return null;

  const fields = [
    { label: labels.accountHolder, value: account.accountHolderName, mono: false },
    { label: labels.accountNumber, value: account.accountNumber, mono: true },
    { label: labels.bankName, value: account.bankName, mono: false },
    { label: labels.ifscOrRouting, value: account.routing, mono: true },
  ];

  return (
    <div className={cn("min-w-0", className)}>
      <PartLabel className={labelClassName} style={labelStyle}>
        {labels.bankDetails}
      </PartLabel>
      <div
        className={cn(
          "gap-x-6 gap-y-2 text-[12px]",
          columns === 2 ? "grid grid-cols-2" : "space-y-2"
        )}
      >
        {fields.map((field) => (
          <div key={field.label} className="min-w-0">
            <p className="text-muted-foreground">{field.label}</p>
            <p
              className={cn(
                "font-medium text-foreground",
                field.mono ? "break-all font-mono" : WRAPS
              )}
            >
              {field.value || "-"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The memo, which sits with the amount rather than in the footer. */
export function MemoLine({ memo, className }: { memo: string; className?: string }) {
  if (!memo) return null;
  return (
    <p className={cn("whitespace-pre-line text-[12px] text-muted-foreground/80", WRAPS, className)}>
      {memo}
    </p>
  );
}

/**
 * Notes and LUT.
 *
 * Deliberately unheaded. This used to be printed under a "Terms & conditions"
 * heading in two themes, with invented filler ("Please pay within the agreed
 * terms of this invoice") when the merchant had written nothing — text nobody
 * had agreed to, on a document sent to a customer. Whatever the merchant typed
 * is printed, and nothing is printed when they typed nothing.
 */
export function NotesBlock({
  notes,
  lut,
  className,
  textClassName,
}: {
  notes: string;
  lut: string;
  className?: string;
  textClassName?: string;
}) {
  if (!notes && !lut) return null;

  return (
    <div className={cn("min-w-0", className)}>
      {notes && (
        <p
          className={cn(
            "whitespace-pre-line text-[11px] leading-snug text-muted-foreground/80",
            WRAPS,
            textClassName
          )}
        >
          {notes}
        </p>
      )}
      {lut && (
        <p className={cn("mt-1.5 text-[11px] text-muted-foreground/80", WRAPS, textClassName)}>
          LUT: {lut}
        </p>
      )}
    </div>
  );
}

/**
 * The authorised signature image, plus its caption.
 *
 * `align` exists because a signature is not always in the bottom-right corner:
 * Minimal Mono signs off under its "thank you", on the left. Without it the
 * caption was right-aligned inside a left-positioned box, which read as neither.
 */
export function SignatureBlock({
  url,
  align = "right",
  className,
  captionClassName,
}: {
  url: string;
  align?: "left" | "right";
  className?: string;
  captionClassName?: string;
}) {
  if (!url) return null;

  return (
    <div className={cn("flex flex-col", align === "left" ? "items-start" : "items-end", className)}>
      <Image
        src={url}
        alt="Authorised signature"
        width={140}
        height={56}
        unoptimized
        className="h-14 w-auto object-contain"
      />
      <p className={cn("mt-1 text-[11px] text-muted-foreground/80", captionClassName)}>
        Authorised signatory
      </p>
    </div>
  );
}
