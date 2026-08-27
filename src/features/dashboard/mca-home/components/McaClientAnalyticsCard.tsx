"use client";

import { useState } from "react";
import { Button, Card, Shimmer } from "@/components/ui";
import { Icon } from "@/components/icon";
import useNewPermissions from "@/hooks/useNewPermissions";
import { useTopClients } from "@/features/dashboard/mca-home/hooks";

function formatAmount(amount: number): string {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(2)}L`;
  return `₹${(amount / 1_000).toFixed(1)}K`;
}

/** Last 30 days, once on mount (no `new Date()` in render). This card has no
 *  date picker, so the window is fixed. */
function buildLast30Range(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  const iso = (d: Date): string => d.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

interface McaClientAnalyticsCardProps {
  /** Where "View all" goes. Owned by the page, not this card, matching how the
   *  dashboard's other navigating actions are wired. */
  onViewAll?: () => void;
}

export function McaClientAnalyticsCard({ onViewAll }: McaClientAnalyticsCardProps) {
  const [range] = useState(buildLast30Range);
  const { clients, isLoading, isError } = useTopClients(range.startDate, range.endDate, 5);
  const checkPermissions = useNewPermissions();
  // "View all" lands on Client management, which the sidebar gates on this same
  // action. Without the check a user who cannot open that page would still be
  // offered the link, so the button is hidden rather than left to fail on arrival.
  const canViewClients = checkPermissions(["getAllMcaClient"]);

  const hasData = !isLoading && !isError && clients.length > 0;

  return (
    <Card className="gap-4 p-5">
      {/* items-start and flex-wrap, as on the other cards with a subtitle: the
          title block is now two lines, and the action should sit against the
          first of them rather than centre on both. */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Client analytics</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Top clients by amount, last 30 days
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
        {isLoading ? (
          // Same row footprint as a real row (label line + bar), so the card
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
        ) : isError ? (
          <p className="py-4 text-sm text-muted-foreground">Couldn&apos;t load client analytics.</p>
        ) : !hasData ? (
          <p className="py-4 text-sm text-muted-foreground">No client activity in this period.</p>
        ) : (
          clients.map((client) => (
            <div key={client.client} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-foreground">{client.client}</span>
                <span className="text-[13px] font-semibold tabular-nums text-foreground">
                  {formatAmount(client.amount)}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, Math.max(0, client.barPct))}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
