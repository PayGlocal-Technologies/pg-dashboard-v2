"use client";

import { useState, type ReactNode } from "react";
import { Button, Separator } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import {
  feeTypeLabel,
  formatFee,
  REFERRAL_TYPES,
} from "@/features/dashboard/partner-deals/constants";
import {
  cardBrandError,
  feeError,
  listIssues,
  type DealIssue,
} from "@/features/dashboard/partner-deals/validation";
import type { CreateDealValues, FeeValue } from "@/features/dashboard/partner-deals/types";

/**
 * Deal Summary: a live read of the form's current values (no state of its
 * own), and what still needs attention before Create, from the same
 * validation the fields use (listIssues). Each value updates on its own as
 * it changes; nothing animates per keystroke.
 */

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="break-words text-[13px] font-medium text-foreground">{value}</span>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <span className="font-normal text-muted-foreground">{children}</span>;
}

/** "Percentage · 10%", or "Not configured" while the fee is missing or invalid. */
function feeSummary(value: FeeValue): ReactNode {
  return feeError(value.fee, value.feeType) ? (
    <Muted>Not configured</Muted>
  ) : (
    `${feeTypeLabel(value.feeType)} · ${formatFee(value.fee, value.feeType)}`
  );
}

/** Moves focus to a field and brings it into view. Shared with Create. */
export function focusField(fieldId: string) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.focus({ preventScroll: true });
}

/** Issues rolled up by section, in page order, each jumping to its first
 *  field: "International payment pricing (2)" rather than five fee rows. */
function groupIssues(issues: DealIssue[]) {
  const groups: { group: string; count: number; fieldId: string }[] = [];
  for (const issue of issues) {
    const existing = groups.find((g) => g.group === issue.group);
    if (existing) existing.count += 1;
    else groups.push({ group: issue.group, count: 1, fieldId: issue.fieldId });
  }
  return groups;
}

export function DealSummary({
  values,
  className,
  footer,
}: {
  values: CreateDealValues;
  className?: string;
  /** Anything after the validation line, e.g. the mobile Create button. */
  footer?: ReactNode;
}) {
  const referral = REFERRAL_TYPES.find((t) => t.value === values.referralType)?.label;
  const pricedNetworks = values.international.filter(
    (row) => !feeError(row.fee, row.feeType)
  ).length;
  const cardFees = values.domestic.cards.filter(
    (row, i, rows) =>
      // Same rules as the row's own fields: a brand not already priced above,
      // and a valid fee.
      !cardBrandError(
        row.brand,
        rows.slice(0, i).map((r) => r.brand)
      ) && !feeError(row.fee, row.feeType)
  ).length;
  const issues = listIssues(values);
  const groups = groupIssues(issues);
  const [showIssues, setShowIssues] = useState(false);
  const count = issues.length;

  return (
    <div className={cn("space-y-5", className)}>
      <p className="text-sm font-semibold text-foreground">Deal Summary</p>

      <div className="space-y-3">
        <Row label="Deal label" value={values.dealLabel.trim() || <Muted>Not set</Muted>} />
        <Row label="Referral type" value={referral ?? <Muted>Not set</Muted>} />
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
        <Row label="Platform Fee" value={feeSummary(values.domestic.platform)} />
        {values.domestic.customiseCards && (
          <Row
            label="Card fees"
            value={
              cardFees > 0 ? (
                `${cardFees} card ${cardFees === 1 ? "fee" : "fees"} configured`
              ) : (
                <Muted>No card fees yet</Muted>
              )
            }
          />
        )}
      </div>

      <Separator />

      {/* Icon and words both carry the state, never colour alone. While
          something is missing, the line opens a list of what, each item
          jumping to its first field. */}
      {count === 0 ? (
        <p
          role="status"
          className="flex items-center gap-1.5 text-[12.5px] font-medium text-success"
        >
          <Icon name="check-circle" size={14} aria-hidden />
          Ready to create
        </p>
      ) : (
        <div role="status">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={showIssues}
            aria-controls="deal-summary-issues"
            onClick={() => setShowIssues((o) => !o)}
            className="-ml-2 h-auto min-h-0 gap-1.5 px-2 py-1 text-[12.5px] font-medium text-foreground [&>span]:flex [&>span]:items-center [&>span]:gap-1.5"
          >
            <Icon
              name="alert-circle"
              size={14}
              className="text-amber-600 dark:text-amber-400"
              aria-hidden
            />
            {count} {count === 1 ? "field needs" : "fields need"} attention
            <Icon
              name="chevron-down"
              size={13}
              aria-hidden
              className={cn(
                "text-muted-foreground transition-transform duration-150",
                showIssues && "rotate-180"
              )}
            />
          </Button>
          {showIssues && (
            <ul
              id="deal-summary-issues"
              className="mt-1.5 space-y-0.5 animate-in fade-in duration-150"
            >
              {groups.map((g) => (
                <li key={g.group}>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => focusField(g.fieldId)}
                    className="h-auto min-h-0 justify-start p-0 text-[12.5px] font-normal"
                  >
                    {g.group}
                    {g.count > 1 && <span className="text-muted-foreground"> ({g.count})</span>}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {footer}
    </div>
  );
}
