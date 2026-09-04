"use client";

import { forwardRef, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  IconButton,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { MONTH_SHORT_LABELS, formatMonthLabel } from "@/lib/utils/format";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";

// The Date/Amount/Status/Currency filter toolbar shared by every table that
// filters the same four axes (MCA Transactions, MCA Links). It lives here
// rather than inside one of those features so both render literally the same
// chips — same shell, same popovers, same Apply/Clear semantics — instead of
// two copies that drift apart.

export interface FilterChipOption {
  value: string;
  label: string;
}

// Every filter chip is built from three pieces below: a visual shell (the
// dashed pill), a label trigger that opens the popover, and, only once the
// filter has a value, a separate clear button to its left. They're two
// independent <button>s sitting side by side inside the shell rather than one
// button whose leading icon doubles as a clear action, because clicking ×
// must clear without opening the popover, and a real <button> can't nest
// inside another <button>. Keeping them siblings means stopping the clear
// click from also opening the popover needs no stopPropagation gymnastics:
// they're just two separate click targets.

// The pill itself. Purely structural, no click handler, no interactive
// semantics of its own, so it's a plain div rather than a flux-ui component;
// the actual clicking happens in the two children it wraps.
//
// Inactive it's a dashed outline in the muted border colour, reading as an
// "add a filter" affordance. Active it flips to a solid primary ring with a
// primary-tinted fill (not just a faint border tint) so an applied filter is
// unmistakable at a glance rather than a subtle recolour of the same dashed
// outline — the label text and state dot inside shift to primary alongside it.
export function FilterChipShell({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "inline-flex h-auto shrink-0 items-center rounded-full border border-dashed border-border bg-card shadow-sm",
        active && "border-solid border-primary bg-primary/10 shadow-none ring-1 ring-primary/30"
      )}
    >
      {children}
    </div>
  );
}

// Leading × segment, rendered only when the filter is active. A real Button
// (not IconButton) so its height overrides via h-auto/min-h-0 behave the
// same way the label trigger's already do: IconButton's size classes use
// Tailwind's `size-*` utility, which doesn't reliably get overridden by a
// plain `h-auto`/`w-auto` the way Button's `h-9` does.
export function FilterChipClearButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`Clear ${label} filter`}
      onClick={onClick}
      className="h-auto min-h-0 shrink-0 rounded-full border border-transparent px-2 py-1 text-primary/70 hover:text-primary"
    >
      <Icon name="x" className="h-3 w-3" />
    </Button>
  );
}

// Trailing label segment: this is the actual PopoverTrigger target (see each
// filter chip below). Shows a leading plus only while inactive, since once
// active the separate clear button to its left already carries that leading
// icon; a trailing dot then marks "active" instead of the numeric badge this
// used to show, deliberately not a count, just on/off.
//
// Must forwardRef and spread the rest of its props onto the underlying
// Button: PopoverTrigger's asChild clones its single child to inject
// onClick/ref/aria-* (so the trigger is wired up and the popover anchors to
// it). Without forwarding those through, this component silently swallowed
// them, so the chip rendered but clicking did nothing: the click handler
// Radix attached never reached a real DOM node.
export const FilterChipLabelTrigger = forwardRef<
  HTMLButtonElement,
  { label: string; active: boolean } & Omit<ComponentPropsWithoutRef<typeof Button>, "children">
>(({ label, active, className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="sm"
      leftIcon={
        !active ? (
          <span className="flex h-3.5 w-3.5 items-center justify-center">
            <Icon name="plus" className="h-3 w-3" />
          </span>
        ) : undefined
      }
      rightIcon={
        active ? (
          <span className="flex h-3.5 w-3.5 items-center justify-center">
            {/* Drawn the way Flux's own Badge draws its dot: same size-1.5
                rounded-full fill, in the primary accent. Purely a state
                marker, not a count. */}
            <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          </span>
        ) : undefined
      }
      className={cn(
        "h-auto min-h-0 shrink-0 rounded-full border border-transparent py-1",
        active
          ? "pl-1.5 pr-2.5 font-semibold text-primary hover:text-primary"
          : "pl-2.5 pr-2.5 text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      {label}
    </Button>
  );
});
FilterChipLabelTrigger.displayName = "FilterChipLabelTrigger";

export interface DateRangeValue {
  from: string;
  to: string;
}

/** "Last N weeks/days/hours/minutes", counted back from now. Mirrors
 *  pg-dashboard's linearRange date filter, which its request builder turns
 *  into a startTime/endTime pair at apply time. */
export interface RelativeRangeValue {
  weeks: string;
  days: string;
  hours: string;
  minutes: string;
}

export const EMPTY_RELATIVE_RANGE: RelativeRangeValue = {
  weeks: "",
  days: "",
  hours: "",
  minutes: "",
};

const RELATIVE_UNITS: { key: keyof RelativeRangeValue; label: string; seconds: number }[] = [
  { key: "weeks", label: "Weeks", seconds: 7 * 24 * 60 * 60 },
  { key: "days", label: "Days", seconds: 24 * 60 * 60 },
  { key: "hours", label: "Hours", seconds: 60 * 60 },
  { key: "minutes", label: "Minutes", seconds: 60 },
];

function relativeRangeSeconds(value: RelativeRangeValue): number {
  return RELATIVE_UNITS.reduce((total, unit) => {
    const parsed = parseInt(value[unit.key] || "0", 10);
    return total + (Number.isNaN(parsed) ? 0 : parsed) * unit.seconds;
  }, 0);
}

export function hasRelativeRange(value: RelativeRangeValue | undefined): boolean {
  return !!value && relativeRangeSeconds(value) > 0;
}

/**
 * Resolves a relative range to absolute epoch millis, evaluated at call time.
 * Deliberately not memoised or computed during render: "last 2 days" means
 * two days before *now*, and now moves.
 */
export function relativeRangeToEpochMs(
  value: RelativeRangeValue
): { startTime: number; endTime: number } | null {
  const seconds = relativeRangeSeconds(value);
  if (seconds <= 0) return null;
  const endTime = Date.now();
  return { startTime: endTime - seconds * 1000, endTime };
}

// yyyy-mm-dd (native <input type="date"> value) → start/end-of-day epoch ms,
// what the OpenSearch request bodies' startTime/endTime already expect.
export function toStartOfDayMs(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00`).getTime();
}
export function toEndOfDayMs(dateStr: string): number {
  return new Date(`${dateStr}T23:59:59.999`).getTime();
}

// Edits are staged in local `draft` state and only committed to `value` (the
// query-affecting state in the parent) via Apply, per the "apply only after
// confirmation" requirement. Status is the exception: its checkboxes still
// filter immediately, matching the existing filtering model there.
//
// `open`/`onOpenChange` are lifted to the parent (rather than local state)
// so only one of Date/Amount/Status/Currency can be open at a time: see each
// table's own openChip state, which every chip below shares.
export function DateFilterChip({
  value,
  onChange,
  relativeValue = EMPTY_RELATIVE_RANGE,
  onRelativeChange,
  open,
  onOpenChange,
  label = "Date",
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  /** Omit both relative props to keep this an absolute-range-only chip. */
  relativeValue?: RelativeRangeValue;
  onRelativeChange?: (next: RelativeRangeValue) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the date being filtered on is called on this table, e.g. "Creation
   *  date" on Client Management. Only the chip's wording changes; the range
   *  picker and its Apply/Clear semantics are identical everywhere. */
  label?: string;
}) {
  const supportsRelative = !!onRelativeChange;
  const [draft, setDraft] = useState<DateRangeValue>(value);
  const [relativeDraft, setRelativeDraft] = useState<RelativeRangeValue>(relativeValue);
  const [mode, setMode] = useState<"absolute" | "relative">(
    hasRelativeRange(relativeValue) ? "relative" : "absolute"
  );

  const isActive = !!(value.from && value.to) || hasRelativeRange(relativeValue);
  const isPartial = !!draft.from !== !!draft.to;

  // The two modes are mutually exclusive — applying one clears the other, so
  // the request never carries a start/end pair from both sources at once.
  const clear = () => {
    onChange({ from: "", to: "" });
    onRelativeChange?.(EMPTY_RELATIVE_RANGE);
    setDraft({ from: "", to: "" });
    setRelativeDraft(EMPTY_RELATIVE_RANGE);
    onOpenChange(false);
  };

  const apply = () => {
    if (mode === "relative") {
      onChange({ from: "", to: "" });
      onRelativeChange?.(relativeDraft);
    } else {
      onRelativeChange?.(EMPTY_RELATIVE_RANGE);
      onChange(draft);
    }
    onOpenChange(false);
  };

  const canApply = mode === "relative" ? hasRelativeRange(relativeDraft) : !isPartial;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // Re-seed both drafts from the last applied values every time the
        // popover opens, so a discarded in-progress edit never leaks in.
        if (next) {
          setDraft(value);
          setRelativeDraft(relativeValue);
          setMode(hasRelativeRange(relativeValue) ? "relative" : "absolute");
        }
      }}
    >
      <FilterChipShell active={isActive}>
        {isActive && <FilterChipClearButton label={label} onClick={clear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label={label} active={isActive} />
        </PopoverTrigger>
      </FilterChipShell>
      <PopoverContent align="end" className="w-72 space-y-3 p-3">
        {supportsRelative && (
          <Tabs value={mode} onValueChange={(v) => setMode(v as "absolute" | "relative")}>
            <TabsList className="w-full">
              <TabsTrigger value="absolute" className="flex-1">
                Date range
              </TabsTrigger>
              <TabsTrigger value="relative" className="flex-1">
                Last…
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {mode === "absolute" || !supportsRelative ? (
          <>
            {/* Flux's DatePicker is a single-date field (there's no dedicated
                Flux date-*range* component), a From/To pair of them is the
                closest real reuse of it rather than a bespoke range widget.
                Each manages its own calendar popup/portal independently. */}
            <DatePicker
              label="From"
              value={draft.from}
              onChange={(v) => setDraft((d) => ({ ...d, from: v }))}
              placeholder="Select start date"
            />
            <DatePicker
              label="To"
              value={draft.to}
              onChange={(v) => setDraft((d) => ({ ...d, to: v }))}
              min={draft.from || undefined}
              placeholder="Select end date"
            />
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {RELATIVE_UNITS.map((unit) => (
              <div key={unit.key} className="space-y-1.5">
                <label
                  className="text-[11px] font-medium text-muted-foreground"
                  htmlFor={`date-relative-${unit.key}`}
                >
                  {unit.label}
                </label>
                <Input
                  id={`date-relative-${unit.key}`}
                  type="number"
                  min={0}
                  inputMode="numeric"
                  placeholder="0"
                  value={relativeDraft[unit.key]}
                  onChange={(e) =>
                    setRelativeDraft((prev) => ({ ...prev, [unit.key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="x" className="w-3 h-3" />}
            onClick={clear}
            disabled={!draft.from && !draft.to && !hasRelativeRange(relativeDraft)}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          <Button type="button" variant="primary" size="sm" disabled={!canApply} onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface AmountRangeValue {
  min: string;
  max: string;
}

// Filters only the rows already fetched for the current page: there's no
// amount-range query parameter in TableReqBody today (see
// buildRequestBody.ts), so this can't narrow the server-side result set or
// totalCount the way the Date/Status filters do. Flagged here rather than
// guessing an unsupported API field; revisit once a real range-query param
// exists. Same staged draft + Apply pattern as DateFilterChip above, and the
// same lifted open/onOpenChange so only one filter chip is open at a time.
export function AmountFilterChip({
  value,
  onChange,
  open,
  onOpenChange,
  idPrefix = "amount",
  hint = "Applies to the records currently loaded.",
}: {
  value: AmountRangeValue;
  onChange: (next: AmountRangeValue) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Disambiguates the two inputs' ids when more than one of these renders. */
  idPrefix?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState<AmountRangeValue>(value);
  const isActive = !!(value.min || value.max);

  const clear = () => {
    onChange({ min: "", max: "" });
    setDraft({ min: "", max: "" });
    onOpenChange(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setDraft(value);
      }}
    >
      <FilterChipShell active={isActive}>
        {isActive && <FilterChipClearButton label="Amount" onClick={clear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label="Amount" active={isActive} />
        </PopoverTrigger>
      </FilterChipShell>
      <PopoverContent align="end" className="w-64 space-y-3 p-3">
        <div className="space-y-1.5">
          <label
            className="text-[11px] font-medium text-muted-foreground"
            htmlFor={`${idPrefix}-min`}
          >
            Min amount
          </label>
          <Input
            id={`${idPrefix}-min`}
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={draft.min}
            onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label
            className="text-[11px] font-medium text-muted-foreground"
            htmlFor={`${idPrefix}-max`}
          >
            Max amount
          </label>
          <Input
            id={`${idPrefix}-max`}
            type="number"
            inputMode="decimal"
            placeholder="No limit"
            value={draft.max}
            onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">{hint}</p>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="x" className="w-3 h-3" />}
            onClick={clear}
            disabled={!draft.min && !draft.max}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              onChange(draft);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Free-text chip: a single value the caller matches rows against however it
// needs to (Client Management treats it as a substring match on the client's
// email). Same staged draft + Apply/Clear pattern as Date/Amount above, plus
// Enter as a keyboard shortcut for Apply, since a one-field popover is
// otherwise a mouse round-trip for what is really just typing.
export function EmailFilterChip({
  value,
  onChange,
  open,
  onOpenChange,
  label = "Email",
  idPrefix = "email",
  placeholder = "name@company.com",
  hint,
}: {
  value: string;
  onChange: (next: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: string;
  /** Disambiguates the input's id when more than one of these renders. */
  idPrefix?: string;
  placeholder?: string;
  hint?: string;
}) {
  const [draft, setDraft] = useState<string>(value);
  const isActive = !!value.trim();

  const clear = () => {
    onChange("");
    setDraft("");
    onOpenChange(false);
  };

  const apply = () => {
    onChange(draft.trim());
    onOpenChange(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setDraft(value);
      }}
    >
      <FilterChipShell active={isActive}>
        {isActive && <FilterChipClearButton label={label} onClick={clear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label={label} active={isActive} />
        </PopoverTrigger>
      </FilterChipShell>
      <PopoverContent align="end" className="w-64 space-y-3 p-3">
        <div className="space-y-1.5">
          <label
            className="text-[11px] font-medium text-muted-foreground"
            htmlFor={`${idPrefix}-value`}
          >
            {label} contains
          </label>
          <Input
            id={`${idPrefix}-value`}
            type="text"
            inputMode="email"
            autoComplete="off"
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                apply();
              }
            }}
          />
        </div>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="x" className="w-3 h-3" />}
            onClick={clear}
            disabled={!draft}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={apply}>
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Focuses the search field. A standalone function rather than an inline
 *  `ref.current?.focus()`, matching the convention the tables use for acting on
 *  ref/hook-returned elements (see restoreScrollTop). */
function focusSearchInput(el: HTMLInputElement | null): void {
  el?.focus();
}

/** The ISO2 to flag an option by: its own, or its value when that is already a
 *  code. Undefined when neither is, which is what suppresses the flag. */
function countryOptionIso2(option: CountryFilterOption): string | undefined {
  if (option.iso2) return option.iso2;
  return /^[A-Za-z]{2}$/.test(option.value.trim()) ? option.value : undefined;
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

// Multi-select country list, the same shape and behaviour as
// CurrencyFilterChip below it — staged draft, Apply/Clear, lifted
// open/onOpenChange — with the product's standard inline flag treatment
// (CountryFlag, exactly as the Transactions table's Country column renders
// it) beside each name. Scrolls internally rather than growing the popover,
// since a country list is open-ended in a way a currency list isn't.
export function CountryFilterChip({
  options,
  value,
  onChange,
  open,
  onOpenChange,
  label = "Country",
}: {
  options: CountryFilterOption[];
  value: string[];
  onChange: (next: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label?: string;
}) {
  const [draft, setDraft] = useState<string[]>(value);
  const searchRef = useRef<HTMLInputElement>(null);
  // Narrows the list as the merchant types. Deliberately not staged like `draft`
  // is: it filters what is on screen rather than what will be sent, so Apply has
  // nothing to do with it and it is reset when the popover reopens.
  const [query, setQuery] = useState("");
  const isActive = value.length > 0;

  const toggle = (code: string) => {
    setDraft((prev) => (prev.includes(code) ? prev.filter((v) => v !== code) : [...prev, code]));
  };

  const clear = () => {
    onChange([]);
    setDraft([]);
    onOpenChange(false);
  };

  // Matched on the label and the ISO2 alike, so both "New Zealand" and "nz" find
  // the same country — a merchant who thinks in codes should not have to know the
  // display name. Substring rather than prefix: "king" finds "United Kingdom".
  const needle = query.trim().toLowerCase();
  const visibleOptions = needle
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(needle) ||
          option.value.toLowerCase().includes(needle) ||
          (option.iso2 ?? "").toLowerCase().includes(needle)
      )
    : options;

  // Selected countries scrolled out of view by a search are still selected, and
  // Apply still sends them — so the count says so rather than leaving the
  // merchant to clear the box to check.
  const hiddenSelectedCount = draft.filter(
    (selected) => !visibleOptions.some((option) => option.value === selected)
  ).length;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setDraft(value);
          // A stale needle would otherwise reopen the popover onto a filtered
          // list with no obvious cause.
          setQuery("");
        }
      }}
    >
      <FilterChipShell active={isActive}>
        {isActive && <FilterChipClearButton label={label} onClick={clear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label={label} active={isActive} />
        </PopoverTrigger>
      </FilterChipShell>
      {/* Wider than the other chips' w-60: this one carries a search field above
          its list, and a country name plus its flag and checkbox needs the room
          left over. */}
      <PopoverContent
        align="end"
        className="w-72 p-3"
        // Radix focuses the content container itself when a popover opens, which
        // would take focus straight back off an autoFocused input. Preventing that
        // and focusing the field explicitly is what makes the popover open ready
        // to be typed into — the whole point of the field being here.
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          focusSearchInput(searchRef.current);
        }}
      >
        {/* A search box, because this list is the whole country map — long enough
            that scrolling to one is slower than typing it. InputGroup puts the
            magnifier inside the field, the same treatment the app's other search
            inputs use. */}
        <InputGroup className="mb-2">
          <InputGroupAddon>
            <Icon name="search" className="h-3.5 w-3.5 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            type="text"
            autoComplete="off"
            aria-label={`Search ${label.toLowerCase()}`}
            placeholder={`Search ${label.toLowerCase()}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </InputGroup>

        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {visibleOptions.length === 0 ? (
            <p className="px-2 py-3 text-center text-[12px] text-muted-foreground">
              No {label.toLowerCase()} matches “{query.trim()}”
            </p>
          ) : (
            visibleOptions.map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground hover:bg-muted/50"
              >
                <Checkbox
                  checked={draft.includes(option.value)}
                  onCheckedChange={() => toggle(option.value)}
                />
                {/* Only where a real ISO2 is available: an option whose `value` is a
                    country *name* (which is what the client list filters on) would
                    otherwise build a flag URL out of that name and render broken. */}
                {countryOptionIso2(option) ? (
                  <CountryFlag iso2={countryOptionIso2(option) as string} />
                ) : null}
                <span className="truncate">{option.label}</span>
              </label>
            ))
          )}
        </div>

        {hiddenSelectedCount > 0 ? (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {hiddenSelectedCount} selected {hiddenSelectedCount === 1 ? "item" : "items"} not shown
            by this search
          </p>
        ) : null}

        <Separator className="my-2" />

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="x" className="w-3 h-3" />}
            onClick={clear}
            disabled={!draft.length}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              onChange(draft);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Flat multi-select checkbox list for Status. Edits are staged and committed
// on Apply, the same as Date and Currency — a filter that re-queried on every
// checkbox tick fired a request per click and behaved unlike its neighbours,
// which is exactly the inconsistency this shape avoids.
function StatusFilterPanel({
  options,
  draft,
  onToggle,
  onClear,
  onApply,
}: {
  options: FilterChipOption[];
  draft: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  onApply: () => void;
}) {
  return (
    <div className="w-56 p-3">
      <div className="max-h-64 space-y-0.5 overflow-y-auto">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground hover:bg-muted/50"
          >
            <Checkbox
              checked={draft.includes(option.value)}
              onCheckedChange={() => onToggle(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>

      <Separator className="my-2" />

      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="x" className="w-3 h-3" />}
          onClick={onClear}
          disabled={draft.length === 0}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={onApply}>
          Apply
        </Button>
      </div>
    </div>
  );
}

export function StatusFilterChip({
  options,
  selected,
  onChange,
  open,
  onOpenChange,
}: {
  options: FilterChipOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<string[]>(selected);
  const isActive = selected.length > 0;

  const toggle = (value: string) => {
    setDraft((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const clear = () => {
    onChange([]);
    setDraft([]);
    onOpenChange(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setDraft(selected);
      }}
    >
      <FilterChipShell active={isActive}>
        {isActive && <FilterChipClearButton label="Status" onClick={clear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label="Status" active={isActive} />
        </PopoverTrigger>
      </FilterChipShell>
      <PopoverContent align="end" className="w-auto p-0">
        <StatusFilterPanel
          options={options}
          draft={draft}
          onToggle={toggle}
          onClear={clear}
          onApply={() => {
            onChange(draft);
            onOpenChange(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export interface CurrencyOption {
  value: string;
  label: string;
  /** ISO2 for the flag beside the label. Absent for "Rest of the World",
   *  which shows a globe glyph instead of a country flag. */
  iso2?: string;
}

// Same staged draft + Apply/Clear pattern as Date/Amount above, and the same
// lifted open/onOpenChange for the shared "only one chip open" behaviour.
// Independent from Status; it used to be a second category inside the same
// flyout (see StatusFilterPanel above).
export function CurrencyFilterChip({
  options,
  value,
  onChange,
  open,
  onOpenChange,
}: {
  options: CurrencyOption[];
  value: string[];
  onChange: (next: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<string[]>(value);
  const isActive = value.length > 0;

  const toggle = (code: string) => {
    setDraft((prev) => (prev.includes(code) ? prev.filter((v) => v !== code) : [...prev, code]));
  };

  const clear = () => {
    onChange([]);
    setDraft([]);
    onOpenChange(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) setDraft(value);
      }}
    >
      <FilterChipShell active={isActive}>
        {isActive && <FilterChipClearButton label="Currency" onClick={clear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label="Currency" active={isActive} />
        </PopoverTrigger>
      </FilterChipShell>
      <PopoverContent align="end" className="w-56 p-3">
        <div className="max-h-56 space-y-0.5 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground hover:bg-muted/50"
            >
              <Checkbox
                checked={draft.includes(option.value)}
                onCheckedChange={() => toggle(option.value)}
              />
              {option.iso2 ? (
                <CountryFlag iso2={option.iso2} />
              ) : (
                <Icon name="globe" className="h-3.5 w-5 shrink-0 text-muted-foreground" />
              )}
              {option.label}
            </label>
          ))}
        </div>

        <Separator className="my-2" />

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="x" className="w-3 h-3" />}
            onClick={clear}
            disabled={!draft.length}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              onChange(draft);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export interface MonthRange {
  /** Inclusive "YYYY-MM" bounds. Both ends compare as plain strings. */
  start: string;
  end: string;
}

/** A month index within a year → the "YYYY-MM" key the filter stores. */
const monthKey = (year: number, monthIndex: number) =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

const yearOf = (monthKeyValue: string) => Number(monthKeyValue.slice(0, 4));

/** Newest selected month's year, falling back to the range's last year. */
function startingYear(selected: string[], fallbackYear: number): number {
  if (selected.length === 0) return fallbackYear;
  const newest = [...selected].sort().reverse()[0];
  const parsed = yearOf(newest);
  return Number.isNaN(parsed) ? fallbackYear : parsed;
}

/**
 * Month RANGE chip: pick a start month and an end month on the same year grid.
 *
 * Distinct from MonthFilterChip below, which ticks an arbitrary SET of months.
 * A range is the right shape when the value is going into a request rather than
 * being matched client-side — a start/end pair is what a "from month, to month"
 * endpoint takes, and a set of months is not expressible in one.
 *
 * The value is never empty: a caller sending it to an API always has some window
 * in force, so "Reset" restores `defaultRange` rather than clearing to nothing,
 * and the chip renders the range it is on at all times. That is deliberate — a
 * filter that silently governs a request should say what it is set to, not read
 * as unset while quietly bounding every row on screen.
 *
 * Clicking cycles the way a date-range picker does: the first click starts a new
 * range, the second closes it, and a click before the open start moves the start
 * instead of making a backwards range.
 */
export function MonthRangeFilterChip({
  label = "Period",
  bounds,
  value,
  defaultRange,
  monthsWithData,
  onChange,
  open,
  onOpenChange,
}: {
  label?: string;
  /** The outer limits the grid lets the merchant navigate and pick within. */
  bounds: MonthRange;
  /** The range currently in force. Always set — see the note above. */
  value: MonthRange;
  /** What Reset goes back to, typically the window the page opens on. */
  defaultRange: MonthRange;
  /** Months with a row behind them, as "YYYY-MM". Drives the grid's dots. */
  monthsWithData: Set<string>;
  onChange: (next: MonthRange) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const minYear = yearOf(bounds.start);
  const maxYear = yearOf(bounds.end);

  const [draft, setDraft] = useState<MonthRange>(value);
  /** Set once a start has been picked and the end is still open, so the next
   *  click closes the range instead of starting another one. */
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const [year, setYear] = useState(() => yearOf(value.end) || maxYear);

  // Always active: there is always a window in force.
  const isDefault = value.start === defaultRange.start && value.end === defaultRange.end;

  const pick = (month: string) => {
    if (!awaitingEnd) {
      setDraft({ start: month, end: month });
      setAwaitingEnd(true);
      return;
    }
    // A click before the open start moves the start rather than inverting the
    // range, which is what every date-range picker does and what a merchant
    // correcting an over-shot first click means.
    setDraft((prev) =>
      month < prev.start ? { start: month, end: prev.end } : { start: prev.start, end: month }
    );
    setAwaitingEnd(false);
  };

  const reset = () => {
    setDraft(defaultRange);
    setAwaitingEnd(false);
  };

  const summary = `${formatMonthLabel(draft.start)} – ${formatMonthLabel(draft.end)}`;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setDraft(value);
          setAwaitingEnd(false);
          setYear(yearOf(value.end) || maxYear);
        }
      }}
    >
      <FilterChipShell active>
        <PopoverTrigger asChild>
          {/* The chip carries the range itself, not just the word "Period":
              this value is in the request body, so the merchant should be able
              to read what the table is bounded by without opening anything. */}
          <FilterChipLabelTrigger
            label={`${label}: ${formatMonthLabel(value.start)} – ${formatMonthLabel(value.end)}`}
            active
          />
        </PopoverTrigger>
      </FilterChipShell>
      <PopoverContent align="end" className="w-60 p-3">
        <div className="flex items-center justify-between">
          <IconButton
            aria-label="Previous year"
            variant="ghost"
            size="xs"
            disabled={year <= minYear}
            onClick={() => setYear((prev) => prev - 1)}
          >
            <Icon name="chevron-left" className="h-3.5 w-3.5" />
          </IconButton>
          <span className="text-[12.5px] font-semibold text-foreground">{year}</span>
          <IconButton
            aria-label="Next year"
            variant="ghost"
            size="xs"
            disabled={year >= maxYear}
            onClick={() => setYear((prev) => prev + 1)}
          >
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </IconButton>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1">
          {MONTH_SHORT_LABELS.map((monthLabel, index) => {
            const monthValue = monthKey(year, index);
            // Plain string comparison: "YYYY-MM" sorts chronologically.
            const inBounds = monthValue >= bounds.start && monthValue <= bounds.end;
            const isEdge = monthValue === draft.start || monthValue === draft.end;
            const isBetween = monthValue > draft.start && monthValue < draft.end;
            const hasData = monthsWithData.has(monthValue);

            return (
              <Button
                key={monthValue}
                type="button"
                variant={isEdge ? "primary" : "ghost"}
                size="sm"
                disabled={!inBounds}
                aria-pressed={isEdge || isBetween}
                aria-label={`${monthLabel} ${year}${hasData ? ", has receipts" : ""}`}
                onClick={() => pick(monthValue)}
                className={cn(
                  "relative h-auto min-h-0 w-full justify-center rounded-md px-0 pb-2.5 pt-1.5 text-[12px]",
                  !isEdge && "text-foreground hover:bg-muted/60",
                  isBetween && "bg-primary/15 text-primary"
                )}
              >
                {monthLabel}
                {hasData && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full",
                      isEdge ? "bg-primary-foreground" : "bg-primary"
                    )}
                  />
                )}
              </Button>
            );
          })}
        </div>

        <p className="mt-2 truncate text-[11px] text-muted-foreground" title={summary}>
          {awaitingEnd ? `${formatMonthLabel(draft.start)} – pick an end month` : summary}
        </p>

        <Separator className="my-2" />

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="x" className="w-3 h-3" />}
            onClick={reset}
            disabled={isDefault && draft.start === defaultRange.start && draft.end === defaultRange.end}
            className="text-muted-foreground hover:text-foreground"
          >
            Reset
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              onChange(draft);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Month chip: pick a year, then tick months inside it.
//
// A year header over a twelve-cell grid, rather than the flat checkbox list of
// "months that exist in the data" this started as. That list had nothing to
// show whenever the caller's rows were empty — the popover opened onto a box
// holding only Clear and Apply, which read as a broken filter — so the grid is
// drawn from `range`, a span the caller states up front (typically the window
// its list request covers), and it renders a full year whether or not any row
// has landed.
//
// Months outside `range` are disabled, since no amount of filtering would
// surface them. Months inside it that have no row behind them stay pickable but
// carry no dot: `monthsWithData` marks the ones that do, so the grid still says
// where the data is without hiding the calendar when the answer is "none yet".
//
// Selection is multi-month and spans years — the values are absolute "YYYY-MM"
// keys, not month indices — so a summary line names what is ticked outside the
// year on screen. Staged in a draft and committed on Apply, and with the same
// lifted open/onOpenChange as every chip above, so only one is open at a time.
export function MonthFilterChip({
  label = "Month",
  range,
  monthsWithData,
  selected,
  onChange,
  open,
  onOpenChange,
}: {
  label?: string;
  range: MonthRange;
  /** Months with a row behind them, as "YYYY-MM". Drives the grid's dots. */
  monthsWithData: Set<string>;
  selected: string[];
  onChange: (next: string[]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const minYear = yearOf(range.start);
  const maxYear = yearOf(range.end);

  const [draft, setDraft] = useState<string[]>(selected);
  // Opens on the newest month already picked, else on the newest year the range
  // covers — the end a merchant is most likely to want, and the end tables
  // sort their rows from.
  const [year, setYear] = useState(() => startingYear(selected, maxYear));

  const isActive = selected.length > 0;

  const toggle = (value: string) => {
    setDraft((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const clear = () => {
    onChange([]);
    setDraft([]);
    onOpenChange(false);
  };

  // "August 2026 · July 2026 +2" — the picked months one year of grid cannot
  // show by itself. Cheap enough to derive on render, like the other chips'
  // draft-derived flags.
  const sortedDraft = [...draft].sort().reverse();
  const summary =
    sortedDraft.length > 2
      ? `${sortedDraft.slice(0, 2).map(formatMonthLabel).join(" · ")} +${sortedDraft.length - 2}`
      : sortedDraft.map(formatMonthLabel).join(" · ");

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (next) {
          setDraft(selected);
          setYear(startingYear(selected, maxYear));
        }
      }}
    >
      <FilterChipShell active={isActive}>
        {isActive && <FilterChipClearButton label={label} onClick={clear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label={label} active={isActive} />
        </PopoverTrigger>
      </FilterChipShell>
      <PopoverContent align="end" className="w-60 p-3">
        <div className="flex items-center justify-between">
          <IconButton
            aria-label="Previous year"
            variant="ghost"
            size="xs"
            disabled={year <= minYear}
            onClick={() => setYear((prev) => prev - 1)}
          >
            <Icon name="chevron-left" className="h-3.5 w-3.5" />
          </IconButton>
          <span className="text-[12.5px] font-semibold text-foreground">{year}</span>
          <IconButton
            aria-label="Next year"
            variant="ghost"
            size="xs"
            disabled={year >= maxYear}
            onClick={() => setYear((prev) => prev + 1)}
          >
            <Icon name="chevron-right" className="h-3.5 w-3.5" />
          </IconButton>
        </div>

        <div className="mt-2 grid grid-cols-4 gap-1">
          {MONTH_SHORT_LABELS.map((monthLabel, index) => {
            const value = monthKey(year, index);
            // Plain string comparison: "YYYY-MM" sorts chronologically.
            const inRange = value >= range.start && value <= range.end;
            const isSelected = draft.includes(value);
            const hasData = monthsWithData.has(value);

            return (
              <Button
                key={value}
                type="button"
                variant={isSelected ? "primary" : "ghost"}
                size="sm"
                disabled={!inRange}
                aria-pressed={isSelected}
                aria-label={`${monthLabel} ${year}${hasData ? ", has data" : ""}`}
                onClick={() => toggle(value)}
                className={cn(
                  "relative h-auto min-h-0 w-full justify-center rounded-md px-0 pb-2.5 pt-1.5 text-[12px]",
                  !isSelected && "text-foreground hover:bg-muted/60"
                )}
              >
                {monthLabel}
                {hasData && (
                  // Drawn like the chip trigger's own state dot: a marker, not
                  // a count. Inverted on the selected cell so it stays visible
                  // against the primary fill.
                  <span
                    aria-hidden
                    className={cn(
                      "absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full",
                      isSelected ? "bg-primary-foreground" : "bg-primary"
                    )}
                  />
                )}
              </Button>
            );
          })}
        </div>

        {draft.length > 0 && (
          <p className="mt-2 truncate text-[11px] text-muted-foreground" title={summary}>
            {summary}
          </p>
        )}

        <Separator className="my-2" />

        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="x" className="w-3 h-3" />}
            onClick={clear}
            disabled={draft.length === 0}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              onChange(draft);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

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
  const [openChip, setOpenChip] = useState<"date" | "status" | "currency" | null>(null);

  return (
    <>
      <DateFilterChip
        value={dateRange}
        onChange={onDateRangeChange}
        relativeValue={relativeDateRange}
        onRelativeChange={onRelativeDateRangeChange}
        open={openChip === "date"}
        onOpenChange={(next) => setOpenChip(next ? "date" : null)}
      />
      <StatusFilterChip
        options={statusOptions}
        selected={statusFilters}
        onChange={onStatusFiltersChange}
        open={openChip === "status"}
        onOpenChange={(next) => setOpenChip(next ? "status" : null)}
      />
      <CurrencyFilterChip
        options={currencyOptions}
        value={currencyFilters}
        onChange={onCurrencyFiltersChange}
        open={openChip === "currency"}
        onOpenChange={(next) => setOpenChip(next ? "currency" : null)}
      />
    </>
  );
}
