"use client";

import type { ReactNode } from "react";
import { feeTypeLabel, formatFee } from "@/features/dashboard/partner-deals/constants";
import type { DealPricing, FeeValue } from "@/features/dashboard/partner-deals/types";

/** One pricing row: what it applies to, its fee type, and the fee. The fee
 *  type is shown once per row in muted text so the fee itself leads. */
function PricingRow({ label, value }: { label: ReactNode; value: FeeValue }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_8rem_5rem]">
      <span className="min-w-0 text-[13px] text-foreground">{label}</span>
      <span className="hidden text-xs text-muted-foreground sm:block">
        {feeTypeLabel(value.feeType)}
      </span>
      <span className="text-right text-[13px] font-semibold tabular-nums text-foreground">
        {formatFee(value.fee, value.feeType) || "—"}
        {/* Below sm the fee type column is gone; say it under the fee. */}
        <span className="block text-[11px] font-normal text-muted-foreground sm:hidden">
          {feeTypeLabel(value.feeType)}
        </span>
      </span>
    </div>
  );
}

/** A titled group of rows under one hairline, with column labels when the
 *  group has more than one row. */
function PricingGroup({
  title,
  columnLabel,
  children,
}: {
  title: string;
  columnLabel?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      <div className="mt-2 border-t border-border">
        {columnLabel && (
          <div className="hidden grid-cols-[minmax(0,1fr)_8rem_5rem] gap-x-4 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid">
            <span>{columnLabel}</span>
            <span>Fee type</span>
            <span className="text-right">Fee</span>
          </div>
        )}
        <div className="divide-y divide-border/70">{children}</div>
      </div>
    </div>
  );
}

/**
 * PRICING: the deal's three pricing areas as one structured section, each a
 * titled group of rows rather than a card of its own. Values are the deal's
 * own (the same shapes Create Deal configures), never re-typed here.
 */
export function PartnerDealPricing({ pricing }: { pricing: DealPricing }) {
  const cards = pricing.domestic.customiseCards ? pricing.domestic.cards : [];

  return (
    <section aria-labelledby="deal-pricing-heading" className="space-y-6">
      <h2
        id="deal-pricing-heading"
        className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Pricing
      </h2>

      <PricingGroup title="Global Accounts">
        <PricingRow label="Fees per transaction" value={pricing.global} />
      </PricingGroup>

      <PricingGroup title="International Payment Processing" columnLabel="Brand">
        {pricing.international.map((row) => (
          <PricingRow key={row.brand} label={row.brand} value={row} />
        ))}
      </PricingGroup>

      <PricingGroup title="Platform Fee">
        <PricingRow label="Platform Fee" value={pricing.domestic.platform} />
      </PricingGroup>

      {/* Only when the deal prices card brands on their own. */}
      {cards.length > 0 && (
        <PricingGroup title="Domestic card fees" columnLabel="Brand">
          {cards.map((card) => (
            <PricingRow key={card.rowId} label={card.brand} value={card} />
          ))}
        </PricingGroup>
      )}
    </section>
  );
}
