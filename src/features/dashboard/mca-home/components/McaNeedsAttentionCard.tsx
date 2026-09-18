import { Button, Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { useNeedsAttention } from "@/features/dashboard/mca-home/hooks";
import {
  attentionMeta,
  formatCurrencyCode,
  TONE_TEXT_CLASS,
} from "@/features/dashboard/mca-home/needs-attention";

/**
 * Rows the card previews. Two is what this panel holds without pushing the
 * column past the chart beside it; the loading skeleton below renders the same
 * count, and "View all" opens the rest in a drawer.
 *
 * Sliced here rather than asked for as a `limit`: the header names the total,
 * and a response capped at two cannot be relied on to report how many there
 * are beyond the two. The whole list is one request the drawer shares.
 */
const NEEDS_ATTENTION_PREVIEW_LIMIT = 2;

interface McaNeedsAttentionCardProps {
  onViewAll?: () => void;
  /** Called with the invoice's id — the details route's own path segment. */
  onAction?: (id: string) => void;
}

export function McaNeedsAttentionCard({ onViewAll, onAction }: McaNeedsAttentionCardProps) {
  const { invoices, totalCount, isLoading, isError } = useNeedsAttention();

  // `totalCount` is the endpoint's own count for the whole list; with no limit
  // sent the rows are that list, so the fallback only matters if the field is
  // ever missing.
  const count = totalCount || invoices.length;
  const preview = invoices.slice(0, NEEDS_ATTENTION_PREVIEW_LIMIT);

  // Nothing to see behind it once the merchant is caught up, so the link goes
  // rather than opening an empty drawer. It names the total, since the card
  // itself only ever shows the first couple.
  const showViewAll = isLoading || isError || count > 0;

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Needs attention</h2>
        {showViewAll && (
          <Button
            type="button"
            variant="link"
            onClick={onViewAll}
            // rightIcon={<Icon name="arrow-up-right" className="h-3 w-3" />}
            className="h-auto w-fit min-h-0 justify-start p-0 text-xs font-semibold"
          >
            {count > preview.length ? `View all (${count})` : "View all"}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: NEEDS_ATTENTION_PREVIEW_LIMIT }).map((_, i) => (
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
      ) : preview.length === 0 ? (
        <PlaceholderState
          variant="no-overdue-invoices"
          size="sm"
          title="You're all caught up"
          description="No invoices need your attention right now."
          className="py-4"
        />
      ) : (
        <div className="flex flex-col gap-3">
          {preview.map((invoice) => {
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
                      TONE_TEXT_CLASS[meta.tone]
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
