"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { useApp } from "@/stores/useApp";
import { cn } from "@/lib/utils";

/**
 * The flag to show for a currency, as an ISO2 country code.
 *
 * ISO 4217 codes lead with their country's ISO 3166 alpha-2 code (INR → IN,
 * CAD → CA, USD → US), so that prefix is tried against the static country
 * map first, which is also what confirms it is a real country. EUR is the
 * common exception and gets the EU flag. Anything else falls back to the
 * first country the map lists for the currency.
 */
function currencyFlagIso2(
  currency: string,
  countryCurrencyMap: { currencyCode: string; iso2CountryCode: string }[]
): string {
  const code = currency.toUpperCase();
  if (code === "EUR") return "EU";
  const prefix = code.slice(0, 2);
  const byPrefix = countryCurrencyMap.find(
    (entry) => entry.currencyCode === code && entry.iso2CountryCode.toUpperCase() === prefix
  );
  if (byPrefix) return byPrefix.iso2CountryCode;
  return countryCurrencyMap.find((entry) => entry.currencyCode === code)?.iso2CountryCode ?? prefix;
}

function CurrencyOption({ currency, iso2 }: { currency: string; iso2: string }) {
  return (
    <span className="flex items-center gap-2">
      {/* alt="" — the code beside it already names the currency. */}
      <CountryFlag iso2={iso2} alt="" />
      <span className="font-semibold">{currency}</span>
    </span>
  );
}

/**
 * Currency + amount as one field, the flux CurrencyAmountInput arrangement
 * (currency segment, divider, amount), rebuilt from InputGroup + Select so the
 * currency can carry its flag: CurrencyAmountInput's picker is a native
 * <select>, which cannot draw an image. Flags are the same CountryFlag the MCA
 * transactions table's Country column renders.
 */
export function CurrencyValueField({
  id,
  currency,
  amount,
  currencies,
  onCurrencyChange,
  onAmountChange,
  disabled,
  placeholder,
  invalid,
}: {
  id?: string;
  currency: string;
  amount: string;
  currencies: string[];
  onCurrencyChange: (currency: string) => void;
  onAmountChange: (amount: string) => void;
  /** Locks the amount only; the currency stays pickable, since it still
   *  decides what a customer-decided amount is paid in. */
  disabled?: boolean;
  placeholder?: string;
  invalid?: boolean;
}) {
  const countryCurrencyMap = useApp((s) => s.countryCurrencyMap);

  return (
    <InputGroup className={cn("h-11", disabled && "bg-muted/40")} aria-invalid={invalid}>
      <InputGroupAddon align="inline-start" className="border-r border-border pl-1 pr-0">
        <Select value={currency} onValueChange={onCurrencyChange}>
          <SelectTrigger
            aria-label="Currency"
            className="h-9 min-h-0 w-auto gap-1.5 border-0 bg-transparent px-2.5 shadow-none focus-visible:ring-0"
          >
            <SelectValue>
              <CurrencyOption
                currency={currency}
                iso2={currencyFlagIso2(currency, countryCurrencyMap)}
              />
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {currencies.map((code) => (
              <SelectItem key={code} value={code}>
                <CurrencyOption currency={code} iso2={currencyFlagIso2(code, countryCurrencyMap)} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => onAmountChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={invalid}
        className="tabular-nums"
      />
    </InputGroup>
  );
}
