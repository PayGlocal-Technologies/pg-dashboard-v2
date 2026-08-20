"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Card, Drawer, DrawerContent, Separator, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn, formatCurrency } from "@/lib/utils";
import { ProductFeedback } from "@/components/common/ProductFeedback";
import { ReferAndEarnBanner } from "@/components/common/ReferAndEarnBanner";
import { customerName, getStatusBucket, getStatusMeta } from "@/features/dashboard/transactions/paColumns";
import { deriveTransactionDetail } from "@/features/dashboard/transactions/deriveTransactionDetail";
import { DetailRow, SectionLabel } from "@/features/dashboard/transactions/components/TransactionDetailPrimitives";
import { AmountBreakdownBody } from "@/features/dashboard/transactions/components/AmountBreakdownBody";
import { LinkedTransactionsSection } from "@/features/dashboard/transactions/components/LinkedTransactionsSection";
import { SettlementDetailsBody } from "@/features/dashboard/transactions/components/SettlementDetailsBody";
import { TransactionPaymentMethod } from "@/features/dashboard/transactions/components/TransactionPaymentMethod";
import { truncateId } from "@/features/dashboard/transactions/components/TransactionId";
import { useIssuedRefunds } from "@/stores/useIssuedRefunds";
import { useTransactionDetail } from "@/stores/useTransactionDetail";
import type { PaTransaction } from "@/features/dashboard/transactions/types";

const EMPTY_REFUNDS: PaTransaction[] = [];

/** "07/08/2026, 08:47:05" -> ["07/08/2026", "08:47:05"]. */
function splitDateTime(value?: string): [string, string | undefined] {
  if (!value) return ["Not available", undefined];
  const [datePart, timePart] = value.split(",").map((s) => s.trim());
  return [datePart ?? value, timePart];
}

interface TransactionDetailsDrawerProps {
  transaction: PaTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailsDrawer({ transaction, open, onOpenChange }: TransactionDetailsDrawerProps) {
  const router = useRouter();
  const setStoredTransaction = useTransactionDetail((s) => s.setTransaction);
  const issuedRefunds = useIssuedRefunds((s) => s.refundsByParentGid[transaction?.gid ?? ""] ?? EMPTY_REFUNDS);

  if (!transaction) return null;

  const detail = deriveTransactionDetail(transaction);
  const statusMeta = getStatusMeta(transaction.externalStatus);
  const amount = parseFloat(transaction.totalAmount ?? "0");
  const currency = transaction.txnCurrency ?? "INR";
  const name = customerName(transaction) || "Unknown customer";
  const showFeedback = getStatusBucket(transaction.externalStatus) === "success";
  const [datePart, timePart] = splitDateTime(transaction.formattedCreationDateTime);

  const linkedTransactions = [...detail.linkedTransactions, ...issuedRefunds];

  async function handleCopyId() {
    try {
      await navigator.clipboard.writeText(transaction!.gid ?? "");
      toast.success("Transaction ID copied");
    } catch {
      // Clipboard access denied, non-critical affordance, fail silently.
    }
  }

  function goToDetail(row: PaTransaction) {
    setStoredTransaction(row);
    onOpenChange(false);
    router.push(`/transactions/${encodeURIComponent(row.gid ?? "")}`);
  }

  function goToSettlement(settlementId: string) {
    onOpenChange(false);
    router.push(`/reports/settlement-report/${encodeURIComponent(settlementId)}`);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex w-full flex-col gap-0 p-0 sm:w-[460px] [&>button]:hidden">
        {/* Custom top bar, Close + Expand on the left (matches the reference
         * layout rather than the library's default top-right close button,
         * which is hidden via [&>button]), truncated Transaction ID chip on
         * the right so it's visible without scrolling the body. */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="h-8 w-8 min-h-0 min-w-0 rounded-md p-0 text-foreground"
            >
              <Icon name="x" size={16} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => goToDetail(transaction)}
              aria-label="Expand"
              className="h-8 w-8 min-h-0 min-w-0 rounded-md p-0 text-muted-foreground"
            >
              <Icon name="maximize-2" size={14} />
            </Button>
          </div>

          <div className="flex flex-col items-end gap-1">
            <p className="text-[11px] text-muted-foreground">Transaction ID</p>
            <div className="flex min-w-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5">
              <span title={transaction.gid} className="truncate font-mono text-xs font-semibold text-foreground/85">
                {truncateId(transaction.gid ?? "Not available")}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCopyId}
                aria-label="Copy transaction ID"
                className="h-5 w-5 min-h-0 min-w-0 shrink-0 rounded-md p-0 text-muted-foreground"
              >
                <Icon name="copy" size={11} />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            {/* Amount, currency, status, date/time and payment method, then
             * charged-to, all grouped into one hero card. */}
            <Card className="gap-0 p-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <p className="flex items-baseline gap-1.5 text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {formatCurrency(amount, currency)}
                  <span className="text-sm font-medium text-muted-foreground">{currency}</span>
                </p>
                <StatusBadge
                  variant={statusMeta.variant}
                  label={statusMeta.label}
                  trailIcon={statusMeta.trailIcon}
                  size="sm"
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>{datePart}</span>
                {timePart && (
                  <>
                    <Separator orientation="vertical" className="h-3" />
                    <span>{timePart}</span>
                  </>
                )}
                <Separator orientation="vertical" className="h-3" />
                <TransactionPaymentMethod row={transaction} />
              </div>

              <Separator className="my-3" />

              <p className="text-sm text-muted-foreground">
                Charged to <span className="font-semibold text-foreground">{name}</span>
              </p>
            </Card>

            {/* Settlement details */}
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Settlement Details</SectionLabel>
              <Card className="gap-0 p-3.5">
                <SettlementDetailsBody settlement={detail.settlement} onViewSettlement={goToSettlement} />
              </Card>
            </div>

            {/* Amount breakdown */}
            {detail.amountBreakdown && (
              <div className="flex flex-col gap-1.5">
                <SectionLabel>Amount Breakdown</SectionLabel>
                <Card className="gap-0 p-3.5">
                  <AmountBreakdownBody
                    amountReceived={detail.amountBreakdown.amountReceived}
                    fee={detail.amountBreakdown.fee}
                    netAmount={detail.amountBreakdown.netAmount}
                    currency={currency}
                  />
                </Card>
              </div>
            )}

            {/* Customer details */}
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Customer Details</SectionLabel>
              <Card className="gap-0 p-3.5">
                <div className="flex flex-col gap-4">
                  <DetailRow label="Customer Name" value={name} />
                  <DetailRow label="Email ID" value={transaction.encEmailId ?? "Not available"} />
                  <DetailRow label="Phone Number" value={detail.customerPhone} />
                  <div>
                    <p className="text-xs text-muted-foreground">Address</p>
                    <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground/85">
                      {detail.customerAddress}
                    </p>
                  </div>
                  {detail.comments && (
                    <div>
                      <p className="text-xs text-muted-foreground">Comments</p>
                      <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground/85">
                        {detail.comments}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <ReferAndEarnBanner />

            {/* Payment details */}
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Payment Details</SectionLabel>
              <Card className="gap-0 p-3.5">
                <div className="flex flex-col gap-4">
                  <DetailRow label="Merchant Transaction ID" value={detail.merchantTxnId} />
                  <DetailRow label="Payment Category" value={detail.paymentCategory} />
                  {detail.cardType && <DetailRow label="Card Type" value={detail.cardType} />}
                  <DetailRow label="Issuer" value={detail.issuerBank} />
                </div>
              </Card>
            </div>

            {showFeedback && <ProductFeedback key={transaction.gid} />}

            {/* Status notes */}
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Status Notes</SectionLabel>
              <Card
                className={cn(
                  "gap-4 p-3.5",
                  statusMeta.variant === "danger" && "border-red-200 dark:border-red-900/50"
                )}
              >
                <DetailRow label="Reason" value={detail.statusReason} />
                {detail.errorCode && <DetailRow label="Error Code" value={detail.errorCode} />}
              </Card>
            </div>

            {/* Linked transactions, other transactions from this customer,
             * plus any refunds issued against this one */}
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Linked Transactions</SectionLabel>
              <LinkedTransactionsSection transactions={linkedTransactions} onViewDetails={goToDetail} />
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
