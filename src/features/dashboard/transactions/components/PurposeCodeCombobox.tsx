"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PURPOSE_CODES } from "@/features/dashboard/transactions/purposeCodes";

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
}

export const PurposeCodeCombobox = forwardRef<PurposeCodeComboboxHandle, PurposeCodeComboboxProps>(
  ({ id, value, onChange, onBlur, invalid, errorId }, forwardedRef) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selectedRowRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(forwardedRef, () => ({
    focus: () => {
      (triggerRef.current ?? selectedRowRef.current)?.focus();
    },
  }));

  const selected = useMemo(() => PURPOSE_CODES.find((p) => p.code === value), [value]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return PURPOSE_CODES;
    return PURPOSE_CODES.filter(
      (p) => p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [search]);

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

  if (selected) {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverAnchor asChild>
          <div
            ref={selectedRowRef}
            id={id}
            tabIndex={-1}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3.5 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
          >
            <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
              <span className="font-medium">{selected.code}</span>
              <span className="text-muted-foreground"> — {selected.description}</span>
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="shrink-0 px-1 py-0 text-[13px]"
              onClick={() => setOpen(true)}
            >
              Change
            </Button>
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-[min(24rem,calc(100vw-3rem))] p-0"
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
            highlightedIndex={highlightedIndex}
            activeOptionId={activeOptionId}
            value={value}
            onSelect={selectOption}
          />
        </PopoverContent>
      </Popover>
    );
  }

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
            "flex h-10 w-full items-center justify-between gap-2.5 rounded-lg border bg-card px-3.5 text-[13px] text-muted-foreground shadow-sm",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35",
            invalid ? "border-destructive" : "border-border"
          )}
        >
          <span className="flex items-center gap-2">
            <Icon name="search" className="h-3.5 w-3.5 shrink-0" />
            Search by code or keyword
          </span>
          <Icon
            name="chevron-down"
            className={cn("h-3.5 w-3.5 shrink-0 opacity-70 transition-transform", open && "rotate-180")}
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
  filtered: { code: string; description: string }[];
  highlightedIndex: number;
  activeOptionId: string | undefined;
  value: string;
  onSelect: (code: string) => void;
}) {
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
      <CommandList id={listboxId} aria-label="Purpose codes">
        {filtered.length === 0 ? (
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
