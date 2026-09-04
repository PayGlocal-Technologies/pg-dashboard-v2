"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Callout,
  CalloutIcon,
  CalloutText,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Shimmer,
} from "@/components/ui";
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
 * The opening intro's pacing, on opening — the sequence that makes the
 * default amount read as typed rather than pre-filled, and the INR figures
 * as a reaction to it landing rather than something that just happened to
 * appear at the same time.
 *
 * `INTRO_START_DELAY_MS` matters most: the dialog panel itself is still
 * fading and scaling in for its own 200ms (see flux-ui's Dialog), so typing
 * that starts at 0ms is racing that transition — the first couple of digits
 * land before the merchant has really registered the dialog opening, which
 * is what read as "too quick" here. Waiting a beat past that transition lets
 * the typing be the first thing the eye catches.
 */
const INTRO_START_DELAY_MS = 300;
/** One character revealed per tick. Slow enough to read as keystrokes rather
 *  than a flicker, still brisk enough not to make the merchant wait. */
const TYPE_INTERVAL_MS = 130;
/** The pause between the last digit landing and the INR side reacting to it —
 *  without it, the roll-in starts on the very same frame the amount finishes,
 *  which reads as simultaneous rather than as cause and effect. */
const RESULT_REVEAL_DELAY_MS = 250;

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
 *
 * Hierarchy is deliberate top-to-bottom: pick a currency, read the live rate
 * that currency implies, then the amount field — the one thing here you can
 * actually type into, so it's the only element styled like an input rather
 * than like a number on a receipt.
 *
 * On open, the default amount types itself in rather than appearing
 * pre-filled, and every figure that depends on it — the INR conversion, the
 * fee breakdown, the settlement amount, the savings line — stays hidden until
 * that finishes, then rolls in. See `typedLength`/`showResults` below.
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
  // `amount` is the debounced number the request is keyed on. Both start at
  // the real default so the exchange-rate request fires immediately, in
  // parallel with the typing intro below rather than waiting on it.
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

  /**
   * How much of the default amount has been "typed" since the dialog opened,
   * and whether the INR side has been cleared to react to it yet.
   *
   * Both are purely cosmetic: `amountInput` above already holds the real
   * value the whole time, so the exchange rate is never blocked on either —
   * the intro is scheduled entirely on its own timeline, in parallel with
   * whatever the network is doing. `resultsRevealed` also gates whether the
   * field is still read-only, so the merchant can't start editing mid-reveal
   * and end up watching the old amount's figures roll in after the new one.
   *
   * Every `setState` call below runs inside a `setTimeout` callback, never in
   * the effect body itself, per the same rule the debounce above follows.
   */
  const [typedLength, setTypedLength] = useState(0);
  const [resultsRevealed, setResultsRevealed] = useState(false);
  const introDone = typedLength >= DEFAULT_AMOUNT.length;

  useEffect(() => {
    if (!open) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      const id = setTimeout(() => {
        setTypedLength(DEFAULT_AMOUNT.length);
        setResultsRevealed(true);
      }, 0);
      return () => clearTimeout(id);
    }

    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Reset first, immediately: this component doesn't unmount between opens,
    // so without this a reopen would start from whatever finished state the
    // last visit left behind.
    timeouts.push(
      setTimeout(() => {
        if (!cancelled) {
          setTypedLength(0);
          setResultsRevealed(false);
        }
      }, 0)
    );

    // Then one tick per character, starting only once the dialog's own open
    // transition has had time to settle (see INTRO_START_DELAY_MS above).
    for (let i = 1; i <= DEFAULT_AMOUNT.length; i++) {
      timeouts.push(
        setTimeout(
          () => {
            if (!cancelled) setTypedLength(i);
          },
          INTRO_START_DELAY_MS + (i - 1) * TYPE_INTERVAL_MS
        )
      );
    }

    // And a beat after the last digit lands, the INR side unlocks.
    const typingEndsAt = INTRO_START_DELAY_MS + (DEFAULT_AMOUNT.length - 1) * TYPE_INTERVAL_MS;
    timeouts.push(
      setTimeout(() => {
        if (!cancelled) setResultsRevealed(true);
      }, typingEndsAt + RESULT_REVEAL_DELAY_MS)
    );

    return () => {
      cancelled = true;
      timeouts.forEach(clearTimeout);
    };
  }, [open]);

  const displayAmount = introDone ? amountInput : DEFAULT_AMOUNT.slice(0, typedLength);

  const { rates, isLoading, isUpdating } = useExchangeRates(currency, amount);
  // Every figure downstream of the amount stays hidden until the intro's
  // reveal beat, so the INR side reads as a reaction to the amount landing
  // rather than appearing before it, or in the same instant as it.
  const showResults = resultsRevealed;

  // The response quotes INR per unit of foreign currency as a fraction, so the
  // headline "1 USD = x INR" is its reciprocal — the same inversion
  // pg-dashboard applies before displaying it.
  const rate = Number(rates?.fxRate);
  const displayRate =
    rates && Number.isFinite(rate) && rate > 0 ? (1 / rate).toFixed(2) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(100%,26rem)] bg-linear-to-b from-primary/7 via-card to-card p-6 [&>button:last-child]:top-6">
        <DialogTitle className="text-base font-semibold text-foreground">
          Forex calculator
        </DialogTitle>

        {/* ── Currency, rate, amount — one card, in that order, so the merchant
            reads it as "pick a currency → here's the rate → type an amount"
            instead of hunting for what's editable. ─────────────────────── */}
        <Card size="sm" className="mt-4 gap-0 border-primary/10 bg-card/70 p-4 shadow-sm">
          <p className="text-[13px] font-medium text-foreground">They will send</p>

          <div className="mt-2.5 flex items-center gap-2.5">
            <Select value={currency} onValueChange={setCurrency} disabled={!resultsRevealed}>
              <SelectTrigger
                className="h-9 min-h-0 w-28 shrink-0 gap-1.5 px-3 text-[13px]"
                aria-label="Invoice currency"
              >
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

            {/* Live rate — helper text, not a competing headline: it explains
                what the currency choice means before the amount field asks for
                a number. */}
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full bg-emerald-500 transition-opacity",
                  isUpdating && "motion-safe:animate-pulse"
                )}
                aria-hidden
              />
              {displayRate ? (
                <span className="truncate tabular-nums">
                  1 {currency} = {displayRate} INR
                </span>
              ) : (
                <span className="truncate">Fetching rate…</span>
              )}
            </span>
          </div>

          {/* The amount — the only field here a merchant types into, so it's
              the only element that looks like one: bordered, tall, with a
              focus ring, rather than borderless text sitting next to the
              currency dropdown. */}
          <InputGroup className="mt-3 h-14 border-primary/20 bg-background transition-colors focus-within:border-primary/50">
            <InputGroupAddon className="pl-4 text-2xl leading-none font-semibold text-foreground">
              {currencySymbol(currency)}
            </InputGroupAddon>
            <InputGroupInput
              inputMode="decimal"
              autoComplete="off"
              aria-label={`Amount in ${currency}`}
              // Read-only for the whole intro, typing and reveal beat alike:
              // the digits are revealed by `displayAmount`, not typed by the
              // merchant, and editing mid-reveal would leave the INR side
              // rolling in for an amount that's no longer on screen.
              readOnly={!resultsRevealed}
              value={displayAmount}
              onChange={(e) => setAmountInput(sanitizeAmount(e.target.value))}
              className="h-full min-h-0 px-0 pr-4 text-2xl leading-none font-semibold tabular-nums"
            />
          </InputGroup>

          <p className="mt-2 text-right text-xs tabular-nums text-muted-foreground">
            In INR <AnimatedAmount value={showResults ? rates?.convertedAmount : undefined} />
          </p>
        </Card>

        {/* ── Deductions ─────────────────────────────────────────────────── */}
        <div className="mt-4 space-y-2 rounded-xl bg-muted/40 px-4 py-3">
          <DeductionRow
            // The fee rate is quoted by the API rather than assumed, since it is
            // per-merchant pricing.
            label={`PayGlocal fee${rates ? ` (${rates.payGlocalFeeRate}%)` : ""}`}
            value={showResults ? rates?.payGlocalFeeAmount : undefined}
          />
          <DeductionRow
            label="GST (18% of txn fee)"
            value={showResults ? rates?.gst : undefined}
          />
        </div>

        <Separator className="my-5" />

        {/* ── You will receive ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-primary/10 bg-linear-to-br from-primary/8 to-transparent p-4">
          <p className="text-[13px] text-muted-foreground">You will receive</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <CountryFlag iso2="IN" alt="" className="h-5 w-7" />
            {/* `AnimatedAmount` stays mounted the whole time — swapping it in
                only once the figure is already known (as this used to) means
                `useAnimatedNumber` never sees an undefined→number transition
                to tween: it mounts with the target already resolved and just
                snaps to it. Feeding it `undefined` up front and a real number
                once revealed is what makes it actually count up instead.
                Shimmer sits on top as a plain visual overlay for "nothing to
                show yet", covering both the typing intro and a cold fetch. */}
            <div className="relative min-h-9 min-w-0 flex-1">
              <AnimatedAmount
                value={showResults && !(isLoading && !rates) ? rates?.settlementAmount : undefined}
                className={cn(
                  "block truncate text-right text-3xl font-semibold tabular-nums tracking-tight text-foreground transition-opacity",
                  (!showResults || (isLoading && !rates)) && "opacity-0"
                )}
              />
              {(!showResults || (isLoading && !rates)) && (
                <Shimmer className="absolute inset-y-0 right-0 h-9 w-40" />
              )}
            </div>
          </div>
        </div>

        {/* Annual saving vs banks — the calculator's actual argument, so it
            gets its own callout rather than a third deduction row. */}
        <Callout variant="discovery" className="mt-4 items-center py-3">
          <CalloutIcon variant="discovery" className="mt-0" />
          {!showResults || (isLoading && !rates) ? (
            <Shimmer className="h-4 w-56" />
          ) : (
            <CalloutText className="mt-0 text-[13px]">
              Save{" "}
              <AnimatedAmount
                value={rates?.annualSavingsComparedToBanks}
                className="font-semibold tabular-nums"
              />{" "}
              annually vs banks
            </CalloutText>
          )}
        </Callout>

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
