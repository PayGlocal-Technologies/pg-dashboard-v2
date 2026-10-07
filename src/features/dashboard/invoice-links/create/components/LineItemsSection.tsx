"use client";

import { useMemo, useRef, useState } from "react";
import {
  Button,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Popover,
  PopoverAnchor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { useApp } from "@/stores/useApp";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { currencyFlagIso2 } from "@/features/dashboard/payment-button/components/create/CurrencyValueField";
import {
  filterLineItemSuggestions,
  LineItemSuggestionsContent,
} from "@/features/dashboard/create-invoice/components/LineItemsSection";
import { resolveItemType } from "@/features/dashboard/create-invoice/helpers";
import type { LineItemSuggestion } from "@/features/dashboard/create-invoice/types";
import { DISCOUNT_TYPE_OPTIONS } from "@/features/dashboard/invoice-links/create/constants";
import {
  getAmount,
  getDiscountAmount,
  getSubTotalAmount,
  getTotalAmount,
  type LineItemErrors,
} from "@/features/dashboard/invoice-links/create/helpers";
import {
  useLineItemSuggestions,
  type CurrencyOption,
} from "@/features/dashboard/invoice-links/create/hooks";
import type {
  DiscountType,
  InvoiceLineItem,
} from "@/features/dashboard/invoice-links/create/types";
import {
  LineItemDialog,
  type LineItemValues,
} from "@/features/dashboard/invoice-links/create/components/LineItemDialog";

/** Grid template shared by the header and every row. Same as create-invoice's. */
const GRID = "20px minmax(160px,1fr) 56px 96px 88px 48px";

/** Same text-styled action as create-invoice's "Add discount" / "Add line item". */
const ADD_ACTION_CLASS =
  "h-auto w-fit rounded-full px-3 py-1.5 text-[13px] font-medium text-primary hover:bg-primary/5 hover:text-primary";

function formatMoney(symbol: string, amount: number | string): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `${symbol}${(Number.isFinite(value) ? value : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * "What you sold" for an invoice link, laid out like create-invoice's
 * LineItemsSection: read-only rows with Qty and Rate editable in place, an add
 * action that opens the item dialog, and the totals underneath.
 *
 * Two differences, both from the invoice-link payload:
 *  - tax is per line (`gstPercentage`), set in the item dialog and shown as a
 *    badge, so there is no invoice-level tax row;
 *  - the discount is invoice-level, with no name field (`discountAmount` /
 *    `discountPercent` only).
 *
 * Adding works as there too: the field is a search over the merchant's
 * previous items (create-invoice's `get-line-items`, for this MID and
 * currency), picking one adds it straight away, and "Add new item" opens the
 * dialog — pre-named when it came from a typed query that matched nothing.
 */
export function LineItemsSection({
  mid,
  items,
  errors,
  itemsError,
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
  /** The invoice link's MID, which the item suggestions are read for. */
  mid: string;
  items: InvoiceLineItem[];
  errors: Record<string, LineItemErrors>;
  /** Set when the invoice has no items at all. */
  itemsError?: string;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [discountOpen, setDiscountOpen] = useState(discount.length > 0);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  // Seeds the dialog's name when opened from "Add "…"" for an unmatched query.
  const [addSeed, setAddSeed] = useState<string | undefined>(undefined);

  const countryCurrencyMap = useApp((s) => s.countryCurrencyMap);
  const suggestions = useLineItemSuggestions(mid, currency);
  const matchingSuggestions = useMemo(
    () => filterLineItemSuggestions(suggestions, addQuery),
    [suggestions, addQuery]
  );

  const dragFrom = useRef<number | null>(null);
  const dragTo = useRef<number | null>(null);
  const nextKey = useRef(0);

  const editingItem = editingKey ? (items.find((i) => i.key === editingKey) ?? null) : null;

  const subTotal = getSubTotalAmount(items);
  const discountAmount = getDiscountAmount(subTotal.toFixed(2), discount || "0", discountType);
  const total = getTotalAmount(items, discount || "0", discountType);

  // Changing the price in place makes a catalogue line the merchant's own, as
  // the dialog does for name, code and price. Quantity keeps the link.
  const patchItem = (key: string, next: Partial<InvoiceLineItem>) =>
    onChange(
      items.map((item) => {
        if (item.key !== key) return item;
        const merged = { ...item, ...next };
        if ("ppu" in next && merged.skuId) delete merged.skuId;
        return merged;
      })
    );

  const openAdd = (name?: string) => {
    setAddOpen(false);
    setEditingKey(null);
    setAddSeed(name);
    setDialogOpen(true);
  };

  /** A suggestion needs no further typing, so it is added straight away. */
  const addFromSuggestion = (item: LineItemSuggestion) => {
    const key = `li_${Date.now()}_${nextKey.current++}`;
    onChange([
      ...items,
      {
        key,
        description: item.name,
        itemCode: item.hsn ?? "",
        ppu: item.unitPrice ?? "",
        qty: "1",
        tax: "",
        itemType: resolveItemType(item) || undefined,
        // Kept so a template saved from this invoice references the SKU, and
        // reads its live name and price back (see toTemplateLineItem).
        ...(item.skuId ? { skuId: item.skuId } : {}),
      },
    ]);
    setAddOpen(false);
    setAddQuery("");
  };

  const onAddOpenChange = (next: boolean) => {
    setAddOpen(next);
    if (!next) setAddQuery("");
  };

  const suggestionsContent = (
    <LineItemSuggestionsContent
      query={addQuery}
      matches={matchingSuggestions}
      symbol={currencySymbol}
      onSelect={addFromSuggestion}
      onAddNew={openAdd}
    />
  );

  const openEdit = (key: string) => {
    setEditingKey(key);
    setDialogOpen(true);
  };

  const handleSubmitItem = (values: LineItemValues) => {
    if (editingKey) {
      onChange(
        items.map((item) => (item.key === editingKey ? { key: item.key, ...values } : item))
      );
      return;
    }
    // Keys only need to be unique within this editor; the server ignores them.
    const key = `li_${Date.now()}_${nextKey.current++}`;
    onChange([...items, { key, ...values }]);
  };

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="package" className="h-4 w-4" />
          </span>
          <h2 className="text-[15px] font-semibold text-foreground">
            What you sold <span className="text-destructive">*</span>
          </h2>
        </div>

        {/* create-invoice's currency select: flag and code. The flag comes
            from the shared currency → country rule (currencyFlagIso2), since
            the invoice-link currency list carries no country. */}
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger
            className="h-9 w-32 gap-1.5 px-3 text-[13px] shadow-none"
            aria-label="Invoice currency"
          >
            <SelectValue placeholder="Currency">
              {currency && (
                <span className="flex items-center gap-1.5">
                  <CountryFlag iso2={currencyFlagIso2(currency, countryCurrencyMap)} />
                  {currency}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" avoidCollisions={false} className="shadow-none">
            {currencies.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <span className="flex items-center gap-2">
                  <CountryFlag iso2={currencyFlagIso2(option.value, countryCurrencyMap)} />
                  {option.value}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {items.length > 0 ? (
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
              Rate ({currencySymbol})
            </span>
            <span className="text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Total
            </span>
            <span />
          </div>

          <div>
            {items.map((item, index) => {
              const rowErrors = errors[item.key] ?? {};
              const firstError = Object.values(rowErrors).filter(Boolean)[0];
              const isService = item.itemType === "SERVICE";

              return (
                // Structural row with drag-to-reorder, as in create-invoice:
                // no flux component covers an editable, reorderable grid.
                <div
                  key={item.key}
                  className={cn(index < items.length - 1 && "border-b border-border")}
                >
                  <div
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
                      const reordered = [...items];
                      const [moved] = reordered.splice(from, 1);
                      if (moved) reordered.splice(to, 0, moved);
                      onChange(reordered);
                    }}
                    className="group grid cursor-grab items-center gap-x-3 py-2.5 pl-3 pr-2 transition-colors hover:bg-muted/30 active:cursor-grabbing"
                    style={{ gridTemplateColumns: GRID }}
                  >
                    <Icon
                      name="grip-vertical"
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground"
                    />

                    <div className="min-w-0 overflow-hidden pr-2">
                      <p className="truncate text-[13px] font-medium text-foreground">
                        {item.description || "Untitled item"}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {item.itemType && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {isService ? "Service" : "Good"}
                          </span>
                        )}
                        {item.itemCode && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            {isService ? "SAC" : "HSN"} {item.itemCode}
                          </span>
                        )}
                        {Number(item.tax) > 0 && (
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {item.tax}% tax
                          </span>
                        )}
                        {item.skuId && (
                          <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                            From catalogue
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
                      aria-invalid={!!rowErrors.qty || undefined}
                      value={item.qty}
                      onChange={(e) => patchItem(item.key, { qty: e.target.value })}
                      className="h-7 px-2 text-center text-[13px] shadow-none"
                    />

                    <Input
                      inputMode="decimal"
                      aria-label={`Rate for ${item.description || "item"}`}
                      aria-invalid={!!rowErrors.ppu || undefined}
                      value={item.ppu}
                      onChange={(e) => patchItem(item.key, { ppu: e.target.value })}
                      className="h-7 px-2 text-[13px] shadow-none"
                    />

                    <span className="text-right text-[13px] font-semibold tabular-nums text-foreground">
                      {formatMoney(currencySymbol, getAmount(item.ppu, item.qty, item.tax || "0"))}
                    </span>

                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Edit line item"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => openEdit(item.key)}
                      >
                        <Icon name="pencil" className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label="Remove line item"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => onChange(items.filter((row) => row.key !== item.key))}
                      >
                        <Icon name="trash-2" className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {firstError ? (
                    <p className="-mt-1 pb-2 pl-11 pr-3 text-[12px] text-destructive">
                      {firstError}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="space-y-2 border-t border-border bg-muted/20 px-3 py-4">
            {/* The field is the search box itself, as in create-invoice. */}
            <Popover open={addOpen} onOpenChange={onAddOpenChange}>
              <PopoverAnchor asChild>
                <div className="relative inline-flex w-56 shrink-0 items-center">
                  <Icon
                    name="plus"
                    className="pointer-events-none absolute left-3 z-10 h-3.5 w-3.5 text-primary"
                  />
                  <Input
                    role="combobox"
                    autoComplete="off"
                    aria-expanded={addOpen}
                    aria-haspopup="listbox"
                    aria-controls="line-items-listbox"
                    value={addQuery}
                    onFocus={() => setAddOpen(true)}
                    onChange={(e) => {
                      setAddQuery(e.target.value);
                      if (!addOpen) setAddOpen(true);
                    }}
                    placeholder="Add line item"
                    className="h-8 min-h-0 w-full rounded-full border-transparent bg-transparent py-1.5 pl-8 pr-2 text-[13px] font-medium shadow-none placeholder:font-medium placeholder:text-primary hover:bg-primary/5 focus-visible:border-border focus-visible:bg-card"
                  />
                </div>
              </PopoverAnchor>
              {suggestionsContent}
            </Popover>

            {/* Subtotal includes each line's own tax, as the invoice-link
                totals always have; the discount comes off that. */}
            <div className="flex items-center justify-between text-[13px] text-muted-foreground">
              <span>Subtotal (incl. line tax)</span>
              <span className="tabular-nums">{formatMoney(currencySymbol, subTotal)}</span>
            </div>

            {discountOpen ? (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <div className="flex flex-1 items-center gap-1.5">
                    <span className="w-20 shrink-0 text-muted-foreground">Discount</span>
                    <Select
                      value={discountType}
                      onValueChange={(next) => onDiscountTypeChange(next as DiscountType)}
                    >
                      <SelectTrigger
                        className="h-7 w-[6.5rem] px-2 text-[13px]"
                        aria-label="Discount type"
                      >
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
                      aria-invalid={!!discountError || undefined}
                      placeholder="0"
                      value={discount}
                      onChange={(e) => onDiscountChange(e.target.value)}
                      className="h-7 w-20 text-right text-[12px]"
                    />
                    {discountType === "percentage" && (
                      <span className="text-[12px] text-muted-foreground">%</span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Remove discount"
                      className="h-7 w-7 p-0"
                      onClick={() => {
                        setDiscountOpen(false);
                        onDiscountChange("");
                      }}
                    >
                      <Icon name="trash-2" className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <span className="tabular-nums text-muted-foreground">
                    {Number(discountAmount) > 0
                      ? `-${formatMoney(currencySymbol, discountAmount)}`
                      : "-"}
                  </span>
                </div>
                {discountError ? (
                  <p className="text-[12px] text-destructive">{discountError}</p>
                ) : null}
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
                className={cn(ADD_ACTION_CLASS, "flex")}
                onClick={() => setDiscountOpen(true)}
              >
                Add discount
              </Button>
            )}

            <div className="flex items-center justify-between border-t border-border pt-2 text-[15px] font-semibold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(currencySymbol, total)}</span>
            </div>
          </div>
        </div>
      ) : (
        // Nothing billed yet: the same full-width search field create-invoice
        // shows, so the first item can come from the catalogue too.
        <Popover open={addOpen} onOpenChange={onAddOpenChange}>
          <PopoverAnchor asChild>
            <InputGroup className={cn(itemsError && "border-destructive")}>
              <InputGroupAddon align="inline-start">
                <Icon name="search" className="h-3.5 w-3.5 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                role="combobox"
                autoComplete="off"
                aria-expanded={addOpen}
                aria-haspopup="listbox"
                aria-controls="line-items-listbox"
                aria-invalid={!!itemsError || undefined}
                value={addQuery}
                onFocus={() => setAddOpen(true)}
                onChange={(e) => {
                  setAddQuery(e.target.value);
                  if (!addOpen) setAddOpen(true);
                }}
                placeholder="Add an item"
                className="text-[13px]"
              />
              <InputGroupAddon align="inline-end">
                <Icon
                  name="chevron-down"
                  className={cn(
                    "h-3.5 w-3.5 text-muted-foreground opacity-70 transition-transform",
                    addOpen && "rotate-180"
                  )}
                />
              </InputGroupAddon>
            </InputGroup>
          </PopoverAnchor>
          {suggestionsContent}
        </Popover>
      )}

      {itemsError && items.length === 0 ? (
        <p className="mt-2 text-[12px] text-destructive">{itemsError}</p>
      ) : null}

      <LineItemDialog
        open={dialogOpen}
        onOpenChange={(next) => {
          setDialogOpen(next);
          if (!next) setAddSeed(undefined);
        }}
        initialDescription={addSeed}
        currencySymbol={currencySymbol}
        editingItem={editingItem}
        onSubmit={handleSubmitItem}
      />
    </div>
  );
}
