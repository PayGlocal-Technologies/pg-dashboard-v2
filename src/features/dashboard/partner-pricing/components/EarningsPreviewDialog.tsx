"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldLabel,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  formatInr,
  formatRate,
  GST_RATE,
  marginFor,
  parseFee,
  PRICING_CATEGORIES,
  PRICING_PRODUCTS,
  splitPayment,
} from "@/features/dashboard/partner-pricing/pricing";

const PRESETS = [100, 500, 1000, 5000, 10000];

function SplitRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-[13px] tabular-nums text-foreground",
          strong ? "font-semibold" : "font-medium"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Earnings preview: a focused, temporary calculation over the page's live
 * fees. Pick a product and an amount; see what the partner earns, why, and
 * how the payment divides. Everything is derived from the same pricing.ts the
 * table uses, so an edit in the table shows here the next time it opens.
 */
export function EarningsPreviewDialog({
  open,
  onOpenChange,
  fees,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fees: Record<string, string>;
}) {
  const [productId, setProductId] = useState(PRICING_PRODUCTS[0]!.id);
  const [amountText, setAmountText] = useState("10000");
  const [showHow, setShowHow] = useState(false);

  const product = PRICING_PRODUCTS.find((p) => p.id === productId) ?? PRICING_PRODUCTS[0]!;
  const fee = parseFee(fees[product.id] ?? "");
  const { state } = marginFor(product, fees[product.id] ?? "");
  const amount = Number(amountText.replace(/,/g, ""));
  const amountValid = amountText.trim() !== "" && Number.isFinite(amount) && amount > 0;
  const split = fee !== null && amountValid ? splitPayment(amount, product, fee) : null;

  const rate = `${formatRate(product.payglocalRate)}%`;
  const message =
    fee === null
      ? `Set your merchant fee for ${product.name} in the table to see what you earn.`
      : !amountValid
        ? "Enter a payment amount."
        : state === "positive"
          ? `You earn ${formatInr(split!.youGet)} on this payment.`
          : state === "zero"
            ? `Your fee matches PayGlocal's rate of ${rate}, so there is no margin for you. Set a higher fee in the table to earn.`
            : `Your fee is below PayGlocal's rate of ${rate}, so you won't earn a margin on this payment.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-[min(100%-1.5rem,28rem)] flex-col gap-0 overflow-hidden p-0">
        <div className="px-6 pt-6 pb-4">
          <DialogTitle>Earnings preview</DialogTitle>
          <DialogDescription>See how your pricing affects a merchant payment.</DialogDescription>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-2">
          <Field>
            <FieldLabel htmlFor="preview-product">Product</FieldLabel>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id="preview-product" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRICING_CATEGORIES.map((c) => (
                  <SelectGroup key={c.id}>
                    <SelectLabel>{c.name}</SelectLabel>
                    {PRICING_PRODUCTS.filter((p) => p.category === c.id).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="preview-amount">Payment amount</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>₹</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="preview-amount"
                inputMode="decimal"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/[^\d.]/g, ""))}
                aria-invalid={!amountValid || undefined}
              />
            </InputGroup>
            <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Quick amounts">
              {PRESETS.map((preset) => {
                const selected = amountValid && amount === preset;
                return (
                  <Button
                    key={preset}
                    type="button"
                    variant={selected ? "primary" : "outline"}
                    size="sm"
                    aria-pressed={selected}
                    onClick={() => setAmountText(String(preset))}
                    className="h-7 min-h-0 rounded-full px-3 text-xs tabular-nums"
                  >
                    {formatInr(preset)}
                  </Button>
                );
              })}
            </div>
          </Field>

          <Separator />

          <div aria-live="polite">
            <p className="text-xs text-muted-foreground">You earn</p>
            <p className="mt-0.5 text-3xl font-bold tracking-tight tabular-nums text-foreground">
              {formatInr(split?.youGet ?? 0)}
            </p>
            <p
              className={cn(
                "mt-1.5 text-[13px] leading-relaxed",
                state === "below" ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"
              )}
            >
              {message}
            </p>
          </div>

          {split && (
            <>
              <Separator />
              <div>
                <SplitRow label="Merchant gets" value={formatInr(split.merchantGets)} strong />
                <SplitRow label="You get" value={formatInr(split.youGet)} />
                <SplitRow label="PayGlocal gets" value={formatInr(split.payglocalGets)} />
              </div>

              <div>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  aria-expanded={showHow}
                  aria-controls="preview-how"
                  onClick={() => setShowHow((o) => !o)}
                  className="h-auto min-h-0 gap-1 p-0 text-[12.5px] [&>span]:flex [&>span]:items-center [&>span]:gap-1"
                >
                  How is this calculated?
                  <Icon
                    name="chevron-down"
                    size={13}
                    aria-hidden
                    className={cn("transition-transform duration-150", showHow && "rotate-180")}
                  />
                </Button>
                {showHow && (
                  <div
                    id="preview-how"
                    className="mt-2 space-y-1.5 rounded-lg border border-border bg-muted/40 px-3.5 py-3 text-[12.5px] leading-relaxed text-muted-foreground animate-in fade-in duration-150"
                  >
                    <p>
                      <span className="font-medium text-foreground">Merchant fee</span> ={" "}
                      {formatRate(fee!)}% of {formatInr(amount)} = {formatInr(split.feeAmount)},
                      plus {GST_RATE}% GST on it ({formatInr(split.gstAmount)}).
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Merchant gets</span> = the
                      payment minus the fee and GST.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">You get</span> = your fee minus
                      PayGlocal&apos;s rate of {rate}, on the payment amount. Nothing when your fee
                      isn&apos;t above that rate.
                    </p>
                    <p>
                      <span className="font-medium text-foreground">PayGlocal gets</span> = the rest
                      of the fee, plus the GST.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-6 py-4">
          <Button type="button" variant="primary" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
