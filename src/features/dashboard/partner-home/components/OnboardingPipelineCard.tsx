"use client";

import { Badge, Button, Card, Separator, Shimmer, StatusBadge } from "@/components/ui";
import { PlaceholderState } from "@/components/common/PlaceholderState";
import { cn } from "@/lib/utils";
import type {
  ActionItem,
  ActionKind,
  OnboardingCounts,
} from "@/features/dashboard/partner-home/mock-data";

/** One CTA per kind of stall, so the button says what it will do. */
const ACTION_LABEL: Record<ActionKind, string> = {
  "send-reminder": "Send reminder",
  "complete-for-merchant": "Complete for merchant",
  "resend-invite": "Resend invite",
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/**
 * Onboarding pipeline: the merchants the partner referred, counted by stage,
 * then the ones only the partner can move along, oldest first. One card, two
 * parts, in the MCA dashboard's Needs attention row style.
 */
export function OnboardingPipelineCard({
  onboarding,
  actionItems,
  isLoading,
  onViewAll,
  onAction,
}: {
  onboarding: OnboardingCounts;
  actionItems: ActionItem[];
  isLoading?: boolean;
  onViewAll: () => void;
  onAction: (item: ActionItem) => void;
}) {
  // Plain counts, as the MCA dashboard's stat strips: only the stage that
  // needs the partner carries a colour.
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

  // Oldest stall first: the longest wait is the one most likely to be lost.
  const items = [...actionItems].sort((a, b) => b.waitingDays - a.waitingDays);

  return (
    <Card className="h-full gap-0 p-5">
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

      <ol className="mt-4 grid grid-cols-2 gap-y-3 sm:grid-cols-5">
        {stages.map((stage, i) => (
          <li
            key={stage.label}
            className={cn("min-w-0 pr-3", i > 0 && "sm:border-l sm:border-border sm:pl-4")}
          >
            <p className="truncate text-xs text-muted-foreground">{stage.label}</p>
            {isLoading ? (
              <Shimmer className="mt-1 h-6 w-10" />
            ) : (
              <p
                className={cn(
                  "mt-0.5 text-xl font-bold tabular-nums",
                  stage.attention ? "text-amber-700 dark:text-amber-400" : "text-foreground"
                )}
              >
                {stage.count}
              </p>
            )}
          </li>
        ))}
      </ol>

      <Separator className="my-4" />

      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          Needs your action
          {items.length > 0 && (
            <Badge variant="warning" size="sm">
              {items.length}
            </Badge>
          )}
        </h3>
      </div>

      {isLoading ? (
        <div className="mt-2 space-y-3">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <PlaceholderState
          variant="no-data"
          size="sm"
          title="Nothing needs you right now"
          description="No merchants need your attention right now."
          className="py-4"
        />
      ) : (
        <ul className="mt-1 flex flex-col">
          {items.map((item, i) => (
            <li
              key={item.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3",
                i > 0 && "border-t border-border"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-semibold text-muted-foreground"
                >
                  {initials(item.merchant)}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                    <span className="truncate">{item.merchant}</span>
                    <Badge variant="secondary" size="sm">
                      {item.product}
                    </Badge>
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {item.issue}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge
                  variant="warning"
                  label={`Waiting ${item.waitingDays} ${item.waitingDays === 1 ? "day" : "days"}`}
                  size="sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => onAction(item)}>
                  {ACTION_LABEL[item.action]}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
