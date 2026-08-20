"use client";

import { Button, Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import useNewPermissions from "@/hooks/useNewPermissions";
import { useMcaClientAnalytics } from "@/features/dashboard/mca-home/hooks";

function formatAmount(amount: number): string {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(2)}L`;
  return `₹${(amount / 1_000).toFixed(1)}K`;
}

interface McaClientAnalyticsCardProps {
  /** Where "View all" goes. Owned by the page, not this card, matching how the
   *  dashboard's other navigating actions are wired. */
  onViewAll?: () => void;
}

export function McaClientAnalyticsCard({ onViewAll }: McaClientAnalyticsCardProps) {
  const { rows, days, isLoading } = useMcaClientAnalytics();
  const checkPermissions = useNewPermissions();
  // "View all" lands on Client management, which the sidebar gates on this same
  // action. Without the check a user who cannot open that page would still be
  // offered the link, so the button is hidden rather than left to fail on arrival.
  const canViewClients = checkPermissions(["getAllMcaClient"]);

  // Guarded rather than Math.max(...[]) directly: the spread of an empty list is
  // -Infinity, which would make every bar width NaN.
  const maxAmount = rows.length > 0 ? Math.max(...rows.map((c) => c.amount)) : 0;

  return (
    <Card className="gap-4 p-5">
      {/* items-start and flex-wrap, as on the other cards with a subtitle: the
          title block is now two lines, and the action should sit against the
          first of them rather than centre on both. */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Client analytics</h2>
          {/* Names the window the query actually used, so the figures below can't
              be read as all-time. */}
          <p className="mt-0.5 text-xs text-muted-foreground">
            Top clients by amount, last {days} days
          </p>
        </div>
        {onViewAll && canViewClients && (
          <Button
            type="button"
            variant="link"
            onClick={onViewAll}
            rightIcon={<Icon name="arrow-up-right" className="h-3 w-3" />}
            className="h-auto w-fit min-h-0 justify-start p-0 text-xs font-semibold"
          >
            View all
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3.5">
        {isLoading
          ? // Same row footprint as a real row (label line + bar), so the card
            // doesn't resize when the data lands.
            Array.from({ length: 5 }, (_, i) => (
              <div key={`skeleton-${i}`} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Shimmer className="h-4 w-28" />
                  <Shimmer className="h-4 w-12" />
                </div>
                <Shimmer className="h-1.5 w-full rounded-full" />
              </div>
            ))
          : rows.map((client) => (
              <div key={client.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-foreground">{client.name}</span>
                  <span className="text-[13px] font-semibold tabular-nums text-foreground">
                    {formatAmount(client.amount)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${maxAmount > 0 ? (client.amount / maxAmount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
      </div>
    </Card>
  );
}
