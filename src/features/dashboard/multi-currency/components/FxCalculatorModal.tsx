"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Shimmer,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { useExchangeRates } from "@/features/dashboard/multi-currency/hooks";
import { currencySymbol, formatCurrency } from "@/lib/utils/format";
import { useAnimatedNumber } from "@/lib/hooks/useAnimatedNumber";

/**
 * The currencies the calculator quotes, and the flag each one shows. Same five
 * pg-dashboard's FxCalculatorModal offers, in the same order — every one of
 * them is a currency PayGlocal issues a local receiving account for.
 */
const QUOTE_CURRENCIES: { code: string; iso2: string }[] = [
  { code: "USD", iso2: "US" },
  { code: "EUR", iso2: "EU" },
  { code: "CAD", iso2: "CA" },
  { code: "AUD", iso2: "AU" },
  { code: "GBP", iso2: "GB" },
];

/** pg-dashboard's own defaults, so both apps open on the same quote. */
const DEFAULT_CURRENCY = "USD";
const DEFAULT_AMOUNT = "4000";

/** Matches pg-dashboard's 450ms debounce: the amount lands in the URL path, so
 *  every keystroke would otherwise be its own request. */
const AMOUNT_DEBOUNCE_MS = 450;

/**
 * Digits with at most one decimal point, and nothing else — the input is a
 * money field, not a general text box. Kept as the raw string the merchant
 * typed (rather than a re-formatted number) so a trailing "." or "1.0" doesn't
 * fight the cursor while they're still typing.
 */
function sanitizeAmount(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length ? `${whole}.${rest.join("")}` : whole;
}

/**
 * An INR figure that counts to its new value instead of being replaced.
 *
 * The API returns these as strings, so the raw value is parsed once and the
 * tween runs on the number; rounding at render keeps the digits from jittering
 * through fractional paise mid-animation.
 */
function AnimatedAmount({ value, className }: { value: string | undefined; className?: string }) {
  const parsed = value === undefined ? undefined : Number(value);
  const target = parsed === undefined || Number.isNaN(parsed) ? undefined : parsed;
  const animated = useAnimatedNumber(target);

  if (target === undefined) return <span className={className}>—</span>;
  return <span className={className}>{formatCurrency(Math.round(animated ?? target), "INR")}</span>;
}

/** A "− ₹x INR" deduction row. */
function DeductionRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <span className="text-[13px] text-muted-foreground">{label}</span>
      <span className="text-[13px] tabular-nums text-muted-foreground">
        − <AnimatedAmount value={value} />
      </span>
    </div>
  );
}

/**
 * Forex calculator — what a merchant actually receives in INR for an invoice
 * raised in a foreign currency, after PayGlocal's fee and GST.
 *
 * A modal rather than a page, matching pg-dashboard, where it opens from a
 * banner on the accounts page and from the dashboard. The arithmetic is all
 * server-side: every figure below is a field of the exchange-rates response, so
 * nothing here recomputes a fee or a rate locally.
 */
export function FxCalculatorModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  // Two pieces of state on purpose: `amountInput` is the string in the field,
  // `amount` is the debounced number the request is keyed on.
  const [amountInput, setAmountInput] = useState(DEFAULT_AMOUNT);
  const [amount, setAmount] = useState(Number(DEFAULT_AMOUNT));

  // setState here is inside a timer callback, not the effect body — the React
  // Compiler lint plugin rejects the latter (see CLAUDE.md).
  useEffect(() => {
    const id = setTimeout(() => {
      const parsed = parseFloat(amountInput);
      setAmount(Number.isNaN(parsed) ? 0 : parsed);
    }, AMOUNT_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [amountInput]);

  const { rates, isLoading, isUpdating } = useExchangeRates(currency, amount);

  // The response quotes INR per unit of foreign currency as a fraction, so the
  // headline "1 USD = x INR" is its reciprocal — the same inversion
  // pg-dashboard applies before displaying it.
  const rate = Number(rates?.fxRate);
  const displayRate =
    rates && Number.isFinite(rate) && rate > 0 ? (1 / rate).toFixed(2) : undefined;

  const selectedIso2 = QUOTE_CURRENCIES.find((c) => c.code === currency)?.iso2 ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100%,38rem)] p-6 [&>button:last-child]:top-6">
        <DialogTitle className="text-base font-semibold text-foreground">
          Forex calculator
        </DialogTitle>

        {/* Live rate pill. A dot rather than a spinner: the rate is always a
            current quote, so the marker states "this is live", it isn't a
            loading affordance. */}
        <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-muted/60 px-3 py-1.5">
          {/* The dot is the only thing that changes while re-quoting: it pulses,
              the rate beside it holds its last value. Swapping the rate for a
              placeholder on every keystroke is what made this flicker. */}
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full bg-emerald-500 transition-opacity",
              isUpdating && "motion-safe:animate-pulse"
            )}
            aria-hidden
          />
          {displayRate ? (
            <span className="text-xs tabular-nums text-foreground">
              1 {currency} = {displayRate} INR
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Fetching rate…</span>
          )}
        </div>

        {/* ── They will send ─────────────────────────────────────────────── */}
        <Card size="sm" className="mt-4 gap-0 p-4">
          <p className="text-[13px] text-muted-foreground">They will send</p>

          <div className="mt-3 flex items-center gap-3">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-[132px] shrink-0" aria-label="Invoice currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_CURRENCIES.map((option) => (
                  <SelectItem key={option.code} value={option.code}>
                    <span className="flex items-center gap-2">
                      <CountryFlag iso2={option.iso2} />
                      {option.code}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* The amount is the page's primary input, so it carries the large
                type rather than sitting at body size beside the selector. */}
            <div className="flex min-w-0 flex-1 items-baseline gap-1">
              <span className="text-2xl font-semibold text-foreground">
                {currencySymbol(currency)}
              </span>
              <Input
                inputMode="decimal"
                autoComplete="off"
                aria-label={`Amount in ${currency}`}
                value={amountInput}
                onChange={(e) => setAmountInput(sanitizeAmount(e.target.value))}
                className="min-w-0 border-0 bg-transparent px-0 text-2xl font-semibold tabular-nums shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          <p className="mt-2 text-right text-xs tabular-nums text-muted-foreground">
            In INR <AnimatedAmount value={rates?.convertedAmount} />
          </p>
        </Card>

        {/* ── Deductions ─────────────────────────────────────────────────── */}
        <div className="mt-5 space-y-2">
          <DeductionRow
            // The fee rate is quoted by the API rather than assumed, since it is
            // per-merchant pricing.
            label={`PayGlocal fee${rates ? ` (${rates.payGlocalFeeRate}%)` : ""}`}
            value={rates?.payGlocalFeeAmount}
          />
          <DeductionRow label="GST (18% of txn fee)" value={rates?.gst} />
        </div>

        <Separator className="my-5" />

        {/* ── You will receive ───────────────────────────────────────────── */}
        <div>
          <p className="text-[13px] text-muted-foreground">You will receive</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <CountryFlag iso2="IN" alt="" className="h-5 w-7" />
            {/* Shimmer only on a cold open, when there is genuinely nothing to
                animate from. Every later quote counts from the figure already on
                screen, so the merchant watches the number move instead of
                watching it disappear. */}
            {isLoading && !rates ? (
              <Shimmer className="h-9 w-40" />
            ) : (
              <AnimatedAmount
                value={rates?.settlementAmount}
                className="min-w-0 truncate text-right text-3xl font-semibold tabular-nums tracking-tight text-foreground"
              />
            )}
          </div>
        </div>

        {/* Annual saving vs banks — the calculator's actual argument, so it gets
            its own tinted strip rather than a third deduction row. */}
        <div className="mt-5 flex items-center gap-2 rounded-xl bg-primary/5 px-4 py-3">
          <Icon name="sparkles" className="h-4 w-4 shrink-0 text-primary" />
          {isLoading && !rates ? (
            <Shimmer className="h-4 w-56" />
          ) : (
            <p className="text-[13px] text-muted-foreground">
              Save{" "}
              <AnimatedAmount
                value={rates?.annualSavingsComparedToBanks}
                className="font-semibold tabular-nums text-foreground"
              />{" "}
              annually vs banks
            </p>
          )}
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">
          *The amount shown may differ from the final settled amount, which uses the exchange rate
          at the time of settlement.
        </p>

        <div className="mt-5 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
