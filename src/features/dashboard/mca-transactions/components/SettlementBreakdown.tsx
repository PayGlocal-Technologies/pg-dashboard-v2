"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatAmount } from "@/features/dashboard/mca-transactions/timeline/format";
import type { FxSettlementEvent } from "@/features/dashboard/mca-transactions/types";

/**
 * The money breakdown behind a settlement, from the timeline's FX_BOOKED or
 * SETTLED event. Every figure below comes off that event — nothing is
 * recomputed here beyond summing the two discount fields, since the server is
 * the authority on the fee and GST it actually charged.
 */

function discountLabel(referralDiscount: number, offerDiscount: number): string {
  if (referralDiscount > 0 && offerDiscount > 0) return "Referral & offer · MDR waived";
  if (referralDiscount > 0) return "Referral discount · MDR waived";
  return "Exclusive offer · MDR waived";
}

export function SettlementBreakdown({ data }: { data: FxSettlementEvent | undefined }) {
  if (!data) return null;

  const referralDiscount = Number(data.REFERRAL_DISCOUNT ?? 0);
  const offerDiscount = Number(data.OFFER_DISCOUNT ?? 0);
  const discount = referralDiscount + offerDiscount;
  const grossFee = Number(data.transactionFee ?? 0);
  const netFee = grossFee - discount;
  const gst = Number(data.gst ?? 0);
  const inrSymbol = data.CONVERTED_TXN_CURRENCY_SYMBOL ?? "₹";

  const payoutLine = `${data.TXN_SYMBOL}${formatAmount(data.payoutAmount, data.payoutCurrency)} ${data.payoutCurrency}`;
  const settlementLine = `${inrSymbol}${formatAmount(data.settlementAmount, "INR")} INR`;

  return (
    <Accordion
      type="single"
      collapsible
      className="mt-3 rounded-lg border border-border bg-muted/30"
    >
      <AccordionItem value="settlement-breakdown" className="border-none">
        <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
          <div className="min-w-0 text-left">
            <p className="text-[11px] text-muted-foreground">You will receive</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-semibold tabular-nums text-foreground">
                {settlementLine}
              </span>
              <span className="whitespace-nowrap text-[12px] text-muted-foreground">
                ({payoutLine})
              </span>
              {/* Dotted underline signals "more info" the same way a native
                  <abbr title> would; tabIndex plus Radix Tooltip's own touch
                  handling (not just :hover) are what make this reachable on
                  touch devices instead of only on hover. stopPropagation
                  keeps a tap/click here from also toggling the accordion
                  this whole row sits inside AccordionTrigger's own button. */}
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      tabIndex={0}
                      onClick={(e) => e.stopPropagation()}
                      className="cursor-help whitespace-nowrap text-[12px] text-muted-foreground underline decoration-dotted underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
                    >
                      (using live FX)
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Settled at FX: {data.conversionRate}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {discount > 0 && (
                <Badge variant="success" size="sm">
                  Saved {inrSymbol}
                  {formatAmount(discount, "INR")}
                </Badge>
              )}
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent className="px-3 pb-3">
          <div className="rounded-lg border border-border bg-card px-3 py-2.5">
            <div className="flex items-start justify-between gap-4 text-[12.5px]">
              <span className="text-muted-foreground">
                Converted amount{" "}
                <span className="text-[11px]">
                  ({data.TXN_SYMBOL}
                  {formatAmount(data.payoutAmount, data.payoutCurrency)} × {inrSymbol}
                  {data.conversionRate})
                </span>
              </span>
              <span className="whitespace-nowrap font-medium tabular-nums text-foreground">
                {inrSymbol}
                {formatAmount(data.convertedAmount, "INR")}
              </span>
            </div>

            <Separator className="my-2.5" />

            <div className="flex items-start justify-between gap-4 text-[12.5px]">
              <span className="text-muted-foreground">PayGlocal transaction fee (MDR)</span>
              <span className="whitespace-nowrap tabular-nums text-foreground">
                {inrSymbol}
                {formatAmount(grossFee, "INR")}
              </span>
            </div>

            {discount > 0 && (
              <div className="mt-2.5 flex items-start justify-between gap-4 text-[12.5px]">
                <Badge variant="success" size="sm">
                  {discountLabel(referralDiscount, offerDiscount)}
                </Badge>
                <span className="whitespace-nowrap tabular-nums text-green-600">
                  −{inrSymbol}
                  {formatAmount(discount, "INR")}
                </span>
              </div>
            )}

            {gst > 0 && (
              <div className="mt-2.5 flex items-start justify-between gap-4 text-[12.5px]">
                <span className="text-muted-foreground">
                  GST on transaction fee{" "}
                  <span className="text-[11px]">
                    (18% of {inrSymbol}
                    {formatAmount(netFee, "INR")})
                  </span>
                </span>
                <span className="whitespace-nowrap tabular-nums text-foreground">
                  {inrSymbol}
                  {formatAmount(gst, "INR")}
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between gap-4 rounded-lg bg-muted px-3 py-2.5">
            <span className="text-[12.5px] text-foreground">Total settlement amount</span>
            <span className="whitespace-nowrap text-[14px] font-semibold tabular-nums text-foreground">
              {settlementLine}
            </span>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** Download action for the FIRC/FIRA document, shown on the FIRC step. */
export function DownloadFircButton({
  onDownload,
  isLoading,
}: {
  onDownload: () => void;
  isLoading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={isLoading}
      className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
    >
      <Icon
        name={isLoading ? "loader" : "download"}
        className={isLoading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
      />
      Download FIRC
    </button>
  );
}
