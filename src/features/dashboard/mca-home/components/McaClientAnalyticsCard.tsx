import { Button, Card } from "@/components/ui";
import { Icon } from "@/components/icon";
import { clientAnalytics } from "@/features/dashboard/mca-home/mock-data";

function formatAmount(amount: number): string {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(2)}L`;
  return `₹${(amount / 1_000).toFixed(1)}K`;
}

interface McaClientAnalyticsCardProps {
  onViewAll?: () => void;
}

export function McaClientAnalyticsCard({ onViewAll }: McaClientAnalyticsCardProps) {
  const maxAmount = Math.max(...clientAnalytics.map((c) => c.amount));

  return (
    <Card className="gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Client analytics</h2>
        <Button
          type="button"
          variant="link"
          onClick={onViewAll}
          rightIcon={<Icon name="arrow-up-right" className="h-3 w-3" />}
          className="h-auto w-fit min-h-0 justify-start p-0 text-xs font-semibold"
        >
          View all
        </Button>
      </div>

      <div className="flex flex-col gap-3.5">
        {clientAnalytics.map((client) => (
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
                style={{ width: `${(client.amount / maxAmount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
