"use client";

import type { ReactNode } from "react";
import { Card, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  feeTypeLabel,
  formatFee,
  REFERRAL_TYPES,
} from "@/features/dashboard/partner-deals/constants";
import { countIssues, feeError } from "@/features/dashboard/partner-deals/validation";
import type { CreateDealValues, FeeValue } from "@/features/dashboard/partner-deals/types";

/**
 * Deal Summary: what the deal being configured will contain, read straight
 * from the form's current values. Not a second form; one line per area.
 * Same sticky right-docked Card the settlement report's info panel uses.
 */

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-medium text-foreground">{value}</span>
    </div>
  );
}

function NotSet() {
  return <span className="font-normal text-muted-foreground">Not set</span>;
}

/** "Percentage · 10%", or "Not set" until there's a fee. */
function feeSummary(value: FeeValue): ReactNode {
  const fee = formatFee(value.fee, value.feeType);
  return fee ? `${feeTypeLabel(value.feeType)} · ${fee}` : <NotSet />;
}

export function DealSummary({ values }: { values: CreateDealValues }) {
  const referral = REFERRAL_TYPES.find((t) => t.value === values.referralType)?.label;
  const pricedNetworks = values.international.filter(
    (row) => !feeError(row.fee, row.feeType)
  ).length;
  const cardFees = values.domestic.cards.filter(
    (row) => row.network && row.cardType && !feeError(row.fee, row.feeType)
  ).length;
  const issues = countIssues(values);

  return (
    <Card className="gap-5 p-5 lg:sticky lg:top-4">
      <p className="text-sm font-semibold text-foreground">Deal Summary</p>

      <div className="space-y-3">
        <Row label="Deal label" value={values.dealLabel.trim() || <NotSet />} />
        <Row label="Referral type" value={referral ?? <NotSet />} />
      </div>

      <Separator />

      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Pricing
        </p>
        <Row label="Global Accounts" value={feeSummary(values.global)} />
        <Row
          label="International payments"
          value={`${pricedNetworks} of ${values.international.length} card networks priced`}
        />
        <Row label="Domestic payments" value={feeSummary(values.domestic.platform)} />
        {values.domestic.customiseCards && (
          <Row
            label="Domestic card pricing"
            value={
              cardFees > 0 ? (
                `${cardFees} card ${cardFees === 1 ? "fee" : "fees"} configured`
              ) : (
                <span className="font-normal text-muted-foreground">No card fees yet</span>
              )
            }
          />
        )}
      </div>

      <Separator />

      {/* Derived from the same rules the fields validate with. */}
      <p
        className={cn(
          "flex items-center gap-1.5 text-[12.5px] font-medium",
          issues === 0 ? "text-success" : "text-muted-foreground"
        )}
      >
        <Icon name={issues === 0 ? "check-circle" : "alert-circle"} size={14} aria-hidden />
        {issues === 0
          ? "Ready to create"
          : `${issues} ${issues === 1 ? "field needs" : "fields need"} attention`}
      </p>
    </Card>
  );
}
