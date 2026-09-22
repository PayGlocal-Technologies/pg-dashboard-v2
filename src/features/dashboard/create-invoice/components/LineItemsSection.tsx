"use client";

import { useMemo, useRef, useState } from "react";
import {
  Button,
  Callout,
  CalloutText,
  Input,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import {
  getAmount,
  getDiscountAmount,
  getSubtotal,
  getTaxAmount,
  getTotalAmount,
} from "@/features/dashboard/create-invoice/helpers";
import { DISCOUNT_TYPE_OPTIONS } from "@/features/dashboard/create-invoice/constants";
import { useLineItemSuggestions } from "@/features/dashboard/create-invoice/hooks";
import {
  AddLineItemDialog,
  type LineItemValues,
} from "@/features/dashboard/create-invoice/components/AddLineItemDialog";
import type {
  CurrencyData,
  LineItemDraft,
  LineItemSuggestion,
} from "@/features/dashboard/create-invoice/types";

/** Grid template shared by the header, every row, and the add-row footer. */
const GRID = "20px minmax(160px,1fr) 56px 96px 88px 48px";

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
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  // Seeds the full-form dialog's name field when it's opened from the
  // inline "Add "…"" row rather than the always-present "Add new item"
  // button — undefined for the latter, so the form still opens blank.
  const [addSeed, setAddSeed] = useState<string | undefined>(undefined);

  const dragFrom = useRef<number | null>(null);
  const dragTo = useRef<number | null>(null);
  const nextKey = useRef(0);

  const suggestions = useLineItemSuggestions(currency);

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

  const openEdit = (key: string) => {
    setEditingKey(key);
    setDialogOpen(true);
  };

  /** Closes the dropdown and opens the full form — for a suggestion that
   *  doesn't cover what's being billed, same escape hatch BillToSection's
   *  own dropdown gives with "Add a new client". `name` seeds the form's
   *  own item-name field when opened from a typed-but-unmatched search. */
  const openAddDialog = (name?: string) => {
    setAddOpen(false);
    setEditingKey(null);
    setAddSeed(name);
    setDialogOpen(true);
  };

  /** Picking a suggestion adds it straight away — the whole point of a
   *  catalogue entry is that it needs no further typing, same as choosing an
   *  existing client rather than filling in one from scratch. Quantity
   *  defaults to 1, same as a fresh item from the dialog; GST rate is left
   *  blank since the suggestion carries none. */
  const addFromSuggestion = (item: LineItemSuggestion) => {
    const key = `li_${Date.now()}_${nextKey.current++}`;
    onLineItemsChange([
      ...lineItems,
      {
        key,
        description: item.name,
        type: item.type ?? "",
        hsn: item.hsn ?? "",
        gstRate: "",
        unitPrice: item.unitPrice ?? "",
        quantity: "1",
        saveAsSku: false,
      },
    ]);
    setAddOpen(false);
    setAddQuery("");
  };

  // Filtered here, not by any dropdown-internal logic — see BillToSection's
  // client picker for the same pattern. An empty query lists the whole
  // catalogue rather than nothing, matching production's own item-name
  // autocomplete inside AddLineItemDialog.
  const matchingSuggestions = useMemo(() => {
    const needle = addQuery.trim().toLowerCase();
    const seen = new Set<string>();
    const unique: { item: LineItemSuggestion; key: string }[] = [];
    for (const item of suggestions) {
      if (!item.name) continue;
      if (needle && !item.name.toLowerCase().includes(needle)) continue;
      const dedupeKey = [item.name, item.unitPrice ?? "", item.hsn ?? "", item.type ?? ""].join(
        "|"
      );
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      unique.push({ item, key: dedupeKey });
    }
    return unique;
  }, [suggestions, addQuery]);

  const selectedCurrency = currencies.find((option) => option.currencyCode === currency);

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon name="package" className="h-4 w-4" />
          </span>
          <h2 className="text-[15px] font-semibold text-foreground">What you sold</h2>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {/* Currencies come from the merchant's own FFMS configuration, not a
              hard-coded list, so an unsupported one cannot be chosen. */}
          <Select value={currency} onValueChange={onCurrencyChange}>
            {/* flux's Select defaults to h-11 / 15px, which is a full-size form
                control. This one sits in a card header beside a 13px title and a
                13px table, so it was reading a size too large — the DQA's
                "dropdown text UI font size needs to be checked". */}
            <SelectTrigger
              className="h-9 w-32 gap-1.5 px-3 text-[13px] shadow-none"
              aria-label="Invoice currency"
            >
              <SelectValue placeholder="Currency">
                {selectedCurrency && (
                  <span className="flex items-center gap-1.5">
                    <CountryFlag iso2={selectedCurrency.iso2CountryCode} />
                    {selectedCurrency.currencyCode}
                  </span>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" avoidCollisions={false} className="shadow-none">
              {currencies.map((option) => (
                <SelectItem key={option.currencyCode} value={option.currencyCode}>
                  <span className="flex items-center gap-2">
                    <CountryFlag iso2={option.iso2CountryCode} />
                    {option.currencyCode}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

                <div className="min-w-0 overflow-hidden pr-2">
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

          <div className="space-y-2 border-t border-border bg-muted/20 px-3 py-4">
            {/* Same dropdown-with-a-pinned-"add" pattern as BillToSection's
                client picker: suggestions from the merchant's own catalogue,
                searchable, picking one adds it straight away with no dialog —
                "Add new item" is the one row that still opens the full form,
                pinned so it's always reachable regardless of what's typed.
                Sits right above Subtotal rather than up in the header, so
                it's beside the very total it's about to change.

                The field is the search box itself, same as BillToSection's
                client field — no separate "click to open, then type into a
                second box inside the panel" step. */}
            <Popover
              open={addOpen}
              onOpenChange={(next) => {
                setAddOpen(next);
                if (!next) setAddQuery("");
              }}
            >
              <PopoverAnchor asChild>
                <div className="relative inline-flex w-56 shrink-0 items-center">
                  <Icon
                    name="plus"
                    className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-primary"
                  />
                  <input
                    type="text"
                    role="combobox"
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
                    className={cn(
                      "h-8 w-full rounded-full border border-transparent bg-transparent py-1.5 pl-8 pr-2 text-[13px] font-medium text-foreground placeholder:font-medium placeholder:text-primary",
                      "transition-colors duration-150",
                      "hover:bg-primary/5",
                      "focus-visible:border-border focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                    )}
                  />
                </div>
              </PopoverAnchor>
              <LineItemSuggestionsContent
                query={addQuery}
                matches={matchingSuggestions}
                symbol={symbol}
                onSelect={addFromSuggestion}
                onAddNew={openAddDialog}
              />
            </Popover>

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
                  {/* A static label naming the row, then a field naming the
                      discount.

                      The two jobs were previously done by one control: an input
                      whose placeholder read "Discount". A placeholder that names
                      the row reads as the row's label, so the box looked like
                      decoration and nobody could tell it took a value. Splitting
                      them costs nothing — the label says which row this is, the
                      placeholder says what the field is for. */}
                  <span className="w-20 shrink-0 text-muted-foreground">Discount</span>
                  <Input
                    aria-label="Discount name, optional"
                    placeholder="Optional name"
                    value={discountName}
                    onChange={(e) => onTotalsFieldChange({ discountName: e.target.value })}
                    className="h-7 w-32 text-[12px]"
                  />
                  <Select
                    value={discountType}
                    onValueChange={(next) =>
                      onTotalsFieldChange({ discountType: next as "percentage" | "fixed" })
                    }
                  >
                    <SelectTrigger
                      className="h-7 w-[4.5rem] px-2 text-[13px]"
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
              // `Button`'s own "link" variant is fixed at 15px regardless of
              // `size` (see LineItemSuggestionsContent's trigger above for
              // the same fix) — a plain button styled like Create Invoice's
              // own "Add due date" chip instead. block, not the Button
              // component's inline-flex default: two of these back to back
              // with nothing between them were sharing one line instead of
              // stacking, since space-y-2's margin has no effect between
              // inline-level boxes.
              <button
                type="button"
                onClick={() => setDiscountOpen(true)}
                className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/5"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                Add discount
              </button>
            )}

            {taxOpen ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                <div className="flex flex-1 items-center gap-1.5">
                  {/* Same split as the discount row. It matters more here: an
                      invoice-level tax is VAT or IGST or service tax, and on a
                      cross-border invoice that word does real work, so the field
                      naming it has to be recognisable as a field. */}
                  <span className="w-20 shrink-0 text-muted-foreground">Tax</span>
                  <Input
                    aria-label="Tax name, optional"
                    placeholder="e.g. VAT, IGST"
                    value={taxName}
                    onChange={(e) => onTotalsFieldChange({ taxName: e.target.value })}
                    className="h-7 w-32 text-[12px]"
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
              <button
                type="button"
                onClick={() => setTaxOpen(true)}
                className="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-primary/5"
              >
                <Icon name="plus" className="h-3.5 w-3.5" />
                Add invoice tax
              </button>
            )}

            <div className="flex items-center justify-between border-t border-border pt-2 text-[15px] font-semibold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{formatMoney(symbol, total)}</span>
            </div>
          </div>
        </div>
      ) : (
        // Same full-width, directly-typable field as BillToSection's own
        // unselected "Choose a client" field — nothing billed yet, so
        // nothing to protect from an accidental click either.
        <Popover
          open={addOpen}
          onOpenChange={(next) => {
            setAddOpen(next);
            if (!next) setAddQuery("");
          }}
        >
          <PopoverAnchor asChild>
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                role="combobox"
                aria-expanded={addOpen}
                aria-haspopup="listbox"
                aria-controls="line-items-listbox"
                value={addQuery}
                onFocus={() => setAddOpen(true)}
                onChange={(e) => {
                  setAddQuery(e.target.value);
                  if (!addOpen) setAddOpen(true);
                }}
                placeholder="Add an item"
                className={cn(
                  "flex h-11 w-full items-center rounded-lg border border-border bg-card py-2 pl-9 pr-9 text-[13px] text-foreground shadow-none placeholder:text-muted-foreground",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                )}
              />
              <Icon
                name="chevron-down"
                className={cn(
                  "pointer-events-none absolute right-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground opacity-70 transition-transform",
                  addOpen && "rotate-180"
                )}
              />
            </div>
          </PopoverAnchor>
          <LineItemSuggestionsContent
            query={addQuery}
            matches={matchingSuggestions}
            symbol={symbol}
            onSelect={addFromSuggestion}
            onAddNew={openAddDialog}
          />
        </Popover>
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
            Items total {currency} {total}, which must match the linked transaction:{" "}
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
        initialDescription={addSeed}
        onSubmit={handleSubmitItem}
      />
    </div>
  );
}

/**
 * The dropdown's own content — shared between the header trigger (once
 * there's at least one item) and the empty-state trigger, so the two never
 * drift into different search behaviour or a different "Add new item" row.
 * Same shape as BillToSection's client-picker popover: the matching
 * catalogue entries (no search box of its own — the trigger it's anchored
 * to is the search box), and "Add new item" pinned outside the scrollable
 * list so it never scrolls away.
 */
function LineItemSuggestionsContent({
  query,
  matches,
  symbol,
  onSelect,
  onAddNew,
}: {
  query: string;
  matches: { item: LineItemSuggestion; key: string }[];
  symbol: string;
  onSelect: (item: LineItemSuggestion) => void;
  onAddNew: (name?: string) => void;
}) {
  // side="bottom" + avoidCollisions={false}: Radix flips a panel above its
  // trigger when the viewport runs out of room below, which here meant the
  // suggestions could land on top of the item row you were adding to. Pinned
  // below, it always grows in the reading direction.
  return (
    <PopoverContent
      side="bottom"
      align="start"
      avoidCollisions={false}
      className="w-(--radix-popover-trigger-width) min-w-[min(22rem,calc(100vw-3rem))] p-0 shadow-none"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <div id="line-items-listbox" role="listbox" aria-label="Items" className="p-1">
        {matches.length === 0 ? (
          query.trim() ? (
            // The one prominent affordance for "nothing in the catalogue
            // matches this" — filled, not a muted text link, so it reads as
            // the obvious next step rather than an easy-to-miss caption.
            // Opens the full item form (price, HSN, GST) rather than adding
            // straight away, since none of that exists for a typed name yet.
            <button
              type="button"
              onClick={() => onAddNew(query.trim())}
              className="flex w-full items-center gap-2 rounded-md bg-primary px-3 py-2.5 text-left text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <Icon name="plus" className="h-3.5 w-3.5 shrink-0" />
              Add &ldquo;{query.trim()}&rdquo;
            </button>
          ) : (
            <p className="px-2 py-3 text-center text-[13px] text-muted-foreground">
              No items billed yet.
            </p>
          )
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {matches.map(({ item, key }) => {
              const meta = [
                item.type ? (item.type === "SERVICE" ? "Service" : "Good") : "",
                item.hsn ? `${item.type === "SERVICE" ? "SAC" : "HSN"} ${item.hsn}` : "",
                item.unitPrice ? `${symbol}${item.unitPrice}` : "",
              ]
                .filter(Boolean)
                .join(" · ");

              return (
                <Button
                  key={key}
                  type="button"
                  variant="ghost"
                  role="option"
                  onClick={() => onSelect(item)}
                  className="h-auto w-full justify-start rounded-md px-2 py-1.5 text-left [&>span]:min-w-0 [&>span]:flex-1"
                >
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {item.name}
                  </span>
                  {meta && (
                    <span className="block truncate text-[11.5px] text-muted-foreground">
                      {meta}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed at the foot of the panel whenever it isn't a duplicate of the
          blue "Add "…"" row above it (zero matches + a typed query already
          offers that exact action) — same bg-card surface as the rest of the
          dropdown (not a filled grey button), so it reads as part of the
          panel's own chrome rather than a competing second CTA. */}
      {!(matches.length === 0 && query.trim()) && (
        <div className="border-t border-border p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full shadow-none"
            leftIcon={<Icon name="plus" className="h-3.5 w-3.5" />}
            onClick={() => onAddNew()}
          >
            Add new item
          </Button>
        </div>
      )}
    </PopoverContent>
  );
}
