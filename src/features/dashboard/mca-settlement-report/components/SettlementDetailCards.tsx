import { Card, Separator } from "@/components/ui";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { CopyableValue } from "@/components/common/CopyableValue";
import type { SettlementDetail } from "@/features/dashboard/mca-settlement-report/types";

/**
 * The Details / Amount Breakdown pair from the settlement detail view,
 * lifted out to their own file so mca-transactions can show the same two
 * cards on a SETTLED/FIRC_SETTLED transaction (see
 * SettlementBatchDetailsSection there) without duplicating this JSX — both
 * read the identical `SettlementDetail` shape `useSettlementDetail` already
 * returns, so there is nothing feature-specific left in either component
 * beyond the layout prop.
 */

interface BreakupRowProps {
  label: string;
  value: number;
  muted?: boolean;
  negative?: boolean;
  emphasis?: boolean;
  /** 1 explains the line above it, 2 explains that explanation. Two levels is
   *  the limit: the fee discounts sit at 2 and nothing goes deeper. */
  indent?: 1 | 2;
}

function BreakupRow({ label, value, muted, negative, emphasis, indent }: BreakupRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 py-2.5",
        indent === 1 && "pl-4",
        indent === 2 && "pl-8"
      )}
    >
      <span
        className={cn(
          "text-sm",
          emphasis
            ? "font-semibold text-foreground"
            : muted
              ? "text-muted-foreground"
              : "font-medium text-foreground"
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums text-sm",
          emphasis
            ? "font-semibold text-foreground"
            : muted
              ? "text-muted-foreground"
              : "font-medium text-foreground"
        )}
      >
        {negative ? "−" : ""}
        {formatCurrency(Math.abs(value), "INR")}
      </span>
    </div>
  );
}

/** Settlement Date, Merchant ID (when the settlement names one — a
 *  single-MID account has nothing to add there), Bank Account, Transaction
 *  count. `flex-1` on the Card is what lets it match SettlementAmountBreakdownCard's
 *  height when the two sit side by side (default grid item stretch). */
export function SettlementDetailsCard({ detail }: { detail: SettlementDetail }) {
  const { settlement, account } = detail;
  /** `settlementAccount` was agreed late and may not be deployed yet, so a
   *  missing block renders a dash rather than crashing on `account.bankName`. */
  const bankAccountLabel = account
    ? [account.bankName, account.maskedAccountNumber].filter(Boolean).join(" ")
    : "—";

  return (
    <section className="flex flex-col">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Details
      </h3>
      <Card className="flex-1 gap-4 p-5">
        {/* All fields share the same value typography, separated by the
         * same Separator used elsewhere, no quadrant grid / cross-dividers. */}
        <div className="flex flex-col gap-3">
          <CopyableValue
            layout="stack"
            className="gap-1.5 p-0"
            label="Settlement Date"
            value={formatDate(settlement.date, { month: "short", day: "2-digit", year: "numeric" })}
            copyValue={settlement.id}
            tooltip="An account settles at most once a day, so the date identifies this settlement."
          />

          <Separator />

          {settlement.merchantId && (
            <>
              <CopyableValue
                layout="stack"
                className="gap-1.5 p-0"
                label="Merchant ID"
                value={settlement.merchantId}
                tooltip="The account this settlement belongs to."
              />

              <Separator />
            </>
          )}

          <CopyableValue
            layout="stack"
            className="gap-1.5 p-0"
            label="Bank Account"
            value={bankAccountLabel}
            copyable={false}
            tooltip={
              account?.ifscCode
                ? `The account this settlement landed in. IFSC ${account.ifscCode}.`
                : "The account this settlement landed in."
            }
          />

          <Separator />

          <CopyableValue
            layout="stack"
            className="gap-1.5 p-0"
            label="Transactions"
            value={`${settlement.transactionCount} Transactions`}
            copyable={false}
          />
        </div>
      </Card>
    </section>
  );
}

/** Gross Settlements → Payment → Deductions (GST + platform fee, itself
 *  optionally explaining a fee discount) → Net Settlement. */
export function SettlementAmountBreakdownCard({ detail }: { detail: SettlementDetail }) {
  const { settlement, grossAmount, gst, platformFee, discountAmount, offerDiscountAmount } = detail;
  /**
   * PayGlocal's discounts on the platform fee. `platformFee` is already net of
   * them, so they are shown as a nested explanation of that line rather than as
   * deductions of their own: the Amount Breakdown column is something the
   * merchant reads downward and checks against their bank credit, and a row
   * that did not participate in the sum would make it look wrong.
   */
  const feeBeforeDiscount =
    Math.round((platformFee + discountAmount + offerDiscountAmount) * 100) / 100;
  const hasFeeDiscount = discountAmount > 0 || offerDiscountAmount > 0;

  return (
    <section className="flex min-w-0 flex-col">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Amount Breakdown
      </h3>
      <Card className="min-w-0 flex-1 gap-4 p-5">
        <div className="divide-y divide-border">
          <BreakupRow label="Gross Settlements" value={grossAmount} />
          <BreakupRow label="Payment" value={grossAmount} muted />
          <BreakupRow label="Deductions" value={gst + platformFee} negative />
          <BreakupRow label="Goods and services tax (GST)" value={gst} muted negative indent={1} />
          <BreakupRow
            label="Platform fee charged on payments"
            value={platformFee}
            muted
            negative
            indent={1}
          />
          {/* Only when something was actually discounted — on most
                settlements this block is noise. */}
          {hasFeeDiscount && (
            <>
              <BreakupRow label="Fee before discount" value={feeBeforeDiscount} muted indent={2} />
              {discountAmount > 0 && (
                <BreakupRow label="Discount" value={discountAmount} muted negative indent={2} />
              )}
              {offerDiscountAmount > 0 && (
                <BreakupRow
                  label="Offer discount"
                  value={offerDiscountAmount}
                  muted
                  negative
                  indent={2}
                />
              )}
            </>
          )}
          <BreakupRow label="Net Settlement" value={settlement.amount} emphasis />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Net settlement is the amount transferred to your registered bank account.
        </p>
      </Card>
    </section>
  );
}
