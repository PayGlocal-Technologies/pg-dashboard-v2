"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Shimmer,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import { CompactAmount } from "@/components/common/CompactAmount";
import {
  useDocumentPending,
  useDocumentPendingByCurrency,
} from "@/features/dashboard/mca-transactions/hooks";

/** Human label for a currency bucket. Only REST_OF_WORLD needs remapping; every
 *  real code reads as itself. */
function currencyLabel(currency: string): string {
  return currency === "REST_OF_WORLD" ? "Rest of world" : currency;
}

/**
 * Compact companion to SettlementAnalyticsCard: same Card size/border/radius
 * (so the two match height and visual weight side by side), the icon badge, a
 * tight title/KPI stack with the pending-count chip beside the title, and an
 * expandable per-currency breakdown.
 *
 * The headline amount + count come from the document-pending endpoint for the
 * given `timeframe`. The "By currency" breakdown is a separate live snapshot of
 * everything currently DOCUMENT_PENDING (no timeframe), so it's labelled as such
 * to keep the two figures from being read as the same window.
 */
export function OutstandingAmountCard({
  className,
  /** today | week | month | ytd. Defaults to ytd for the aggregate placements
   *  (e.g. International Accounts) that have no time-range control of their own;
   *  the Transactions analytics section passes its selected range through. */
  timeframe = "ytd",
  /** When set (e.g. the International Accounts page, keyed to the selected
   *  region), the headline shows that one currency's pending slice from the
   *  by-currency snapshot instead of the timeframe total, and the per-currency
   *  breakdown toggle is hidden — the card is already scoped to one currency.
   *  "REST_OF_WORLD" for the Rest of the World region. */
  currency: scopedCurrency,
}: {
  className?: string;
  timeframe?: string;
  currency?: string;
}) {
  const { documentPending, isLoading: isTimeframeLoading } = useDocumentPending(timeframe);
  const { breakdown, isLoading: isBreakdownLoading } = useDocumentPendingByCurrency();

  const isCurrencyScoped = !!scopedCurrency;
  const scopedRow = isCurrencyScoped
    ? breakdown?.currencies.find((row) => row.currency === scopedCurrency)
    : undefined;

  // Amounts are reported in INR on both endpoints.
  const displayCurrency = documentPending?.reportingCurrency ?? "INR";
  const amount = isCurrencyScoped ? (scopedRow?.amount ?? 0) : (documentPending?.amount ?? 0);
  const pendingCount = isCurrencyScoped ? (scopedRow?.count ?? 0) : (documentPending?.count ?? 0);
  const isLoading = isCurrencyScoped ? isBreakdownLoading : isTimeframeLoading;

  const currencyRows = [...(breakdown?.currencies ?? [])]
    .filter((row) => row.amount > 0 || row.count > 0)
    .sort((a, b) => b.amount - a.amount);
  // The breakdown is redundant when the whole card is already scoped to one
  // currency (International Accounts), so it's only shown on the aggregate
  // (Transactions) placement.
  const showBreakdown = !isCurrencyScoped && currencyRows.length > 0;

  return (
    <Card size="sm" className={cn("w-full", className)}>
      {/* flex flex-1 flex-col: still needed so Card being stretched taller than
          its content (see the grow className this receives from
          TransactionsAnalyticsCarousel) leaves the extra space below rather than
          centering it. */}
      <CardContent className="flex flex-1 flex-col">
        {/* Top row: just the icon. The pending-count chip sits beside the title. */}
        <div className="flex items-center gap-2">
          {/* h-12 w-12/rounded-full/amber-500 at 10% opacity: the same subtle
              tinted-circle treatment as Saved Amount's green version, amber for
              "pending". */}
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <Icon name="clock" size={22} />
          </span>
        </div>

        {/* KPI stack: title (with the pending-count chip beside it) then
            amount. Title light/regular, not bold — matches SavedAmountCard's
            own label style, which every KPI card header on this page was
            brought in line with. */}
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-normal text-muted-foreground">Documents pending</p>
            {!isLoading && pendingCount > 0 && (
              <Badge variant="secondary" size="sm" className="shrink-0">
                {pendingCount.toLocaleString("en-IN")} pending transaction
                {pendingCount === 1 ? "" : "s"}
              </Badge>
            )}
          </div>
          {isLoading ? (
            <Shimmer className="mt-1 h-9 w-32" />
          ) : (
            <CompactAmount
              amount={amount}
              currency={displayCurrency}
              className="mt-1 block text-3xl font-semibold tabular-nums tracking-tight text-foreground"
            />
          )}
        </div>

        {/* Per-currency breakdown of what's currently pending — a snapshot, not
            scoped to the timeframe above, so it's named that way (and, unlike
            the headline KPI, it does not change when the section's time-range
            control changes — useDocumentPendingByCurrency takes no timeframe
            argument at all).

            A hover tooltip now, not an always-visible list and not a
            click-to-expand one either: both of those put the row list in
            normal document flow, so the card's own height depended on
            whether/how many currencies there were to show. TooltipContent
            renders through a Radix portal (see the Tooltip source) — outside
            this card's DOM subtree entirely — so nothing about revealing it
            can ever change this card's height, which is the actual point
            here, not just a smaller footprint. */}
        {showBreakdown && (
          // `mt-auto`, not `mt-4`: when this card is stretched taller than
          // its own content (matched to Total amount collected's row height
          // from lg up — see TransactionsAnalyticsCarousel), a fixed mt-4
          // left every bit of that extra height stranded BELOW this block,
          // as dead space under the link. mt-auto instead pushes this whole
          // block down to the card's own bottom edge, so the leftover space
          // collects above it (between the KPI and the divider) rather than
          // beneath it — grounded to the bottom, not floating with a gap
          // under it.
          <div className="mt-auto border-t border-border pt-3">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-h-0 w-auto p-0 text-xs font-medium text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
                  >
                    Currently pending by currency
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="start" className="w-64 max-w-none p-3">
                  <ul className="space-y-2">
                    {currencyRows.map((row) => (
                      <li
                        key={row.currency}
                        className="flex items-center justify-between gap-3 text-[13px]"
                      >
                        <span className="min-w-0 truncate font-medium text-popover-foreground">
                          {currencyLabel(row.currency)}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {formatCurrency(row.amount, displayCurrency, "en-IN")}
                          <span className="ml-1.5 text-[11px]">
                            · {row.count.toLocaleString("en-IN")}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
