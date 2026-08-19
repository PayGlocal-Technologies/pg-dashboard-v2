"use client";

import Image from "next/image";
import { formatDate } from "@/lib/utils/format";
import { getAmount, getInvoiceTotals } from "@/features/dashboard/create-invoice/helpers";
import type { BankAccountRow } from "@/features/dashboard/create-invoice/hooks";
import type {
  Address,
  BillerDetails,
  ClientData,
  InvoiceFormState,
} from "@/features/dashboard/create-invoice/types";

export interface PreviewSource {
  form: InvoiceFormState;
  biller: BillerDetails | undefined;
  client: ClientData | undefined;
  account: BankAccountRow | undefined;
  logoUrl: string | undefined;
  signatureUrl: string | undefined;
  symbol: string;
}

function formatMoney(symbol: string, amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `${symbol}${(Number.isFinite(value) ? value : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function addressLines(address: Address | BillerDetails | undefined): string[] {
  if (!address) return [];
  const cityLine = [address.city, address.state, address.zipcode].filter(Boolean).join(", ");
  return [address.streetAddress1, address.streetAddress2, cityLine, address.country].filter(
    (line): line is string => !!line
  );
}

function longDate(value: string): string {
  return value ? formatDate(value, { day: "2-digit", month: "long", year: "numeric" }) : "-";
}

/**
 * The invoice document, as the merchant will see it.
 *
 * One layout, matching the single template the server's generate-invoice
 * renders. Nova ships six and lets the merchant pick; until the renderer knows
 * about them, offering a choice here would mean previewing a document that
 * cannot be produced.
 *
 * This is a preview only — never the artifact. The PDF that is stored and
 * emailed is the server's, so nothing here rasterizes or downloads.
 */
export function InvoiceDocumentPreview({ source }: { source: PreviewSource }) {
  const { form, biller, client, account, logoUrl, signatureUrl, symbol } = source;
  const { subtotal, discountAmount, taxAmount, total } = getInvoiceTotals(form);

  const billerLines = addressLines(biller);
  const clientLines = addressLines(client?.address);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
      {/* A4 proportions (210:297) so a near-empty draft still reads as a sheet
          of paper rather than a short card that grows as items are added. This
          is a floor, not a cap: overflow stays visible here, so a document
          longer than one page pushes the box past the ratio instead of
          clipping. The rounding and clipping live on the parent. */}
      <div className="aspect-[210/297] bg-card p-10">
        {/* No placeholder when there is no logo. Nova shows a dashed box here,
            but Nova's is the click target for uploading one; this preview has no
            such affordance, so the box would only promise a frame the generated
            PDF will not contain. */}
        <div className="mb-5 flex items-center gap-4">
          {form.logoEnabled && logoUrl && (
            <Image
              src={logoUrl}
              alt="Business logo"
              width={64}
              height={64}
              unoptimized
              className="h-16 w-16 shrink-0 rounded-xl border border-border object-contain"
            />
          )}
          <span className="text-[22px] font-bold tracking-tight text-foreground">Invoice</span>
        </div>

        <div className="mb-7 flex flex-wrap items-start gap-8 text-[12px]">
          <div>
            <p className="text-muted-foreground">Invoice no.</p>
            <p className="font-semibold text-foreground">{form.invoiceNumber || "-"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Issue date</p>
            <p className="font-semibold text-foreground">{longDate(form.invoiceDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Due date</p>
            <p className="font-semibold text-foreground">{longDate(form.dueDate)}</p>
          </div>
        </div>

        <div className="mb-7 grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Issued by
            </p>
            <p className="text-[13.5px] font-semibold text-foreground">
              {biller?.legalName || "-"}
            </p>
            {billerLines.map((line, i) => (
              <p key={`${line}-${i}`} className="text-[12px] leading-snug text-muted-foreground/70">
                {line}
              </p>
            ))}
            {biller?.gstIn && (
              <p className="mt-1 text-[12px] text-muted-foreground/70">GSTIN {biller.gstIn}</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
              Billed to
            </p>
            <p className="text-[13.5px] font-semibold text-foreground">
              {client?.businessName || client?.name || "-"}
            </p>
            {client?.businessName && client?.name && (
              <p className="text-[12px] text-muted-foreground/70">{client.name}</p>
            )}
            {clientLines.map((line, i) => (
              <p key={`${line}-${i}`} className="text-[12px] leading-snug text-muted-foreground/70">
                {line}
              </p>
            ))}
          </div>
        </div>

        <p className="text-[18px] font-bold tracking-tight text-foreground">
          {formatMoney(symbol, total)} {form.currency}
          {form.dueDate && ` due by ${longDate(form.dueDate)}`}
        </p>
        {form.memo && (
          <p className="mt-1 whitespace-pre-line text-[12px] text-muted-foreground/70">
            {form.memo}
          </p>
        )}

        <div className="mt-4 overflow-hidden border border-border">
          <div className="grid grid-cols-[1fr_48px_80px_44px_84px] gap-2 border-b border-border bg-muted/30 px-3 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>Description</span>
            <span className="text-center">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">GST</span>
            <span className="text-right">Total</span>
          </div>

          <div className="divide-y divide-border">
            {form.lineItems.length === 0 ? (
              <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                No items yet.
              </p>
            ) : (
              form.lineItems.map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[1fr_48px_80px_44px_84px] gap-2 px-3 py-2.5 text-[12px]"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">
                      {item.description || "Untitled item"}
                    </span>
                    {item.hsn && (
                      <span className="block text-[10.5px] text-muted-foreground">
                        {item.type === "SERVICE" ? "SAC" : "HSN"} {item.hsn}
                      </span>
                    )}
                  </span>
                  <span className="text-center tabular-nums text-muted-foreground">
                    {item.quantity || "-"}
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {item.unitPrice || "-"}
                  </span>
                  <span className="text-right tabular-nums text-muted-foreground">
                    {item.gstRate ? `${item.gstRate}%` : "-"}
                  </span>
                  <span className="text-right font-medium tabular-nums text-foreground">
                    {formatMoney(
                      symbol,
                      getAmount(item.unitPrice || "0", item.quantity || "0", item.gstRate || "0")
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-2 flex justify-end">
          <div className="w-full max-w-[220px] space-y-1.5 text-[12.5px]">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatMoney(symbol, subtotal)}</span>
            </div>
            {Number(discountAmount) > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{form.discountName || "Discount"}</span>
                <span className="tabular-nums">-{formatMoney(symbol, discountAmount)}</span>
              </div>
            )}
            {Number(taxAmount) > 0 && (
              <div className="flex items-center justify-between text-muted-foreground">
                <span>{form.taxName || "Tax"}</span>
                <span className="tabular-nums">{formatMoney(symbol, taxAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-2 text-[16px] font-bold text-foreground">
              <span>Amount due</span>
              <span className="tabular-nums">{formatMoney(symbol, total)}</span>
            </div>
          </div>
        </div>

        {account && (
          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Bank details
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-[12px]">
              <div>
                <p className="text-muted-foreground">Account holder</p>
                <p className="break-words font-medium text-foreground">
                  {account.accountHolderName || "-"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Account no.</p>
                <p className="break-all font-mono font-medium text-foreground">
                  {account.accountNumber}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Bank</p>
                <p className="break-words font-medium text-foreground">{account.bankName || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">IFSC / Routing</p>
                <p className="break-all font-mono font-medium text-foreground">
                  {account.routing || "-"}
                </p>
              </div>
            </div>
          </div>
        )}

        {(form.notes || form.lut) && (
          <div className="mt-6 border-t border-border pt-4">
            {form.notes && (
              <p className="whitespace-pre-line text-[11px] text-muted-foreground/80">
                {form.notes}
              </p>
            )}
            {form.lut && (
              <p className="mt-2 text-[11px] text-muted-foreground/80">LUT: {form.lut}</p>
            )}
          </div>
        )}

        {form.signatureEnabled && signatureUrl && (
          <div className="mt-6 flex flex-col items-end">
            <Image
              src={signatureUrl}
              alt="Authorised signature"
              width={140}
              height={56}
              unoptimized
              className="h-14 w-auto object-contain"
            />
            <p className="mt-1 text-[11px] text-muted-foreground/80">Authorised signatory</p>
          </div>
        )}
      </div>
    </div>
  );
}
