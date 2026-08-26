"use client";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle, Input } from "@/components/ui";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import { GLOBAL_CURRENCIES } from "@/features/dashboard/multi-currency/accountGuides";

/**
 * Every currency the SWIFT catch-all account can receive.
 *
 * Ported from pg-dashboard's GlobalCurrenciesModal, including its search across
 * both currency name and code — the list is long enough that scanning it beats
 * reading it, and a merchant checking "can my client pay me in Thai baht?"
 * arrives knowing either the name or the code, not its position in the list.
 */
export function GlobalCurrenciesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return GLOBAL_CURRENCIES;
    return GLOBAL_CURRENCIES.filter(
      (currency) =>
        currency.currencyName.toLowerCase().includes(needle) ||
        currency.currencyCode.toLowerCase().includes(needle)
    );
  }, [search]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // Reopening should start from the full list, not the last search.
        if (!next) setSearch("");
      }}
    >
      <DialogContent className="max-w-[min(100%,50rem)] p-6 [&>button:last-child]:top-6">
        <DialogTitle className="text-base font-semibold text-foreground">
          Supported currencies
        </DialogTitle>

        <Input
          type="search"
          autoComplete="off"
          placeholder="Search currencies"
          aria-label="Search supported currencies"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-4"
        />

        {/* Its own scroll container, capped in vh: the list is 32 rows and must
            not push the dialog past the viewport on a short window. */}
        <div className="mt-5 max-h-[52vh] overflow-y-auto">
          {matches.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-muted-foreground">
              No currency matches “{search.trim()}”.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((currency) => (
                <li key={currency.countryIso2Code} className="flex items-center gap-2.5">
                  <CountryFlag iso2={currency.countryIso2Code} />
                  <span className="min-w-0 truncate text-[13px] text-foreground">
                    {currency.currencyName}
                  </span>
                  {/* Tabular so the codes line up down each column. */}
                  <span className="ml-auto shrink-0 text-[12px] tabular-nums text-muted-foreground">
                    {currency.currencyCode}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
