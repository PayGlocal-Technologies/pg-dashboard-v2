"use client";

import { forwardRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
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

// The dashed-outline pill itself. Purely structural, no click handler, no
// interactive semantics of its own, so it's a plain div rather than a
// flux-ui component; the actual clicking happens in the two children it
// wraps. Only its border colour reacts to `active`, matching the "colour
// change, not a shape change" active state the chips already had.
export function FilterChipShell({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "inline-flex h-auto shrink-0 items-center rounded-full border border-dashed border-border bg-card shadow-sm",
        active && "border-primary/50"
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
      className="h-auto min-h-0 shrink-0 rounded-full border border-transparent px-2 py-1 text-muted-foreground hover:text-foreground"
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
        "h-auto min-h-0 shrink-0 rounded-full border border-transparent py-1 text-muted-foreground hover:text-foreground",
        active ? "pl-1.5 pr-2.5" : "pl-2.5 pr-2.5",
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
  open,
  onOpenChange,
}: {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<DateRangeValue>(value);
  const isActive = !!(value.from && value.to);
  const isPartial = !!draft.from !== !!draft.to;

  const clear = () => {
    onChange({ from: "", to: "" });
    setDraft({ from: "", to: "" });
    onOpenChange(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // Re-seed the draft from the last applied value every time the
        // popover opens, so a discarded in-progress edit never leaks in.
        if (next) setDraft(value);
      }}
    >
      <FilterChipShell active={isActive}>
        {isActive && <FilterChipClearButton label="Date" onClick={clear} />}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label="Date" active={isActive} />
        </PopoverTrigger>
      </FilterChipShell>
      <PopoverContent align="end" className="w-72 space-y-3 p-3">
        {/* Flux's DatePicker is a single-date field (there's no dedicated
            Flux date-*range* component), a From/To pair of them is the
            closest real reuse of it rather than a bespoke range widget. Each
            manages its own calendar popup/portal independently. */}
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
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Icon name="x" className="w-3 h-3" />}
            onClick={clear}
            disabled={!draft.from && !draft.to}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={isPartial}
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
          <label className="text-[11px] font-medium text-muted-foreground" htmlFor={`${idPrefix}-min`}>
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
          <label className="text-[11px] font-medium text-muted-foreground" htmlFor={`${idPrefix}-max`}>
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

// Flat multi-select checkbox list for Status. Applies immediately on toggle
// (no Apply step), matching the filtering model this has always used.
function StatusFilterPanel({
  options,
  selected,
  onToggle,
  onClear,
}: {
  options: FilterChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="w-56 p-3">
      <div className="min-h-40 space-y-0.5">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-foreground hover:bg-muted/50"
          >
            <Checkbox checked={selected.includes(option.value)} onCheckedChange={() => onToggle(option.value)} />
            {option.label}
          </label>
        ))}
      </div>

      <Separator />

      <div className="flex items-center justify-between px-1 pt-2">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Icon name="x" className="w-3 h-3" />}
          onClick={onClear}
          disabled={selected.length === 0}
          className="text-muted-foreground hover:text-foreground"
        >
          Clear filters
        </Button>
        {selected.length > 0 && (
          <span className="pr-1 text-[11px] text-muted-foreground">{selected.length} selected</span>
        )}
      </div>
    </div>
  );
}

export function StatusFilterChip({
  options,
  selected,
  onToggle,
  onClear,
  open,
  onOpenChange,
}: {
  options: FilterChipOption[];
  selected: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isActive = selected.length > 0;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <FilterChipShell active={isActive}>
        {isActive && (
          <FilterChipClearButton
            label="Status"
            onClick={() => {
              onClear();
              onOpenChange(false);
            }}
          />
        )}
        <PopoverTrigger asChild>
          <FilterChipLabelTrigger label="Status" active={isActive} />
        </PopoverTrigger>
      </FilterChipShell>
      <PopoverContent align="end" className="w-auto p-0">
        <StatusFilterPanel options={options} selected={selected} onToggle={onToggle} onClear={onClear} />
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
              <Checkbox checked={draft.includes(option.value)} onCheckedChange={() => toggle(option.value)} />
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
