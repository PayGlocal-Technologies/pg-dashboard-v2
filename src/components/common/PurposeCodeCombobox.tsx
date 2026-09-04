"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
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
import type { PurposeCodeOption } from "@/lib/purposeCodes";

export interface PurposeCodeComboboxHandle {
  focus: () => void;
}

interface PurposeCodeComboboxProps {
  id: string;
  value: string;
  onChange: (code: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  errorId?: string;
  /** The codes this merchant may pick from, fetched by usePurposeCodes —
   *  which codes are offered is merchant configuration, so this component
   *  never sources them itself. */
  options: PurposeCodeOption[];
  /** While the merchant's codes are still being fetched. */
  isLoading?: boolean;
}

export const PurposeCodeCombobox = forwardRef<PurposeCodeComboboxHandle, PurposeCodeComboboxProps>(
  ({ id, value, onChange, onBlur, invalid, errorId, options, isLoading }, forwardedRef) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    useImperativeHandle(forwardedRef, () => ({
      focus: () => {
        triggerRef.current?.focus();
      },
    }));

    const selected = useMemo(() => options.find((p) => p.code === value), [options, value]);

    const filtered = useMemo(() => {
      const q = search.trim().toLowerCase();
      if (!q) return options;
      return options.filter(
        (p) => p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }, [options, search]);

    // Focusing the search input only needs the DOM node, no state update — safe
    // inside the effect body itself (no synchronous setState here).
    useEffect(() => {
      if (!open) return;
      const focusTimer = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(focusTimer);
    }, [open]);

    const listboxId = `${id}-listbox`;
    const activeOption = filtered[highlightedIndex];
    const activeOptionId = activeOption ? `${id}-option-${activeOption.code}` : undefined;

    const updateSearch = (v: string) => {
      setSearch(v);
      setHighlightedIndex(0);
    };

    const selectOption = (code: string) => {
      onChange(code);
      setOpen(false);
    };

    const handleOpenChange = (next: boolean) => {
      setOpen(next);
      setHighlightedIndex(0);
      if (!next) {
        setSearch("");
        onBlur?.();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (activeOption) selectOption(activeOption.code);
      }
    };

    // One trigger for both states, rather than a separate "selected" layout
    // carrying its own Change action beside the value: the whole field is the
    // dropdown, so clicking anywhere on it opens the selector and the trailing
    // chevron is the only affordance in either state. Only the label inside
    // differs between having a selection and not.
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            id={id}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? errorId : undefined}
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2.5 rounded-lg border bg-card px-3.5 text-left text-[13px] shadow-sm",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
              selected ? "text-foreground" : "text-muted-foreground",
              invalid ? "border-destructive" : "border-border"
            )}
          >
            {selected ? (
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{selected.code}</span>
                <span className="text-muted-foreground"> {selected.description}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Icon
                  name={isLoading ? "loader" : "search"}
                  className={cn("h-3.5 w-3.5 shrink-0", isLoading && "animate-spin")}
                />
                {isLoading ? "Loading purpose codes…" : "Search by code or keyword"}
              </span>
            )}
            <Icon
              name="chevron-down"
              className={cn(
                "h-3.5 w-3.5 shrink-0 opacity-70 transition-transform",
                open && "rotate-180"
              )}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[min(24rem,calc(100vw-3rem))] p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ComboboxList
            id={id}
            listboxId={listboxId}
            inputRef={inputRef}
            search={search}
            onSearchChange={updateSearch}
            onKeyDown={handleKeyDown}
            filtered={filtered}
            isLoading={isLoading}
            highlightedIndex={highlightedIndex}
            activeOptionId={activeOptionId}
            value={value}
            onSelect={selectOption}
          />
        </PopoverContent>
      </Popover>
    );
  }
);
PurposeCodeCombobox.displayName = "PurposeCodeCombobox";

function ComboboxList({
  id,
  listboxId,
  inputRef,
  search,
  onSearchChange,
  onKeyDown,
  filtered,
  isLoading,
  highlightedIndex,
  activeOptionId,
  value,
  onSelect,
}: {
  id: string;
  listboxId: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  search: string;
  onSearchChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  filtered: PurposeCodeOption[];
  isLoading?: boolean;
  highlightedIndex: number;
  activeOptionId: string | undefined;
  value: string;
  onSelect: (code: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // The dropdown is a Radix Popover portalled to document.body, opened from
  // inside a Drawer/Dialog. The Drawer's scroll lock (react-remove-scroll)
  // intercepts wheel events at the document level and can swallow them
  // before they reach this list, even though the list itself scrolls fine
  // via the scrollbar (a drag, not a wheel event). React's own onWheel is
  // passive by default, so calling preventDefault there is a silent no-op —
  // a real (non-passive) DOM listener is required to take control of the
  // scroll ourselves.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollTop += e.deltaY;
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <Command>
      <CommandInput
        ref={inputRef}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type a code or keyword…"
        role="combobox"
        aria-expanded="true"
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-autocomplete="list"
        aria-label="Search purpose codes"
      />
      <CommandList ref={listRef} id={listboxId} aria-label="Purpose codes">
        {isLoading && filtered.length === 0 ? (
          <CommandEmpty>Loading purpose codes…</CommandEmpty>
        ) : filtered.length === 0 ? (
          <CommandEmpty>No purpose codes match &ldquo;{search}&rdquo;</CommandEmpty>
        ) : (
          <CommandGroup>
            {filtered.map((p, i) => (
              <CommandItem
                key={p.code}
                id={`${id}-option-${p.code}`}
                role="option"
                selected={i === highlightedIndex || p.code === value}
                onSelect={() => onSelect(p.code)}
              >
                <span className="font-medium">{p.code}</span>
                <span className="truncate text-muted-foreground">{p.description}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}
