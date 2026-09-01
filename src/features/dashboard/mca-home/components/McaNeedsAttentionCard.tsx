import { COUNTRIES } from "@payglocal_ui/flux-ui";
import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { needsAttention } from "@/features/dashboard/mca-home/mock-data";

function countryFlag(countryCode: string): string {
  if (countryCode === "EU") return "🇪🇺";
  return COUNTRIES.find((c) => c.code === countryCode)?.flag ?? "🌍";
}

/** "EUR 850" / "USD 1,200", ISO currency code prefix, no symbol, no decimals. */
function formatCurrencyCode(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString("en-US")}`;
}

interface McaNeedsAttentionCardProps {
  onViewAll?: () => void;
  onAction?: (id: string) => void;
}

export function McaNeedsAttentionCard({ onViewAll, onAction }: McaNeedsAttentionCardProps) {
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

      <div className="flex flex-col gap-3">
        {needsAttention.map((row) => (
          <Card
            key={row.id}
            className="flex-row items-center justify-between gap-3 p-3.5 shadow-none"
          >
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                <span aria-hidden>{countryFlag(row.countryCode)}</span>
                {row.clientName}
              </p>
              <p
                className={cn(
                  "mt-1 text-base font-bold tabular-nums",
                  row.statusTone === "danger"
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {formatCurrencyCode(row.amount, row.currency)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {row.invoiceId} · {row.statusLabel}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onAction?.(row.id)}
              rightIcon={<Icon name="arrow-up-right" className="h-3 w-3" />}
              className="shrink-0"
            >
              {row.actionLabel}
            </Button>
          </Card>
        ))}
      </div>
    </Card>
  );
}
