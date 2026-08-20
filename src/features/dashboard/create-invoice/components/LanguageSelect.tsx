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
 * Nova offers fifteen and silently renders seven of them in English. This splits
 * the list in two and says which is which: a merchant invoicing a Korean
 * customer should find out that "Korean" only changes the setting, not the
 * document, before they send it rather than after.
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
  const { translated, fallback } = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = INVOICE_LANGUAGES.filter((language) =>
      language.name.toLowerCase().includes(needle)
    );
    return {
      translated: matches.filter((language) => language.translated),
      fallback: matches.filter((language) => !language.translated),
    };
  }, [query]);

  const isTranslated = INVOICE_LANGUAGES.find((language) => language.name === value)?.translated;

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
            {isTranslated === false && (
              <span className="shrink-0 rounded bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                English labels
              </span>
            )}
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
            {translated.length === 0 && fallback.length === 0 && (
              <CommandEmpty>No language matches that search.</CommandEmpty>
            )}

            {translated.length > 0 && (
              <CommandGroup heading="Translated labels">
                {translated.map((language) => row(language.name))}
              </CommandGroup>
            )}

            {fallback.length > 0 && (
              <CommandGroup heading="Labels stay in English">
                {fallback.map((language) => row(language.name))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
