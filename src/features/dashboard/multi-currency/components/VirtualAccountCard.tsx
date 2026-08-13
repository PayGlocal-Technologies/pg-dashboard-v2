"use client";

import { Button, Card, CardContent, RadioGroupItem } from "@/components/ui";
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
  /** Whether this is the one account currently selected (Account Details/Action Required below is showing it). */
  isSelected: boolean;
  /** Selects this account. A no-op if it's already the selected one. */
  onSelect: (account: VirtualAccount) => void;
}

export function VirtualAccountCard({
  account,
  onCopy,
  onShare,
  isSelected,
  onSelect,
}: VirtualAccountCardProps) {
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onSelect(account)}
      // A mouse click on the card — or on the RadioGroupItem button nested
      // inside it — would otherwise leave that element holding browser
      // focus after selection, which keeps group-focus-within (below) true
      // and the Copy/Share row visible with no hover involved at all.
      // preventDefault here (it fires on the bubble phase before the
      // browser applies the default focus) suppresses only that mouse-click
      // focus; Tab/Enter/Space keyboard interaction is untouched.
      onMouseDown={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(account);
        }
      }}
      className={cn(
        CARD_SIZE_CLASS,
        "group relative shrink-0 cursor-pointer overflow-hidden px-4 py-4 transition-[box-shadow,border-color] duration-150 hover:shadow-md",
        isSelected && "border-primary ring-2 ring-primary"
      )}
    >
      {/* Radio indicator, not a separate control — the card itself is the
          click target (onClick/role/tabIndex above), this just reflects and
          mirrors that selection state visually. Its own click also lands on
          the RadioGroup this card sits inside (see VirtualAccountList),
          selecting the same account either way. */}
      <RadioGroupItem
        value={account.id}
        aria-label={`Select ${account.accountName}`}
        className="absolute right-3 top-3 z-10"
      />

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
          identifiers above it. stopPropagation keeps these clicks from also
          selecting the card via the onClick above. group-focus-within
          mirrors the hover reveal for keyboard users tabbing onto the
          buttons. Available on every card regardless of selection — Copy and
          Share are independent of which account is selected. */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 px-4 py-4",
          "bg-card opacity-0 transition-opacity duration-200",
          "group-hover:pointer-events-auto group-hover:opacity-100",
          "group-focus-within:pointer-events-auto group-focus-within:opacity-100"
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
