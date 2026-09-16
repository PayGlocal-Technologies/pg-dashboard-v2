"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * A single-select with a search box.
 *
 * flux has two halves of this and neither is quite it: `Select` is a plain
 * listbox with no search, and `CountrySelect` is a searchable popover hardwired
 * to flux's own COUNTRIES array. So a long list that is not countries — India's
 * 36 states and union territories, for one — had to be a `Select`, where the
 * only way to find Karnataka is to scroll or to guess at Radix's type-ahead.
 *
 * Deliberately styled to match `CountrySelect`'s trigger (h-11, px-4, 15px),
 * because in the client form these two sit in the same address block: a state
 * field that searched but looked different from the country field above it would
 * read as a different kind of control.
 *
 * Worth raising as a flux gap — a generic `<SearchableSelect>` belongs in the
 * design system, and this should become a re-export when it lands there.
 */
export function SearchableSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = "Select",
  searchPlaceholder = "Search…",
  emptyMessage = "No matches.",
  disabled = false,
  invalid = false,
  /**
   * Below this many options the search box is hidden. A search field over three
   * items is noise, and the non-India state list is a single "Not Applicable".
   */
  searchThreshold = 8,
  className,
}: {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  invalid?: boolean;
  searchThreshold?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((option) => option.value === value);
  const showSearch = options.length >= searchThreshold;

  // flux's Command is a presentational shell and does no filtering of its own,
  // so matching happens here — the same pattern BillToSection's client picker
  // uses. Matched on the label, which is what the user is reading.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query]);

  const choose = (next: string) => {
    onValueChange(next);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      // `modal` is required, not a preference. Almost every use of this control
      // is inside a Dialog, and flux's PopoverContent always portals to
      // document.body — outside the Dialog's subtree. A modal Radix Dialog
      // mounts react-remove-scroll and puts `pointer-events: none` on the body,
      // so a non-modal popover out there has its wheel events cancelled: the
      // list could be clicked but not scrolled, and the wheel scrolled the
      // dialog behind it instead. `modal` makes Radix treat this as its own
      // layer, with its own scroll lock and pointer events.
      modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid}
          disabled={disabled}
          // `[&>span]` is the wrapper flux puts around a Button's children;
          // letting it shrink is what makes a long label truncate instead of
          // pushing the chevron out of the control.
          className={cn(
            "h-11 min-h-11 w-full justify-between px-4 text-[15px] font-normal",
            "[&>span]:min-w-0 [&>span]:flex-1",
            className
          )}
          rightIcon={
            <Icon
              name="chevron-down"
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          }
        >
          <span
            className={cn(
              "block truncate text-left",
              selected ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {selected?.label ?? placeholder}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        // Focus belongs in the search box when there is one, so the merchant can
        // type straight away rather than tabbing into it.
        onOpenAutoFocus={showSearch ? undefined : (e) => e.preventDefault()}
      >
        <Command>
          {showSearch && (
            <CommandInput
              autoFocus
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
          <CommandList>
            {matches.length === 0 && <CommandEmpty>{emptyMessage}</CommandEmpty>}
            <CommandGroup>
              {matches.map((option) => (
                <CommandItem
                  key={option.value}
                  selected={option.value === value}
                  onSelect={() => choose(option.value)}
                >
                  <span className="min-w-0 flex-1 truncate text-[14px]">{option.label}</span>
                  <Icon
                    name="check"
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-primary",
                      option.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
