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

  // The primary identifier (first detail) is shown bare, the way the
  // wireframe shows the account number with no label above it. Any further
  // identifiers get a short inline label instead — e.g. "ACH Routing" → "ACH".
  const [primaryDetail, ...secondaryDetails] = account.details;

  return (
    <Card
      className={cn(
        CARD_SIZE_CLASS,
        "shrink-0 overflow-hidden px-4 py-4 transition-shadow hover:shadow-md"
      )}
    >
      <CardContent className="flex h-full min-w-0 flex-col gap-1.5 overflow-hidden">
        {/* Action pair in the top-right corner, as per the wireframe */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-end gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  aria-label={copied ? "Copied to clipboard" : `Copy ${account.accountName} details`}
                  variant="ghost"
                  size="xs"
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

        <CountryFlagAvatar iso2={account.iso2} countryName={account.countryName} />

        <div className="min-w-0">
          <p className="truncate text-base font-semibold leading-tight text-foreground">
            {account.accountName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{account.countryName}</p>
        </div>

        <div className="mt-auto min-w-0 space-y-0.5">
          <p className="truncate text-base font-bold leading-tight text-foreground">
            {primaryDetail.value}
          </p>
          {secondaryDetails.map((detail) => (
            <p key={detail.label} className="flex items-baseline gap-1.5 truncate">
              <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-foreground">
                {detail.label.split(" ")[0]}
              </span>
              <span className="truncate text-sm font-bold text-foreground">{detail.value}</span>
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
