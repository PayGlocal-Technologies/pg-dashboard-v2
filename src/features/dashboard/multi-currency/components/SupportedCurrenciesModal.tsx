"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  EmptyState,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { ICONS } from "@/components/icon/registry";
import { CountryFlag } from "@/features/dashboard/multi-currency/components/CountryFlag";
import type { SupportedRegion } from "@/features/dashboard/multi-currency/types";

interface SupportedCurrenciesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rows to list — the account's own `supportedRegions`. */
  regions: SupportedRegion[];
}

/**
 * Read-only list of every region a multi-region account can receive from,
 * opened from the "See supported currency" link beside that account's
 * subtitle. There is nothing to select or submit: a client either pays from a
 * listed region or they don't, so search is the only interaction.
 *
 * Rows come entirely from the `regions` prop rather than a list of its own, so
 * swapping the mock data for the real endpoint needs no change here.
 */
export function SupportedCurrenciesModal({
  open,
  onOpenChange,
  regions,
}: SupportedCurrenciesModalProps) {
  const [query, setQuery] = useState("");

  // Region name, currency name and currency code all match, so "japan",
  // "yen" and "JPY" each find the same row — a client asking "can I pay in
  // yen?" and a merchant checking a code both search the way they think.
  // Lowercasing both sides is what makes it case-insensitive.
  const trimmed = query.trim().toLowerCase();
  const matches = trimmed
    ? regions.filter(
        (region) =>
          region.countryName.toLowerCase().includes(trimmed) ||
          region.currencyName.toLowerCase().includes(trimmed) ||
          region.currency.toLowerCase().includes(trimmed)
      )
    : regions;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        // Reopening should show the full list, not the last search.
        if (!next) setQuery("");
      }}
    >
      {/* max-w caps the dialog on desktop while the `min(100%,…)` half lets it
          use the full width on a phone; DialogContent's own
          `w-[calc(100%-1.5rem)]` keeps a gutter either side there. p-6
          replaces the default p-6 pt-10 (that extra top padding reserves space
          for the close button sitting above the content, out of the flow),
          with [&>button:last-child]:top-6 moving that button down to the same
          24px inset instead — the same pairing ShareAccountDetailsModal
          uses. */}
      <DialogContent className="max-w-[min(100%,30rem)] p-6 [&>button:last-child]:top-6">
        <DialogTitle className="text-base font-semibold text-foreground">
          Supported currencies
        </DialogTitle>
        <DialogDescription className="mt-1 text-[13px] text-muted-foreground">
          Clients in any of these regions can pay into this account.
        </DialogDescription>

        <InputGroup className="mt-4">
          <InputGroupAddon>
            <Icon name="search" className="h-4 w-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search currency or region"
            aria-label="Search currency or region"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </InputGroup>

        {/* Capped and scrolled rather than letting the list set the dialog's
            height: DialogContent would otherwise scroll as a whole and carry
            the search field out of view with it, and that's the one control
            that has to stay reachable while reading results. */}
        <div className="mt-2 max-h-[360px] overflow-y-auto pr-1">
          {matches.length === 0 ? (
            <EmptyState
              icon={ICONS.search}
              title="No matching currencies"
              description="Try a region name, a currency name, or a three-letter currency code."
            />
          ) : (
            <ul className="divide-y divide-border">
              {matches.map((region) => (
                // Region and currency each repeat across rows (three regions
                // share the euro), so the pair is the key, not either alone.
                <li
                  key={`${region.iso2}-${region.currency}`}
                  className="flex items-center gap-3 py-2.5"
                >
                  <CountryFlag iso2={region.iso2} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {region.countryName}
                    </p>
                    {/* Name and code on one supporting line: the code is what
                        a client types into their bank, the name is there to
                        confirm they've read it right. */}
                    <p className="truncate text-[12px] text-muted-foreground">
                      {region.currencyName} · {region.currency}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
