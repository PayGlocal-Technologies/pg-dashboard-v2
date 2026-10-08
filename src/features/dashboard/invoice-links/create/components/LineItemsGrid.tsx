"use client";

import {
  Button,
  Field,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { EditorSection } from "@/features/dashboard/invoice-links/create/components/EditorSection";
import { DISCOUNT_TYPE_OPTIONS } from "@/features/dashboard/invoice-links/create/constants";
import {
  getAmount,
  getDiscountAmount,
  getSubTotalAmount,
  getTotalAmount,
  type LineItemErrors,
} from "@/features/dashboard/invoice-links/create/helpers";
import type { CurrencyOption } from "@/features/dashboard/invoice-links/create/hooks";
import type {
  DiscountType,
  InvoiceLineItem,
} from "@/features/dashboard/invoice-links/create/types";

/** Description | Item code | PPU | Qty | Tax% | Amount | delete. */
const GRID = "minmax(140px,1fr) 110px 100px 64px 64px 104px 32px";

/**
 * The line items, laid out the way invoice management lays its own out
 * (create-invoice's LineItemsSection): a bordered table inside a section card,
 * a muted uppercase header row, and the currency select sitting in the section
 * header rather than off in a separate "Payment Details" step — currency is a
 * property of what is being charged, which is why that editor puts it there.
 *
 * The columns themselves are the invoice-LINK ones, not the MCA invoice ones:
 * description / item code / PPU / qty / tax% / amount, matching the API this
 * screen posts to. Amount is always derived, never entered.
 */
export function LineItemsGrid({
  items,
  errors,
  currencies,
  currency,
  currencySymbol,
  discount,
  discountType,
  discountError,
  onCurrencyChange,
  onDiscountChange,
  onDiscountTypeChange,
  onChange,
}: {
  items: InvoiceLineItem[];
  errors: Record<string, LineItemErrors>;
  currencies: CurrencyOption[];
  currency: string;
  currencySymbol: string;
  discount: string;
  discountType: DiscountType;
  discountError?: string;
  onCurrencyChange: (next: string) => void;
  onDiscountChange: (next: string) => void;
  onDiscountTypeChange: (next: DiscountType) => void;
  onChange: (next: InvoiceLineItem[]) => void;
}) {
  // A row that came from a SKU-backed template line stays linked to the
  // catalogue only while its name, code and price are the catalogue's. Typing
  // over any of them makes it the merchant's own line, so the link is dropped
  // and saving it as a template stores what they typed. Quantity and tax are
  // per-invoice anyway, so editing them keeps the link.
  const patch = (key: string, next: Partial<InvoiceLineItem>) =>
    onChange(
      items.map((item) => {
        if (item.key !== key) return item;
        const overridesSku = "description" in next || "itemCode" in next || "ppu" in next;
        const merged = { ...item, ...next };
        if (overridesSku && merged.skuId) delete merged.skuId;
        return merged;
      })
    );

  const addRow = () =>
    onChange([
      ...items,
      {
        // Index-derived, not Date.now(): keys only need to be unique within
        // this list, and a render-time clock read breaks React Compiler purity.
        key: `item-${items.length}-${items.reduce((a, i) => a + i.key.length, 0)}`,
        description: "",
        itemCode: "",
        ppu: "",
        qty: "",
        tax: "0",
      },
    ]);

  // Upstream only offers delete while more than one row exists — an invoice
  // with no lines is not a valid document.
  const removeRow = (key: string) => onChange(items.filter((item) => item.key !== key));

  const subTotal = getSubTotalAmount(items);
  const discountAmount = getDiscountAmount(subTotal.toFixed(2), discount || "0", discountType);
  const total = getTotalAmount(items, discount || "0", discountType);

  return (
    <EditorSection
      icon="package"
      title="What you sold"
      actions={
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger
            className="h-9 w-36 gap-1.5 px-3 text-[13px] shadow-none"
            aria-label="Invoice currency"
          >
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent side="bottom" avoidCollisions={false} className="shadow-none">
            {currencies.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <div className="overflow-hidden rounded-lg border border-border">
        <div
          className="hidden items-center gap-x-3 border-b border-border bg-muted/40 px-3 py-2 md:grid"
          style={{ gridTemplateColumns: GRID }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Description
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Item code
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            PPU ({currencySymbol})
          </span>
          <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Qty
          </span>
          <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tax %
          </span>
          <span className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Amount
          </span>
          <span />
        </div>

        <div className="divide-y divide-border">
          {items.map((item) => {
            const rowErrors = errors[item.key] ?? {};
            const firstError = Object.values(rowErrors).filter(Boolean)[0];

            return (
              <div key={item.key} className="px-3 py-2.5">
                <div
                  className="grid grid-cols-2 items-center gap-2 md:gap-x-3"
                  style={{ gridTemplateColumns: undefined }}
                >
                  <div
                    className="col-span-2 grid grid-cols-2 items-center gap-2 md:gap-x-3"
                    style={{ gridTemplateColumns: GRID }}
                  >
                    <Input
                      aria-label="Description"
                      placeholder="Description"
                      aria-invalid={!!rowErrors.description}
                      value={item.description}
                      onChange={(e) => patch(item.key, { description: e.target.value })}
                      className="h-9 text-[13px] shadow-none"
                    />
                    <Input
                      aria-label="Item code"
                      placeholder="Item code"
                      aria-invalid={!!rowErrors.itemCode}
                      value={item.itemCode}
                      onChange={(e) => patch(item.key, { itemCode: e.target.value })}
                      className="h-9 text-[13px] shadow-none"
                    />
                    <Input
                      aria-label="Price per unit"
                      placeholder="0.00"
                      inputMode="decimal"
                      aria-invalid={!!rowErrors.ppu}
                      value={item.ppu}
                      onChange={(e) => patch(item.key, { ppu: e.target.value })}
                      className="h-9 text-[13px] shadow-none"
                    />
                    <Input
                      aria-label="Quantity"
                      placeholder="0"
                      inputMode="numeric"
                      aria-invalid={!!rowErrors.qty}
                      value={item.qty}
                      onChange={(e) => patch(item.key, { qty: e.target.value })}
                      className="h-9 text-center text-[13px] shadow-none"
                    />
                    <Input
                      aria-label="Tax percentage"
                      placeholder="0"
                      inputMode="decimal"
                      aria-invalid={!!rowErrors.tax}
                      value={item.tax}
                      onChange={(e) => patch(item.key, { tax: e.target.value })}
                      className="h-9 text-center text-[13px] shadow-none"
                    />
                    <span className="text-right text-[13px] font-medium tabular-nums text-foreground">
                      {currencySymbol} {getAmount(item.ppu, item.qty, item.tax).toFixed(2)}
                    </span>
                    <div className="flex justify-end">
                      {items.length > 1 ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="Remove item"
                          className="h-7 w-7 p-0"
                          onClick={() => removeRow(item.key)}
                        >
                          <Icon name="trash-2" className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                {item.skuId ? (
                  <p className="mt-1 flex items-center gap-1 text-[11.5px] text-muted-foreground">
                    <Icon name="package" className="h-3 w-3" aria-hidden />
                    From your SKU catalogue
                  </p>
                ) : null}
                {firstError ? (
                  <p className="mt-1 text-[12px] text-destructive">{firstError}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="mt-2"
        leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
        onClick={addRow}
      >
        Add another
      </Button>

      {/* Discount sits with the totals it changes, the way the MCA editor keeps
          its discount and tax controls under the items rather than in a
          separate step. */}
      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="invoice-discount-type">Discount type</FieldLabel>
            <Select
              value={discountType}
              onValueChange={(next) => onDiscountTypeChange(next as DiscountType)}
            >
              <SelectTrigger id="invoice-discount-type" className="h-9 text-[13px] shadow-none">
                <SelectValue placeholder="Select Discount Type" />
              </SelectTrigger>
              <SelectContent>
                {DISCOUNT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="invoice-discount">
              {discountType === "percentage" ? "Discount (%)" : "Discount"}
            </FieldLabel>
            <Input
              id="invoice-discount"
              inputMode="decimal"
              placeholder="0"
              aria-invalid={!!discountError}
              value={discount}
              onChange={(e) => onDiscountChange(e.target.value)}
              className="h-9 text-[13px] shadow-none"
            />
            {discountError ? <p className="text-[12px] text-destructive">{discountError}</p> : null}
          </Field>
        </div>

        <div className="space-y-1.5 text-[13px] md:justify-self-end md:text-right">
          <div className="flex justify-between gap-10">
            <span className="text-muted-foreground">Sub total</span>
            <span className="tabular-nums text-foreground">
              {currencySymbol} {subTotal.toFixed(2)}
            </span>
          </div>
          {Number(discountAmount) > 0 ? (
            <div className="flex justify-between gap-10">
              <span className="text-muted-foreground">Discount</span>
              <span className="tabular-nums text-foreground">
                −{currencySymbol} {discountAmount}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between gap-10 border-t border-border pt-1.5 font-semibold">
            <span className="text-foreground">Amount due</span>
            <span className="tabular-nums text-foreground">
              {currencySymbol} {total}
            </span>
          </div>
        </div>
      </div>
    </EditorSection>
  );
}
