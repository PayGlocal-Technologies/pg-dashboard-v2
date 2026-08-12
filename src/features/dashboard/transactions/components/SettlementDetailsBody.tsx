import { Button, StatusBadge, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui";
import { Icon } from "@/components/icon";
import { DetailRow } from "@/features/dashboard/transactions/components/TransactionDetailPrimitives";
import type { TransactionDetailView } from "@/features/dashboard/transactions/deriveTransactionDetail";

interface SettlementDetailsBodyProps {
  settlement: TransactionDetailView["settlement"];
  onViewSettlement: (settlementId: string) => void;
}

/** Shared by TransactionDetailsDrawer and TransactionDetailFeature (both the
 * card body and the full-page's own settlement slot) so the "why isn't this
 * settled" explanation reads identically everywhere. */
export function SettlementNotApplicableNote() {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <p className="text-xs text-muted-foreground">Not applicable for this transaction.</p>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              aria-label="Why isn't settlement applicable?"
              className="h-4 w-4 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
            >
              <Icon name="info" size={11} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[220px] text-xs">
            This payment was declined, so no funds were captured, there&apos;s nothing to settle.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/** Shared by TransactionDetailsDrawer and TransactionDetailFeature so the
 * Settlement Details card always shows identical fields in both places. */
export function SettlementDetailsBody({ settlement, onViewSettlement }: SettlementDetailsBodyProps) {
  if (!settlement.applicable) {
    return <SettlementNotApplicableNote />;
  }

  return (
    <div className="flex flex-col gap-4">
      <DetailRow
        label="Settlement Status"
        value={
          <StatusBadge
            variant={settlement.isSettled ? "success" : "warning"}
            label={settlement.isSettled ? "Settled" : "Pending"}
            trailIcon={settlement.isSettled ? "check" : "clock"}
            size="sm"
          />
        }
      />
      {settlement.isSettled ? (
        <>
          <DetailRow label="Settled On" value={settlement.settledOnDate} />
          <DetailRow
            label="UTR Number"
            value={
              <div className="flex items-center gap-2">
                <span>{settlement.utrNumber}</span>
                <Button
                  type="button"
                  variant="link"
                  onClick={() => onViewSettlement(settlement.settlementId)}
                  className="h-auto min-h-0 p-0 text-xs font-medium"
                >
                  View settlement
                </Button>
              </div>
            }
          />
          <DetailRow label="Settled To" value={settlement.settledToAccount} />
        </>
      ) : (
        <DetailRow label="Expected On" value={settlement.expectedOnDate} />
      )}
    </div>
  );
}
