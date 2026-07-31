"use client";

import { Button, Card, CardContent, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { CARD_SIZE_CLASS } from "@/features/dashboard/multi-currency/constants";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

interface VirtualAccountCardProps {
  account: VirtualAccount;
  /** Performs the clipboard write and surfaces the toast; resolves when done. */
  onCopy: (account: VirtualAccount) => Promise<void> | void;
  onShare: (account: VirtualAccount) => void;
  /** Whether this account's details/transactions section is currently expanded. */
  isExpanded: boolean;
  /** Expands this account, or collapses it if it's already the expanded one. */
  onToggleExpand: (account: VirtualAccount) => void;
}

export function VirtualAccountCard({
  account,
  onCopy,
  onShare,
  isExpanded,
  onToggleExpand,
}: VirtualAccountCardProps) {
  return (
    <Card
      className={cn(
        CARD_SIZE_CLASS,
        "group relative shrink-0 overflow-hidden px-4 py-4 transition-[box-shadow,border-color] duration-150 hover:shadow-md",
        isExpanded && "border-primary ring-2 ring-primary"
      )}
    >
      {/* The only control that expands/collapses this account. The card
          itself is deliberately not clickable — no onClick, role, or
          tabIndex on the Card — so the flag, title, identifiers, and
          whitespace are purely informational; this button is the sole click
          target for that action. Sits outside the hover-revealed action row
          below, so it stays visible and reachable regardless of hover state. */}
      <IconButton
        aria-label={isExpanded ? `Collapse ${account.accountName}` : `Expand ${account.accountName}`}
        variant="outline"
        size="xs"
        rounded="full"
        className="absolute right-3 top-3 z-10 size-6 min-w-6 text-muted-foreground"
        onClick={() => onToggleExpand(account)}
      >
        <Icon name={isExpanded ? "x" : "plus"} className="h-3.5 w-3.5" />
      </IconButton>

      <CardContent className="flex h-full min-w-0 flex-col gap-1 overflow-hidden">
        <CountryFlagAvatar
          iso2={account.iso2}
          countryName={account.countryName}
          className="h-8 w-8"
        />

        {/* Account name is the primary element after the flag — the only
            bold/large text on the card. leading-none keeps the two-line
            block compact so there's always room for the details below.
            mt-3 (on top of CardContent's own gap-1) gives the flag more
            breathing room before the name, since that gap was too tight for
            the flag→name relationship specifically. */}
        <div className="mt-3 min-w-0">
          <p className="truncate text-lg font-bold leading-none text-foreground">
            {account.accountName}
          </p>
          {/* Skipped when it would just repeat the title verbatim — the
              Rest of the World account's name already names its region. */}
          {account.countryName !== account.accountName && (
            <p className="mt-1 truncate text-xs leading-none text-muted-foreground">
              {account.countryName}
            </p>
          )}
        </div>

        {/* Identifiers sit one level below the account name — every row uses
            the same label/value size and weight, regardless of what it is
            (account number, IBAN, ACH, SEPA, ...), for consistency. Label and
            value now share identical typography (size/weight/case/tracking);
            only the muted vs. foreground color tells them apart, so neither
            outweighs the other while both stay secondary to the account
            name above. Sized to always fit above the card's bottom padding,
            never clipped. */}
        <div className="mt-auto min-w-0 space-y-1.5">
          {account.details.map((detail) => (
            <p key={detail.label} className="flex min-w-0 items-baseline gap-1.5 leading-none">
              <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide leading-none text-muted-foreground">
                {detail.label.split(" ")[0]}
              </span>
              <span className="truncate text-[10px] font-medium uppercase tracking-wide leading-none text-foreground">
                {detail.value}
              </span>
            </p>
          ))}
        </div>
      </CardContent>

      {/* Hover-revealed actions. Absolutely positioned so they overlay the
          bottom of the card instead of participating in its flex layout —
          appearing/disappearing never shifts the card's size or the
          identifiers above it. stopPropagation keeps clicks scoped to the
          button itself. group-focus-within mirrors the hover reveal for
          keyboard users tabbing onto the buttons. Suppressed entirely while
          expanded — the active card shows only its border and the collapse
          icon while the details section below is populated, not these. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 px-4 py-4",
          "bg-card opacity-0 transition-opacity duration-200",
          !isExpanded && [
            "group-hover:pointer-events-auto group-hover:opacity-100",
            "group-focus-within:pointer-events-auto group-focus-within:opacity-100",
          ]
        )}
      >
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          rightIcon={<Icon name="copy" className="h-3.5 w-3.5" />}
          onClick={(e) => {
            e.stopPropagation();
            void onCopy(account);
          }}
        >
          Copy
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1"
          rightIcon={<Icon name="share" className="h-3.5 w-3.5" />}
          onClick={(e) => {
            e.stopPropagation();
            onShare(account);
          }}
        >
          Share
        </Button>
      </div>
    </Card>
  );
}
