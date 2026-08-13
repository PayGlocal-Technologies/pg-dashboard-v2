import Link from "next/link";
import {
  Button,
  Card,
  Separator,
  StatusBadge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { formatCurrency } from "@/lib/utils";
import type { HeldFundsSummary } from "@/features/dashboard/settlement-reports/types";

const TRANSACTIONS_PATH = "/transactions";

interface FundsOnHoldCardProps {
  heldFunds: HeldFundsSummary;
  currency: string;
}

export function FundsOnHoldCard({ heldFunds, currency }: FundsOnHoldCardProps) {
  const totalHeldAmount = heldFunds.transactions.reduce((sum, t) => sum + t.amount, 0);
  const count = heldFunds.transactions.length;

  return (
    <Card className="gap-4 p-5">
      <h2 className="text-sm font-semibold text-foreground">Funds on Hold</h2>

      <div>
        <div className="flex items-center gap-2">
          <p className="text-lg font-semibold tracking-tight text-foreground tabular-nums">
            {formatCurrency(totalHeldAmount, currency)}
          </p>
          <StatusBadge variant="warning" label="Funds on Hold" size="sm" />
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="About funds on hold"
                  className="h-5 w-5 min-h-0 min-w-0 shrink-0 rounded-full p-0 text-muted-foreground/70 hover:text-muted-foreground"
                >
                  <Icon name="info" size={12} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-60 text-xs">
                Funds are held during risk or compliance review. Some flagged transactions need
                supporting documents, others are under manual review and need no action from you.
                Open a transaction below to see what it needs.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {count} transaction{count === 1 ? "" : "s"} affected
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{heldFunds.reasonSummary}</p>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Flagged transactions
        </p>
        <div className="divide-y divide-border rounded-xl border border-border">
          {heldFunds.transactions.map((t) => (
            <Link
              key={t.id}
              href={TRANSACTIONS_PATH}
              className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-[13px] text-primary/80">{t.id}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.paymentMethod} · {t.holdReason}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="whitespace-nowrap text-[11px] font-medium text-muted-foreground">
                  {t.actionShortLabel}
                </span>
                <span className="whitespace-nowrap tabular-nums text-sm font-semibold text-foreground">
                  {formatCurrency(t.amount, t.currency)}
                </span>
                <Icon name="chevron-right" size={14} className="text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Card>
  );
}
