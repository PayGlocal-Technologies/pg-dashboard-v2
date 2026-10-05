"use client";

import { useState } from "react";
import { Button, Input, Popover, PopoverContent, PopoverTrigger, cn } from "@payglocal_ui/flux-ui";
import { Icon } from "@/components/icon";

/**
 * Searchable single-select (a combobox).
 *
 * flux used to export `SingleSelect`; as of 0.3.x it does not — only
 * `SingleSelectFilterChip`, which is a filter chip and a different control
 * entirely. The barrel kept re-exporting the old name, so
 * `src/components/ui/index.ts` referenced an export that no longer existed and
 * every build failed on it. The barrel is pulled in by providers.tsx, so that
 * took the whole app down, not just the six screens using this.
 *
 * Same component and the same props the existing call sites already pass
 * (country and state pickers in client-management, create-invoice,
 * payment-links, dispute-management and invoice-links), so nothing had to
 * change at those call sites.
 *
 * DELIBERATELY NOT BUILT ON flux's `Command` / cmdk. flux's `CommandItem`
 * carries no searchable `value`, and flux dropped `Command.shouldFilter` and
 * `CommandInput.onValueChange` from its types, so cmdk's own filter cannot be
 * steered: it mis-fires "No results." while every option still renders. The
 * same mistake was made and reverted in pg-internal-v2's bank picker. This is
 * a Popover over a controlled Input and a hand-filtered list of option
 * buttons — fully deterministic. The trade-off is weaker arrow-key navigation.
 *
 * Imports flux primitives directly rather than through `@/components/ui`,
 * because this file is part of that barrel and would otherwise be circular.
 */
export interface SingleSelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SingleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SingleSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  id?: string;
  disabled?: boolean;
  /** Mirrors the `aria-invalid` every other field control in the app takes. */
  invalid?: boolean;
  className?: string;
}

export function SingleSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results.",
  id,
  disabled,
  invalid,
  className,
}: SingleSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.value === value);

  // Matched on label AND value, case-insensitive, so a country is findable
  // both by name and by code.
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(needle) ||
          option.value.toLowerCase().includes(needle)
      )
    : options;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next: boolean) => (next ? setOpen(true) : close())}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal shadow-none",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <Icon name="chevron-down" className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            value={query}
            placeholder={searchPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8"
          />
        </div>

        <div role="listbox" className="max-h-60 overflow-y-auto p-1">
          {visible.length === 0 ? (
            <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">{emptyText}</p>
          ) : (
            visible.map((option) => {
              const isSelected = option.value === value;
              return (
                // Bare <button> on purpose, per CLAUDE.md's exemption: no
                // flux-ui component covers a listbox option. <Button> carries
                // its own variant padding and focus ring, which fights the
                // dense option-row styling and the roving aria-selected state.
                // This is the one place in the app that should own that markup
                // — every feature keeps using <SingleSelect>, not this.
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px]",
                    "hover:bg-accent focus:bg-accent focus:outline-none",
                    option.disabled && "pointer-events-none opacity-50",
                    isSelected && "font-medium"
                  )}
                >
                  <Icon
                    name="check"
                    className={cn("h-3.5 w-3.5 shrink-0", isSelected ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
