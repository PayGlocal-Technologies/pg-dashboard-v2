"use client";

import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, Shimmer, formatDateStamp } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { MidGuard } from "@/components/common/MidGuard";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { formatCurrency } from "@/lib/utils/format";
import { PaymentButtonTransactionsTable } from "@/features/dashboard/payment-button/components/PaymentButtonTransactionsTable";
import { DisablePaymentButtonDialog } from "@/features/dashboard/payment-button/components/DisablePaymentButtonDialog";
import { formatButtonAmount } from "@/features/dashboard/payment-button/helpers";
import { PaymentButtonStatusBadge } from "@/features/dashboard/payment-button/columns";
import {
  useCopyPaymentButtonCode,
  useDisablePaymentButton,
  usePaymentButtonListMids,
  usePaymentButtons,
} from "@/features/dashboard/payment-button/hooks";
import { buildPaymentButtonListBody } from "@/features/dashboard/payment-button/helpers";
import {
  CUSTOMER_DECIDES_LABEL,
  PAYMENT_BUTTONS_FEATURE,
} from "@/features/dashboard/payment-button/constants";
import type { PaymentButton } from "@/features/dashboard/payment-button/types";

/** One icon + text pair in the header's meta line. */
function MetaItem({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      <Icon name={icon} className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

/** One figure in the stats strip under the header. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function BackToList() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      leftIcon={<Icon name="chevron-left" className="h-3.5 w-3.5" />}
      onClick={() => router.push("/payment-button")}
    >
      Back to Payment Button
    </Button>
  );
}

/**
 * One payment button, at /payment-button/[buttonId]: a header card (identity,
 * status, label, amount and creation date, with Deactivate / Edit / Copy code)
 * over its totals, then the transactions it has taken.
 *
 * Linked transactions are PA transactions, scoped to this button's MID and
 * searched by its id the way pg-dashboard lists them (CardsTable with
 * `selectedCurrentMid` + `searchQuery`), drawn on the MCA Transactions table's
 * layout (see PaymentButtonTransactionsTable).
 *
 * The button is read through the list endpoint: pg-dashboard has no
 * single-button endpoint that returns its status and dates (GET
 * paymentButtonApi returns only its config), so this asks `/search/wqr` for
 * the button id, under the `?mid=` the list linked with (or, for a pasted
 * link without one, the merchant's PA MIDs), and takes the exact match.
 * Label, amount, payments and revenue are not in that response and read "—".
 */
export function PaymentButtonDetailFeature({ buttonId }: { buttonId: string }) {
  const searchParams = useSearchParams();
  const midParam = searchParams.get("mid");
  const listMids = usePaymentButtonListMids();
  const mids = midParam ? [midParam] : listMids;

  const { rows, isLoading, isError, refetch } = usePaymentButtons(
    buildPaymentButtonListBody({ mids, statuses: [], search: buttonId, pageLimit: 15, from: 0 })
  );
  const button = rows.find((row) => row.buttonId === buttonId) ?? null;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 page-enter">
      <BackToList />
      <MidGuard productType="PA" feature={PAYMENT_BUTTONS_FEATURE}>
        {isLoading ? (
          <Card className="gap-4 p-6">
            <Shimmer className="h-7 w-64" />
            <Shimmer className="h-4 w-48" />
            <Shimmer className="h-16 w-full" />
          </Card>
        ) : isError ? (
          <Card className="gap-0 p-0">
            <PlaceholderState
              variant="error"
              title="Couldn't load this payment button"
              description="Something went wrong while fetching it."
              action={
                <Button variant="outline" size="sm" onClick={refetch}>
                  Retry
                </Button>
              }
              className="py-16"
            />
          </Card>
        ) : button ? (
          <PaymentButtonDetail button={button} />
        ) : (
          <Card className="gap-0 p-0">
            <PlaceholderState
              variant="404"
              title="Payment button not found"
              description="It may have been removed, or the link is incomplete."
              className="py-16"
            />
          </Card>
        )}
      </MidGuard>
    </div>
  );
}

function PaymentButtonDetail({ button }: { button: PaymentButton }) {
  const { copyCode, copyingId } = useCopyPaymentButtonCode();
  const [pendingDisable, setPendingDisable] = useState<PaymentButton | null>(null);
  const { disable, isDisabling } = useDisablePaymentButton();

  const isDisabled = button.status === "DISABLED";
  const amount =
    button.amountType === "CUSTOMER_DECIDES"
      ? CUSTOMER_DECIDES_LABEL
      : formatButtonAmount(button.amount, button.currency);
  const revenue =
    button.revenue == null || !button.currency
      ? "—"
      : formatCurrency(parseFloat(button.revenue), button.currency);

  return (
    <>
      <Card className="gap-0 overflow-hidden p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6">
          <div className="flex min-w-0 items-start gap-5">
            <span className="flex h-28 w-28 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name="mouse-pointer-click" className="h-8 w-8" />
            </span>
            <div className="min-w-0 pt-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-mono text-[20px] font-semibold tracking-tight text-foreground">
                  {button.buttonId}
                </h1>
                <PaymentButtonStatusBadge status={button.status} />
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Button label: {button.label ? <>&ldquo;{button.label}&rdquo;</> : "—"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                <MetaItem icon="wallet">{amount}</MetaItem>
                <MetaItem icon="calendar-days">
                  Created on {formatDateStamp(button.createdAt)}
                </MetaItem>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDisabled}
              leftIcon={<Icon name="ban" className="h-3.5 w-3.5" />}
              onClick={() => setPendingDisable(button)}
              className="border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
            >
              Deactivate
            </Button>
            {/* TODO: Edit lands with its design. */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDisabled}
              leftIcon={<Icon name="pencil" className="h-3.5 w-3.5" />}
            >
              Edit
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDisabled}
              isLoading={copyingId === button.buttonId}
              leftIcon={<Icon name="copy" className="h-3.5 w-3.5" />}
              onClick={() => copyCode(button)}
            >
              Copy code
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 divide-y divide-border border-t border-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <Stat
            label="Total payments"
            value={button.successfulPayments == null ? "—" : String(button.successfulPayments)}
          />
          <Stat label="Total revenue" value={revenue} />
        </div>
      </Card>

      <PaymentButtonTransactionsTable mid={button.mid} buttonId={button.buttonId} />

      <DisablePaymentButtonDialog
        row={pendingDisable}
        isDisabling={isDisabling}
        onOpenChange={(open) => !open && setPendingDisable(null)}
        onConfirm={disable}
      />
    </>
  );
}
