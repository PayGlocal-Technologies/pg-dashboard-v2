"use client";

import { useRef, useState } from "react";
import {
  Button,
  Callout,
  CalloutText,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  getAmount,
  getDiscountAmount,
  getSubtotal,
  getTaxAmount,
  getTotalAmount,
} from "@/features/dashboard/create-invoice/helpers";
import { DISCOUNT_TYPE_OPTIONS } from "@/features/dashboard/create-invoice/constants";
import {
  AddLineItemDialog,
  type LineItemValues,
} from "@/features/dashboard/create-invoice/components/AddLineItemDialog";
import type { CurrencyData, LineItemDraft } from "@/features/dashboard/create-invoice/types";

/** Grid template shared by the header, every row, and the add-row footer. */
const GRID = "20px 1fr 64px 110px 96px 56px";

function formatMoney(symbol: string, amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `${symbol}${(Number.isFinite(value) ? value : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function LineItemsSection({
  lineItems,
  onLineItemsChange,
  currency,
  currencies,
  symbolFor,
  onCurrencyChange,
  discountName,
  discountValue,
  discountType,
  taxName,
  taxValue,
  onTotalsFieldChange,
  linkedExpectedTotal,
  linkedCurrency,
}: {
  lineItems: LineItemDraft[];
  onLineItemsChange: (next: LineItemDraft[]) => void;
  currency: string;
  currencies: CurrencyData[];
  symbolFor: (code: string) => string;
  onCurrencyChange: (currency: string) => void;
  discountName: string;
  discountValue: string;
  discountType: "percentage" | "fixed";
  taxName: string;
  taxValue: string;
  onTotalsFieldChange: (patch: {
    discountName?: string;
    discountValue?: string;
    discountType?: "percentage" | "fixed";
    taxName?: string;
    taxValue?: string;
  }) => void;
  /** Set only when this invoice is linked to a transaction *and* the items do
   *  not add up to it. pg-dashboard raises the same mismatch on leaving its
   *  ITEMS step; the flat editor has no step to leave, so it is shown against
   *  the items themselves rather than held back until Generate. */
  linkedExpectedTotal?: string | null;
  linkedCurrency?: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [discountOpen, setDiscountOpen] = useState(discountValue.length > 0);
  const [taxOpen, setTaxOpen] = useState(taxValue.length > 0);

  const dragFrom = useRef<number | null>(null);
  const dragTo = useRef<number | null>(null);
  const nextKey = useRef(0);

  const symbol = symbolFor(currency);
  const editingItem = editingKey ? (lineItems.find((i) => i.key === editingKey) ?? null) : null;

  const subtotal = getSubtotal(lineItems);
  const discountAmount = getDiscountAmount(discountValue, discountType, lineItems);
  const taxAmount = getTaxAmount(taxValue, discountValue, discountType, lineItems);
  const total = getTotalAmount(lineItems, taxAmount, discountAmount);

  const patchItem = (key: string, patch: Partial<LineItemDraft>) =>
    onLineItemsChange(lineItems.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const handleSubmitItem = (values: LineItemValues) => {
    if (editingKey) {
      patchItem(editingKey, values);
      return;
    }
    // Keys only need to be unique within this editor; the server ignores them.
    const key = `li_${Date.now()}_${nextKey.current++}`;
    onLineItemsChange([...lineItems, { key, ...values }]);
  };

  const openAdd = () => {
    setEditingKey(null);
    setDialogOpen(true);
  };

  const openEdit = (key: string) => {
    setEditingKey(key);
    setDialogOpen(true);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="package" className="h-4 w-4" />
          </span>
          <h2 className="text-[15px] font-semibold text-foreground">What you sold</h2>
        </div>

        {/* Currencies come from the merchant's own FFMS configuration, not a
            hard-coded list, so an unsupported one cannot be chosen. */}
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger className="w-[7.5rem]" aria-label="Invoice currency">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            {currencies.map((option) => (
              <SelectItem key={option.currencyCode} value={option.currencyCode}>
                {option.currencyCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {lineItems.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <div
            className="grid items-center gap-x-3 border-b border-border bg-muted/40 py-2 pl-3 pr-2"
            style={{ gridTemplateColumns: GRID }}
          >
            <span />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Description
            </span>
            <span className="text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Qty
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Rate ({symbol})
            </span>
            <span className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total
            </span>
            <span />
          </div>

          <div>
            {lineItems.map((item, index) => (
              // Structural row with drag-to-reorder. No flux component covers
              // an editable, reorderable grid — DataTable is a display grid and
              // fights inline inputs — so a bare div carries the HTML5 drag
              // handlers here, per the escape hatch in CLAUDE.md.
              <div
                key={item.key}
                draggable
                onDragStart={() => {
                  dragFrom.current = index;
                }}
                onDragEnter={() => {
                  dragTo.current = index;
                }}
                onDragOver={(e) => e.preventDefault()}
                onDragEnd={() => {
                  const from = dragFrom.current;
                  const to = dragTo.current;
                  dragFrom.current = null;
                  dragTo.current = null;
                  if (from === null || to === null || from === to) return;

                  const reordered = [...lineItems];
                  const [moved] = reordered.splice(from, 1);
                  if (moved) reordered.splice(to, 0, moved);
                  onLineItemsChange(reordered);
                }}
                className={cn(
                  "group grid cursor-grab items-center gap-x-3 py-2.5 pl-3 pr-2 transition-colors hover:bg-muted/30 active:cursor-grabbing",
                  index < lineItems.length - 1 && "border-b border-border"
                )}
                style={{ gridTemplateColumns: GRID }}
              >
                <Icon
                  name="grip-vertical"
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground"
                />

                <div className="min-w-0 pr-2">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {item.description || "Untitled item"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {item.type && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {item.type === "SERVICE" ? "Service" : "Good"}
                      </span>
                    )}
                    {item.hsn && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {item.type === "SERVICE" ? "SAC" : "HSN"} {item.hsn}
                      </span>
                    )}
                    {item.gstRate && (
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        {item.gstRate}% GST
                      </span>
                    )}
                    {item.saveAsSku && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Saving to catalogue
                      </span>
                    )}
                  </div>
                </div>

                <Input
                  inputMode="numeric"
                  aria-label={`Quantity for ${item.description || "item"}`}
                  value={item.quantity}
                  onChange={(e) => patchItem(item.key, { quantity: e.target.value })}
                  className="h-7 px-2 text-center text-[13px]"
                />

                <Input
                  inputMode="decimal"
                  aria-label={`Rate for ${item.description || "item"}`}
                  value={item.unitPrice}
                  onChange={(e) => patchItem(item.key, { unitPrice: e.target.value })}
                  className="h-7 px-2 text-[13px]"
                />

                <span className="text-right text-[13px] font-semibold tabular-nums text-foreground">
                  {formatMoney(
                    symbol,
                    getAmount(item.unitPrice || "0", item.quantity || "0", item.gstRate || "0")
                  )}
                </span>

                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Edit line item"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={() => openEdit(item.key)}
                  >
                    <Icon name="pencil" className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove line item"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                    onClick={() =>
                      onLineItemsChange(lineItems.filter((row) => row.key !== item.key))
                    }
                  >
                    <Icon name="trash-2" className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border py-2 pl-3 pr-2">
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0"
              leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
              onClick={openAdd}
            >
              Add line item
            </Button>
          </div>

          <div className="space-y-2 border-t border-border bg-muted/20 px-3 py-4">
            {/* Subtotal is GST-inclusive: production folds each line's GST into
                it, then applies the invoice discount and tax on top. Labelled
                plainly so the number is not mistaken for a net figure. */}
            <div className="flex items-center justify-between text-[13px] text-muted-foreground">
              <span>Subtotal (incl. line GST)</span>
              <span className="tabular-nums">{formatMoney(symbol, subtotal)}</span>
            </div>

            {discountOpen ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <div className="flex flex-1 items-center gap-1.5">
                  <Input
                    aria-label="Discount name"
                    placeholder="Discount"
                    value={discountName}
                    onChange={(e) => onTotalsFieldChange({ discountName: e.target.value })}
                    className="h-7 w-28 text-[12px]"
                  />
                  <Select
                    value={discountType}
                    onValueChange={(next) =>
                      onTotalsFieldChange({ discountType: next as "percentage" | "fixed" })
                    }
                  >
                    <SelectTrigger className="h-7 w-[4.5rem]" aria-label="Discount type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DISCOUNT_TYPE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    inputMode="decimal"
                    aria-label="Discount value"
                    placeholder="0"
                    value={discountValue}
                    onChange={(e) => onTotalsFieldChange({ discountValue: e.target.value })}
                    className="h-7 w-20 text-right text-[12px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove discount"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      setDiscountOpen(false);
                      onTotalsFieldChange({ discountValue: "", discountName: "" });
                    }}
                  >
                    <Icon name="trash-2" className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <span className="tabular-nums text-muted-foreground">
                  {Number(discountAmount) > 0 ? `-${formatMoney(symbol, discountAmount)}` : "-"}
                </span>
              </div>
            ) : (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                leftIcon={<Icon name="plus" className="h-3 w-3" />}
                onClick={() => setDiscountOpen(true)}
              >
                Add discount
              </Button>
            )}

            {taxOpen ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <div className="flex flex-1 items-center gap-1.5">
                  <Input
                    aria-label="Tax name"
                    placeholder="Tax"
                    value={taxName}
                    onChange={(e) => onTotalsFieldChange({ taxName: e.target.value })}
                    className="h-7 w-28 text-[12px]"
                  />
                  <Input
                    inputMode="decimal"
                    aria-label="Tax rate percent"
                    placeholder="0"
                    value={taxValue}
                    onChange={(e) => onTotalsFieldChange({ taxValue: e.target.value })}
                    className="h-7 w-20 text-right text-[12px]"
                  />
                  <span className="text-[12px] text-muted-foreground">%</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Remove tax"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      setTaxOpen(false);
                      onTotalsFieldChange({ taxValue: "", taxName: "" });
                    }}
                  >
                    <Icon name="trash-2" className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <span className="tabular-nums text-muted-foreground">
                  {Number(taxAmount) > 0 ? formatMoney(symbol, taxAmount) : "-"}
                </span>
              </div>
            ) : (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                leftIcon={<Icon name="plus" className="h-3 w-3" />}
                onClick={() => setTaxOpen(true)}
              >
                Add invoice tax
              </Button>
            )}

            <div className="flex items-center justify-between border-t border-border pt-2 text-[15px] font-semibold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(symbol, total)}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-6 text-center">
          <p className="text-[12.5px] text-muted-foreground">Nothing billed yet.</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onClick={openAdd}
          >
            Add line item
          </Button>
        </div>
      )}

      {/* The linked-transaction amount gate, raised here rather than only at
          Generate: pg-dashboard blocks the ITEMS step on the same mismatch, and
          the items are what has to change to clear it.

          Both figures are shown as code + amount rather than one as a symbol and
          the other as a code — "$0.00 vs NZD 100.00" reads as two currencies
          when it is meant to read as two amounts of one. */}
      {linkedExpectedTotal && (
        <Callout variant="error" className="mt-3">
          <CalloutText>
            Items total {currency} {total} — must match the linked transaction:{" "}
            {linkedCurrency || currency} {linkedExpectedTotal}.
          </CalloutText>
        </Callout>
      )}

      <AddLineItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currency={currency}
        currencySymbol={symbol}
        editingItem={editingItem}
        onSubmit={handleSubmitItem}
      />
    </div>
  );
}
