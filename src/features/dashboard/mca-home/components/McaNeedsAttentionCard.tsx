import { Button, Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { useNeedsAttention } from "@/features/dashboard/mca-home/hooks";
import type { NeedsAttentionInvoice } from "@/features/dashboard/mca-home/types";

/** "EUR 850" / "USD 1,200", ISO currency code prefix, no symbol, no decimals. */
function formatCurrencyCode(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US")}`;
}

/** Human "day(s)" without the pluralisation logic repeated at every call site. */
function dayCount(n: number): string {
  return `${n} day${n === 1 ? "" : "s"}`;
}

/**
 * How the row reads, from `attentionStatus` + `daysRemaining`. Overdue rows
 * carry a negative `daysRemaining` (−6 = six days past due); due-soon rows a
 * small positive one. The action names what the merchant would do next — chase
 * an overdue invoice, or just look at one still in its window.
 */
function attentionMeta(invoice: NeedsAttentionInvoice): {
  tone: "danger" | "warning";
  label: string;
  actionLabel: string;
} {
  if (invoice.attentionStatus === "OVERDUE") {
    const days = Math.abs(invoice.daysRemaining);
    return {
      tone: "danger",
      label: days > 0 ? `Overdue by ${dayCount(days)}` : "Overdue",
      actionLabel: "Remind",
    };
  }
  return {
    tone: "warning",
    label: invoice.daysRemaining <= 0 ? "Due today" : `Due in ${dayCount(invoice.daysRemaining)}`,
    actionLabel: "View",
  };
}

interface McaNeedsAttentionCardProps {
  onViewAll?: () => void;
  onAction?: (id: string) => void;
}

export function McaNeedsAttentionCard({ onViewAll, onAction }: McaNeedsAttentionCardProps) {
  const { invoices, isLoading, isError } = useNeedsAttention();

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Needs attention</h2>
        <Button
          type="button"
          variant="link"
          onClick={onViewAll}
          // rightIcon={<Icon name="arrow-up-right" className="h-3 w-3" />}
          className="h-auto w-fit min-h-0 justify-start p-0 text-xs font-semibold"
        >
          View all
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="flex-row items-center justify-between gap-3 p-3.5 shadow-none">
              <div className="min-w-0 space-y-1.5">
                <Shimmer className="h-3.5 w-32" />
                <Shimmer className="h-4 w-20" />
                <Shimmer className="h-2.5 w-28" />
              </div>
              <Shimmer className="h-8 w-16 shrink-0" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <PlaceholderState
          variant="error"
          size="sm"
          title="Couldn't load"
          description="Invoices needing attention didn't load."
          className="py-4"
        />
      ) : invoices.length === 0 ? (
        <PlaceholderState
          variant="no-overdue-invoices"
          size="sm"
          title="You're all caught up"
          description="No invoices need your attention right now."
          className="py-4"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {invoices.map((invoice) => {
            const meta = attentionMeta(invoice);
            return (
              <Card
                key={invoice.id}
                className="flex-row items-center justify-between gap-3 p-3.5 shadow-none"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-foreground">
                    {invoice.clientName}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-base font-bold tabular-nums",
                      meta.tone === "danger"
                        ? "text-red-600 dark:text-red-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {formatCurrencyCode(invoice.totalAmount, invoice.currency)}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {invoice.invoiceNumber} · {meta.label}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAction?.(invoice.id)}
                  rightIcon={<Icon name="arrow-up-right" className="h-3 w-3" />}
                  className="shrink-0"
                >
                  {meta.actionLabel}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
}
