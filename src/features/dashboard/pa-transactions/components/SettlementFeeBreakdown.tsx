"use client";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import type { SettlementTxnDetail } from "@/features/dashboard/pa-transactions/useSettlementDetail";

/**
 * The settlement record carries no currency of its own. PA payments settle to
 * the merchant's INR account, so its figures are taken as INR, and kept apart
 * from the payment's own breakdown rather than netted against it.
 * TODO(integration): confirm with backend that mdrFeeAmount, taxAmount and
 * amtTobeSettled are always INR (pg-dashboard never displays them).
 */
const SETTLEMENT_CURRENCY = "INR";

function Explain({ label, children }: { label: string; children: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={`About ${label}`}
          className="h-4 w-4 min-h-0 min-w-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
        >
          <Icon name="info" size={12} />
        </Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 text-xs">{children}</TooltipContent>
    </Tooltip>
  );
}

function Row({
  label,
  explain,
  value,
  negative,
  emphasis,
}: {
  label: string;
  explain?: string;
  value: number;
  negative?: boolean;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={cn(
          "flex items-center gap-1.5 text-sm",
          emphasis ? "font-semibold text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
        {explain && <Explain label={label}>{explain}</Explain>}
      </span>
      <span
        className={cn(
          "tabular-nums text-sm",
          emphasis ? "font-semibold text-foreground" : "font-medium text-foreground/85"
        )}
      >
        {negative ? "-" : ""}
        {formatCurrency(value, SETTLEMENT_CURRENCY)}
      </span>
    </div>
  );
}

/**
 * What PayGlocal deducts from a payment and what reaches the merchant, from
 * the settlement record (see useSettlementDetail): the MDR fee, the GST on
 * it, and the amount to be settled, each explained. In the settlement
 * currency, kept apart from the payment's own breakdown rather than netted
 * against it, since the two can be in different currencies.
 */
export function SettlementFeeBreakdown({ settlement }: { settlement: SettlementTxnDetail }) {
  const mdr = settlement.mdrFeeAmount;
  const gst = settlement.taxAmount;
  const net = settlement.amtTobeSettled;

  return (
    <div className="flex flex-col gap-3">
      {mdr != null && (
        <Row
          label="MDR fee"
          explain="Merchant Discount Rate: PayGlocal's processing fee for this payment, a percentage of the amount plus any fixed fee per transaction."
          value={mdr}
          negative
        />
      )}
      {gst != null && (
        <Row
          label="GST"
          explain="Goods and Services Tax charged on the MDR fee."
          value={gst}
          negative
        />
      )}
      {net != null && (
        <div className="border-t border-border pt-3">
          <Row
            label={settlement.tentative ? "Net to be settled (estimated)" : "Net to be settled"}
            explain={
              settlement.tentative
                ? "What reaches your account after the MDR fee and GST. Estimated until the payment is settled."
                : "What reaches your account after the MDR fee and GST."
            }
            value={net}
            emphasis
          />
        </div>
      )}
      {(settlement.settlementExternalStatus || settlement.settledDate) && (
        <p className="text-xs text-muted-foreground">
          {[settlement.settlementExternalStatus, settlement.settledDate]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}
    </div>
  );
}
