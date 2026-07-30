"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  IconButton,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { CountryFlagAvatar } from "@/features/dashboard/multi-currency/components/CountryFlagAvatar";
import { CARD_SIZE_CLASS, TOOLTIP_CONTENT_CLASS } from "@/features/dashboard/multi-currency/constants";
import type { VirtualAccount } from "@/features/dashboard/multi-currency/types";

interface VirtualAccountCardProps {
  account: VirtualAccount;
  /** Performs the clipboard write and surfaces the toast; resolves when done. */
  onCopy: (account: VirtualAccount) => Promise<void> | void;
  onShare: (account: VirtualAccount) => void;
}

export function VirtualAccountCard({ account, onCopy, onShare }: VirtualAccountCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card
      className={cn(
        CARD_SIZE_CLASS,
        "shrink-0 overflow-hidden px-4 py-4 transition-shadow hover:shadow-md"
      )}
    >
      <CardContent className="flex h-full min-w-0 flex-col gap-1 overflow-hidden">
        {/* Action pair in the top-right corner, as per the wireframe */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-end gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  aria-label={copied ? "Copied to clipboard" : `Copy ${account.accountName} details`}
                  variant="ghost"
                  size="xs"
                  className="size-6 min-w-6"
                  onClick={handleCopy}
                >
                  <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent className={TOOLTIP_CONTENT_CLASS} sideOffset={4}>
                {copied ? "Copied!" : "Copy account details"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  aria-label={`Share ${account.accountName}`}
                  variant="ghost"
                  size="xs"
                  className="size-6 min-w-6"
                  onClick={() => onShare(account)}
                >
                  <Icon name="share" className="h-3.5 w-3.5" />
                </IconButton>
              </TooltipTrigger>
              <TooltipContent className={TOOLTIP_CONTENT_CLASS} sideOffset={4}>
                Share with client
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

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
          <p className="mt-1 truncate text-xs leading-none text-muted-foreground">
            {account.countryName}
          </p>
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
    </Card>
  );
}
