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
import { INVOICE_LANGUAGES } from "@/features/dashboard/create-invoice/i18n";

/**
 * The language the invoice's fixed labels print in.
 *
 * Every entry does something. Nova offers fifteen and silently renders seven of
 * them in English; this used to inherit that and merely label the dud half
 * honestly, which raised the fair objection that a group of options admitting
 * they change nothing should not be on offer at all. The seven are translated
 * now, and the list is derived from the translations, so an untranslated
 * language cannot reappear in the picker.
 *
 * Never translates the merchant's own words — item names, memo, notes and
 * addresses stay exactly as typed. See i18n.ts.
 */
export function LanguageSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (language: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // flux's Command is a presentational shell and does no filtering of its own,
  // so matching happens here — the same pattern BillToSection uses.
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return INVOICE_LANGUAGES.filter((language) => language.toLowerCase().includes(needle));
  }, [query]);

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
    setQuery("");
  };

  const row = (name: string) => (
    <CommandItem key={name} selected={name === value} onSelect={() => choose(name)}>
      <span className="flex-1 text-[13px]">{name}</span>
      <Icon
        name="check"
        className={cn(
          "h-3.5 w-3.5 shrink-0 text-primary",
          name === value ? "opacity-100" : "opacity-0"
        )}
      />
    </CommandItem>
  );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          // `[&>span]` targets the wrapper flux puts around a Button's children,
          // so it can shrink and the language name truncates rather than pushing
          // the chevron out.
          className="h-auto w-full justify-between px-3.5 py-2.5 text-left [&>span]:min-w-0 [&>span]:flex-1"
          rightIcon={
            <Icon
              name="chevron-down"
              className="h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <Icon name="languages" className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate text-[13.5px] font-medium text-foreground">{value}</span>
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[17rem] p-0">
        <Command>
          <CommandInput
            placeholder="Search language…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <CommandList>
            {matches.length === 0 && (
              <CommandEmpty>No language matches that search.</CommandEmpty>
            )}
            <CommandGroup>{matches.map(row)}</CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
