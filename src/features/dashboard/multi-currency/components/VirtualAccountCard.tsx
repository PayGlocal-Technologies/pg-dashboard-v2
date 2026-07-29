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
    <Card className={cn(CARD_SIZE_CLASS, "shrink-0 px-4 py-4 transition-shadow hover:shadow-md")}>
      <CardContent className="flex h-full flex-col gap-3">
        {/* Action pair in the top-right corner, as per the wireframe */}
        <TooltipProvider delayDuration={200}>
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <IconButton
                  aria-label={copied ? "Copied to clipboard" : `Copy ${account.accountName} details`}
                  variant="ghost"
                  size="sm"
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
                  size="sm"
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

        <div className="space-y-0.5">
          <p className="text-sm font-medium text-foreground">{account.accountName}</p>
          <p className="text-xs text-muted-foreground">{account.countryName}</p>
        </div>

        {/* Region-specific identifiers — count varies by country (2-3 rows).
            The card is sized to fit the tallest case (3 rows), so this never
            needs to scroll or clip. */}
        <dl className="space-y-1.5">
          {account.details.map((detail) => (
            <div key={detail.label} className="space-y-0.5">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                {detail.label}
              </dt>
              <dd className="break-all font-mono text-[13px] text-foreground">{detail.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
