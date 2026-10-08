"use client";

import { Button, Card, Shimmer } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { OnboardingCounts } from "@/features/dashboard/partner-home/mock-data";

/**
 * Onboarding pipeline: the merchants the partner referred, by stage, each
 * with its count and its share of those invited. The merchants waiting
 * on the partner are on the Needs your attention card.
 */
export function OnboardingPipelineCard({
  onboarding,
  isLoading,
  onViewAll,
}: {
  onboarding: OnboardingCounts;
  isLoading?: boolean;
  onViewAll: () => void;
}) {
  // Only the stage that needs the partner carries a colour.
  const stages = [
    { label: "Invited", count: onboarding.invited, attention: false },
    { label: "Signed up", count: onboarding.signedUp, attention: false },
    {
      label: "Documents pending",
      count: onboarding.documentsPending,
      attention: onboarding.documentsPending > 0,
    },
    { label: "Under review", count: onboarding.underReview, attention: false },
    { label: "Live", count: onboarding.live, attention: false },
  ];

  return (
    <Card className="flex h-full flex-col gap-0 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Onboarding pipeline</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Merchants you referred, by stage. Live merchants earn you commission.
          </p>
        </div>
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={onViewAll}
          className="h-auto min-h-0 shrink-0 p-0 text-xs font-semibold"
        >
          View all merchants
        </Button>
      </div>

      {/* One row per stage: its count, and the bar showing it as a share of
          those invited, so the drop-off reads at a glance. */}
      <ol className="mt-5 flex flex-1 flex-col justify-center gap-3.5">
        {stages.map((stage) => {
          const pct =
            onboarding.invited > 0 ? Math.round((stage.count / onboarding.invited) * 100) : 0;
          return (
            <li key={stage.label} className="flex items-center gap-4">
              <span className="w-36 shrink-0 truncate text-[13px] text-muted-foreground">
                {stage.label}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                {!isLoading && (
                  <div
                    className={cn(
                      "h-full rounded-full",
                      stage.attention ? "bg-amber-500" : "bg-primary/70"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <span className="flex w-24 shrink-0 items-baseline justify-end gap-1.5 tabular-nums">
                {isLoading ? (
                  <Shimmer className="h-4 w-12" />
                ) : (
                  <>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        stage.attention ? "text-amber-700 dark:text-amber-400" : "text-foreground"
                      )}
                    >
                      {stage.count}
                    </span>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
