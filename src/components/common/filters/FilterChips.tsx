"use client";

import { useMemo } from "react";
import {
  DateRangeFilterChip,
  FilterChipGroup,
  MonthRangeFilterChip as FluxMonthRangeFilterChip,
  NumberRangeFilterChip,
  SelectFilterChip,
  type FilterChipOption as FluxFilterChipOption,
  type RelativeRangeValue,
} from "@/components/ui";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { Icon } from "@/components/icon";

/**
 * The app's filter chips.
 *
 * Every chip below is flux's, adapted at the boundary rather than rebuilt. What
 * used to live here was nine bespoke chips — 1375 lines — that assembled the
 * same popover, the same staged draft and the same Apply/Clear as flux already
 * had, and only borrowed its shell and trigger. That duplication is what let
 * the two apps drift: none of these chips ever passed `count`, so no filter in
 * this app showed how many options were chosen while pg-internal-v2's did, and
 * none of them wired `onCloseAutoFocus`, so clicking from one open chip to the
 * next made the second flash and vanish here long after it was fixed there.
 *
 * What is left is only what flux cannot know: which glyph belongs beside a
 * country, and what this app calls its `{ min, max }` amount value. Both are
 * translations, not behaviour.
 */

// ── Shared types (kept at this path, since every feature imports them here) ──

export interface FilterChipOption {
  value: string;
  label: string;
}

export interface CountryFilterOption {
  /** Whatever the caller keys its rows by — an ISO2 code in every current
   *  call site, which is why `iso2` below defaults to it. */
  value: string;
  label: string;
  /** ISO2 for the flag beside the label, when it differs from `value`.
   *  Falling back to `value` keeps the common case a two-field option. */
  iso2?: string;
}

export interface CurrencyOption {
  value: string;
  label: string;
  /** ISO2 for the flag beside the label. Absent for "Rest of the World",
   *  which shows a globe glyph instead of a country flag. */
  iso2?: string;
}

/** This app's amount range. flux's own is `{ min, max }` too, so this is a
 *  name, not a shape — kept because every call site already spells it. */
export interface AmountRangeValue {
  min: string;
  max: string;
}

export interface DateRangeValue {
  from: string;
  to: string;
}

// ── Re-exports: the chips and helpers that need no adapting at all ───────────

export {
  FilterChipShell,
  FilterChipClearButton,
  FilterChipLabelTrigger,
  FilterChipGroup,
  FilterChipActions,
  FilterChip,
  FilterToolbar,
  useFilterChipState,
  AddFilterMenu,
  SelectFilterChip,
  SingleSelectFilterChip,
  TextFilterChip,
  DateRangeFilterChip,
  NumberRangeFilterChip,
  // "Last N weeks/days/hours/minutes" — the relative half of DateFilterChip.
  EMPTY_RELATIVE_RANGE,
  hasRelativeRange,
} from "@/components/ui";

export type { AddFilterDefinition, FilterChipControl, MonthRange } from "@/components/ui";
export type { RelativeRangeValue };

/**
 * Resolves a relative range to absolute epoch millis.
 *
 * Kept under this app's older name; flux calls it `relativeRangeToMillis`. It
 * is evaluated at call time on purpose — "last 2 days" means two days before
 * *now*, and now moves — so never call it during render.
 */
export { relativeRangeToMillis as relativeRangeToEpochMs } from "@/components/ui";

// yyyy-mm-dd (a native date input's value) → start/end-of-day epoch ms, which
// is what the OpenSearch request bodies' startTime/endTime already expect.
export function toStartOfDayMs(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getTime();
}
export function toEndOfDayMs(dateStr: string): number {
  return new Date(`${dateStr}T23:59:59.999`).getTime();
}

// ── Adapters ─────────────────────────────────────────────────────────────────

/**
 * Date range, with this app's "Last N weeks/days/hours/minutes" tab.
 *
 * The two modes are exclusive: applying one clears the other, so a request is
 * never built from both an absolute window and a relative one.
 */
export function DateFilterChip({
  value,
  onChange,
  relativeValue,
  onRelativeChange,
  label = "Date",
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  relativeValue?: RelativeRangeValue;
  onRelativeChange?: (next: RelativeRangeValue) => void;
  label?: string;
}) {
  return (
    <DateRangeFilterChip
      chipKey={label}
      label={label}
      value={value}
      onChange={onChange}
      relativeValue={relativeValue}
      onRelativeChange={onRelativeChange}
      align="end"
    />
  );
}

/** Amount range. `prefix` is flux's currency adornment; `hint` its help line. */
export function AmountFilterChip({
  value,
  onChange,
  hint,
  label = "Amount",
}: {
  value: AmountRangeValue;
  onChange: (next: AmountRangeValue) => void;
  hint?: string;
  label?: string;
}) {
  return (
    <NumberRangeFilterChip
      chipKey={label}
      label={label}
      value={value}
      onChange={onChange}
      hint={hint}
      align="end"
    />
  );
}

/**
 * Multi-select over a plain option list.
 *
 * flux's chip with this app's default label. Kept under its own name rather
 * than find-and-replaced across every toolbar, because the name says what the
 * filter IS at each call site.
 */
export function StatusFilterChip({
  options,
  selected,
  onChange,
  label = "Status",
}: {
  options: FilterChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  return (
    <SelectFilterChip
      chipKey={label}
      label={label}
      options={options}
      selected={selected}
      onChange={onChange}
      align="end"
    />
  );
}

/** The ISO2 to flag an option by: its own, or its value when that is already a
 *  code. Undefined when neither is, which is what suppresses the flag. */
function countryOptionIso2(option: CountryFilterOption): string | undefined {
  if (option.iso2) return option.iso2;
  return /^[A-Za-z]{2}$/.test(option.value.trim()) ? option.value : undefined;
}

/** Countries, each with its flag. */
export function CountryFilterChip({
  options,
  value,
  onChange,
  label = "Country",
}: {
  options: CountryFilterOption[];
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const withFlags = useMemo<FluxFilterChipOption[]>(
    () =>
      options.map((option) => {
        const iso2 = countryOptionIso2(option);
        return {
          value: option.value,
          label: option.label,
          icon: iso2 ? <CountryFlag iso2={iso2} /> : undefined,
        };
      }),
    [options]
  );

  return (
    <SelectFilterChip
      chipKey={label}
      label={label}
      options={withFlags}
      selected={value}
      onChange={onChange}
      align="end"
    />
  );
}

/** Currencies, each with its country's flag — or a globe for Rest of the World. */
export function CurrencyFilterChip({
  options,
  value,
  onChange,
  label = "Currency",
}: {
  options: CurrencyOption[];
  value: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const withFlags = useMemo<FluxFilterChipOption[]>(
    () =>
      options.map((option) => ({
        value: option.value,
        label: option.label,
        icon: option.iso2 ? (
          <CountryFlag iso2={option.iso2} />
        ) : (
          <Icon name="globe" className="h-3.5 w-5 shrink-0 text-muted-foreground" />
        ),
      })),
    [options]
  );

  return (
    <SelectFilterChip
      chipKey={label}
      label={label}
      options={withFlags}
      selected={value}
      onChange={onChange}
      align="end"
    />
  );
}

/** A start/end month pair on a year grid. flux's, unchanged. */
export const MonthRangeFilterChip = FluxMonthRangeFilterChip;

// Date, Status and Currency as one unit — the three filters pg-dashboard's
// MCA table offers, and no others. Each owns the "which popover is open" state
// itself rather than taking it as a prop.
//
// That ownership is the point. A table that renders this row twice — once in
// its desktop control bar and once in its narrow-viewport one, with CSS
// deciding which is visible — has both copies mounted at all times. Lifting
// `openChip` above them would make a click on the visible chip also open its
// display:none twin, and a Radix popover anchored to a hidden trigger never
// positions: it stays translated off-screen while still stacking above the
// real one and competing for focus, so the visible popover appeared to do
// nothing at all. Each instance holding its own state means the hidden copy
// simply never opens.
export function FilterChipsRow({
  dateRange,
  onDateRangeChange,
  relativeDateRange,
  onRelativeDateRangeChange,
  statusOptions,
  statusFilters,
  onStatusFiltersChange,
  currencyOptions,
  currencyFilters,
  onCurrencyFiltersChange,
}: {
  dateRange: DateRangeValue;
  onDateRangeChange: (next: DateRangeValue) => void;
  relativeDateRange?: RelativeRangeValue;
  onRelativeDateRangeChange?: (next: RelativeRangeValue) => void;
  statusOptions: FilterChipOption[];
  statusFilters: string[];
  onStatusFiltersChange: (next: string[]) => void;
  currencyOptions: CurrencyOption[];
  currencyFilters: string[];
  onCurrencyFiltersChange: (next: string[]) => void;
}) {
  return (
    // `contents` so the group adds no box of its own — the chips stay direct
    // children of the toolbar row that renders this.
    <FilterChipGroup className="contents">
      <DateFilterChip
        value={dateRange}
        onChange={onDateRangeChange}
        relativeValue={relativeDateRange}
        onRelativeChange={onRelativeDateRangeChange}
      />
      <StatusFilterChip
        options={statusOptions}
        selected={statusFilters}
        onChange={onStatusFiltersChange}
      />
      <CurrencyFilterChip
        options={currencyOptions}
        value={currencyFilters}
        onChange={onCurrencyFiltersChange}
      />
    </FilterChipGroup>
  );
}
